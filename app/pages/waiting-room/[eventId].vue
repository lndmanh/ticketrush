<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { QueueEntry } from '#shared/db'
import type { ApiResponse } from '~~/types/api'
import type { QueueState } from '~~/types/ticketing'
import { parseQueueRealtimeMessage } from '~~/types/queue-realtime'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { QueueStatus } from '#shared/commonEnums'

const route = useRoute()
const { t } = useI18n()
const sessionPublicId = computed(() => route.params.eventId.toString())
const slug = computed(() => typeof route.query.slug === 'string' ? route.query.slug : '')
const requestUrl = useRequestURL()

const queueState = ref<QueueState | null>(null)
const isJoining = ref(true)
const isLeaving = ref(false)
const queueError = ref('')
const realtimeStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const currentTime = ref(Date.now())
let queueClockIntervalId: number | null = null
const hasRedirected = ref(false)
let refreshQueuePromise: Promise<void> | null = null
let refreshQueueQueued = false
const socketUrl = computed(() => {
  const url = new URL(apiRoutes.eventSessionQueueSocket(sessionPublicId.value), requestUrl.origin)
  url.protocol = requestUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
})

const { open, close } = useWebSocket(socketUrl, {
  autoReconnect: {
    retries: 5,
    delay: 1000,
    onFailed() {
      realtimeStatus.value = 'disconnected'
    },
  },
  immediate: false,
  async onConnected() {
    await refreshQueueStatusSafely()
    realtimeStatus.value = 'connected'
  },
  onDisconnected() {
    realtimeStatus.value = 'connecting'
    void refreshQueueStatusSafely()
  },
  onError() {
    realtimeStatus.value = 'connecting'
    void refreshQueueStatusSafely()
  },
  async onMessage(_ws, event) {
    try {
      if (typeof event.data === 'string') {
        await handleQueueRealtimeMessageSafely(event.data)
        return
      }

      if (event.data instanceof Blob) {
        await handleQueueRealtimeMessageSafely(await event.data.text())
        return
      }

      await refreshQueueStatusSafely()
    }
    catch (error) {
      queueError.value = parseApiError(error, t('waiting_room.lost_contact')).message
      await refreshQueueStatusSafely()
    }
  },
})

const estimatedWaitLabel = computed(() => {
  const totalSeconds = queueState.value?.estimatedWaitSeconds ?? 0
  if (totalSeconds <= 0) {
    return t('waiting_room.any_moment')
  }

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const passWindowLabel = computed(() => {
  const expiresAt = queueState.value?.entry?.expiresAt
  if (!expiresAt || queueState.value?.entry?.status !== QueueStatus.Admitted) {
    return null
  }

  const millisecondsRemaining = Math.max(new Date(expiresAt).getTime() - currentTime.value, 0)
  const totalSeconds = Math.floor(millisecondsRemaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const queueProgress = computed(() => {
  if (!queueState.value || queueState.value.waitingCount === 0) {
    return 0
  }

  if (queueState.value.entry?.status === QueueStatus.Admitted) {
    return 100
  }

  return Math.max(0, Math.min(100, Math.round(((queueState.value.waitingCount - queueState.value.position + 1) / queueState.value.waitingCount) * 100)))
})

const queueStatusLabel = computed(() => {
  if (isJoining.value) {
    return t('waiting_room.joining')
  }

  const status = queueState.value?.entry?.status
  if (status === QueueStatus.Waiting) {
    return t('waiting_room.queue_status_waiting')
  }

  if (status === QueueStatus.Admitted) {
    return t('waiting_room.queue_status_admitted')
  }

  if (status === QueueStatus.Expired) {
    return t('waiting_room.queue_status_expired')
  }

  if (status === QueueStatus.Completed) {
    return t('waiting_room.queue_status_completed')
  }

  return t('waiting_room.waiting_for_admission')
})

async function joinQueue() {
  const response = await apiRequest<ApiResponse<QueueState | null>>(apiRoutes.eventSessionQueueJoin(sessionPublicId.value), { method: 'POST', body: {} })
  if (!response.success) {
    throw response
  }

  return response.data
}

async function handleQueueState(state: QueueState | null, options: { allowRejoin: boolean } = { allowRejoin: true }) {
  queueState.value = state
  queueError.value = ''

  if (state?.entry?.status === QueueStatus.Expired && options.allowRejoin) {
    const rejoinedState = await joinQueue()
    await handleQueueState(rejoinedState, { allowRejoin: false })
    return
  }

  const redirectPath = state?.redirectPath
  if (!hasRedirected.value && state?.entry?.status === QueueStatus.Admitted && redirectPath) {
    hasRedirected.value = true
    await navigateTo(redirectPath)
  }
}

async function refreshQueueStatus() {
  if (!sessionPublicId.value) {
    return
  }

  try {
    const response = await apiRequest<ApiResponse<QueueState | null>>(apiRoutes.eventSessionQueueStatus(sessionPublicId.value))
    if (!response.success) {
      throw response
    }

    await handleQueueState(response.data)
  }
  catch (error) {
    queueError.value = parseApiError(error, t('waiting_room.lost_contact')).message
  }
}

async function refreshQueueStatusSafely() {
  if (refreshQueuePromise) {
    refreshQueueQueued = true
    return refreshQueuePromise
  }

  do {
    refreshQueueQueued = false
    refreshQueuePromise = refreshQueueStatus().finally(() => {
      refreshQueuePromise = null
    })

    await refreshQueuePromise
  } while (refreshQueueQueued)
}

async function handleQueueRealtimeMessageSafely(rawValue: string) {
  try {
    const message = parseQueueRealtimeMessage(rawValue)
    if (!message || message.sessionPublicId !== sessionPublicId.value) {
      await refreshQueueStatusSafely()
      return
    }

    if (message.type === 'queue-connected') {
      realtimeStatus.value = 'connected'
      return
    }

    if (message.type === 'queue-state') {
      await handleQueueState(message.state)
      return
    }

    await refreshQueueStatusSafely()
  }
  catch (error) {
    queueError.value = parseApiError(error, t('waiting_room.lost_contact')).message
    await refreshQueueStatusSafely()
  }
}

const realtimeStatusLabel = computed(() => {
  if (realtimeStatus.value === 'connected') {
    return t('waiting_room.realtime_live')
  }

  if (realtimeStatus.value === 'connecting') {
    return t('waiting_room.realtime_reconnecting')
  }

  return t('waiting_room.realtime_disconnected')
})

const queueProgressValueText = computed(() => t('waiting_room.queue_progress_value', { percent: queueProgress.value }))

async function leaveQueue() {
  if (!sessionPublicId.value) {
    return
  }

  isLeaving.value = true

  try {
    const response = await apiRequest<ApiResponse<QueueEntry | null>>(apiRoutes.eventSessionQueueLeave(sessionPublicId.value), { method: 'POST' })
    if (!response.success) {
      throw response
    }
    toast.success(t('waiting_room.left_queue'))

    if (slug.value) {
      await navigateTo(`/events/${slug.value}`)
      return
    }

    await navigateTo('/events')
  }
  catch (error) {
    toast.error(parseApiError(error, t('waiting_room.leave_failed')).message)
  }
  finally {
    isLeaving.value = false
  }
}

onMounted(async () => {
  try {
    queueState.value = await joinQueue()
    await refreshQueueStatus()
    open()
  }
  catch (error) {
    queueError.value = parseApiError(error, t('waiting_room.join_failed')).message
  }
  finally {
    isJoining.value = false
  }

  queueClockIntervalId = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (queueClockIntervalId !== null) {
    window.clearInterval(queueClockIntervalId)
  }
  close()
})

definePageMeta({
  title: 'Waiting room',
  breadcrumb: 'Queue',
  middleware: ['auth'],
})
</script>

<template>
  <main class="flex min-h-[76dvh] items-center justify-center py-10">
    <section class="surface-shell w-full max-w-3xl">
      <div class="surface-core space-y-8 px-6 py-8 text-center md:px-10 md:py-12">
        <span class="section-eyebrow mx-auto">
          {{ $t('waiting_room.eyebrow') }}
        </span>

        <div class="space-y-4">
          <h1 class="display-title mx-auto max-w-2xl text-balance md:text-5xl">
            {{ $t('waiting_room.title') }}
          </h1>
          <p class="mx-auto max-w-[34rem] text-base leading-8 text-muted-foreground">
            {{ $t('waiting_room.desc') }}
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <TicketSummaryMetric
            :label="$t('waiting_room.position_label')"
            :value="queueState?.position || '—'"
            :hint="$t('waiting_room.position_hint')"
          />
          <TicketSummaryMetric
            :label="$t('waiting_room.waiting_label')"
            :value="queueState?.waitingCount || 0"
            :hint="$t('waiting_room.waiting_hint')"
          />
          <TicketSummaryMetric
            :label="$t('waiting_room.admitted_label')"
            :value="queueState?.admittedCount || 0"
            :hint="$t('waiting_room.admitted_hint')"
          />
        </div>

        <div class="flex items-center justify-center gap-2">
          <span class="text-sm text-muted-foreground">
            {{ $t('waiting_room.realtime_status') }}
          </span>
          <Badge
            :variant="realtimeStatus === 'connected' ? 'default' : 'secondary'"
            class="rounded-full"
            aria-live="polite"
            :aria-label="realtimeStatusLabel"
          >
            {{ realtimeStatusLabel }}
          </Badge>
        </div>

        <div class="surface-shell">
          <div class="surface-core space-y-4 text-left">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm text-muted-foreground">
                  {{ $t('waiting_room.estimated_wait') }}
                </p>
                <p class="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  {{ estimatedWaitLabel }}
                </p>
              </div>

              <div
                v-if="passWindowLabel"
                class="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                {{ $t('waiting_room.admission_window') }} · {{ passWindowLabel }}
              </div>
            </div>

            <div>
              <Progress
                :model-value="queueProgress"
                class="h-2"
                :aria-label="$t('waiting_room.queue_progress_label')"
                :aria-valuetext="queueProgressValueText"
              />
            </div>
          </div>
        </div>

        <div class="rounded-[1.75rem] bg-accent px-5 py-5 text-left">
          <p class="text-sm text-muted-foreground">
            {{ $t('waiting_room.status_label') }}
          </p>
          <p class="mt-2 text-xl font-semibold tracking-[-0.04em]">
            {{ queueStatusLabel }}
          </p>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">
            {{ $t('waiting_room.keep_page_open') }}
          </p>
        </div>

        <div
          v-if="queueError"
          role="alert"
          class="rounded-[1.5rem] border border-rose-200/70 bg-rose-50 px-5 py-4 text-left text-sm text-rose-950 dark:border-rose-300/15 dark:bg-rose-500/10 dark:text-rose-100"
        >
          {{ queueError }}
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:justify-center">
          <Button
            variant="outline"
            class="rounded-full"
            :disabled="isJoining"
            @click="refreshQueueStatusSafely"
          >
            {{ $t('waiting_room.refresh_status') }}
          </Button>
          <Button
            variant="ghost"
            class="rounded-full"
            :is-loading="isLeaving"
            :disabled="isJoining"
            @click="leaveQueue"
          >
            {{ $t('waiting_room.leave') }}
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>
