<script setup lang="ts">
import { Activity, Clock3, LogOut, RefreshCw, TicketCheck, Users, Wifi } from '@lucide/vue'
import { Motion } from 'motion-v'
import { toast } from 'vue-sonner'
import type { QueueEntry } from '#shared/db'
import type { ApiResponse } from '~~/types/api'
import type { QueueState } from '~~/types/ticketing'
import { parseQueueRealtimeMessage } from '~~/types/queue-realtime'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { QueueStatus } from '#shared/commonEnums'
import { formatWaitingRoomDuration, getWaitingRoomRemainingSeconds } from '@/utils/waitingRoomTimer'

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
const queueStateReceivedAt = ref<number | null>(null)
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
  const totalSeconds = queueState.value?.estimatedWaitSeconds
  const receivedAt = queueStateReceivedAt.value
  if (totalSeconds === undefined || receivedAt === null) {
    return t('waiting_room.any_moment')
  }

  const remainingSeconds = getWaitingRoomRemainingSeconds(totalSeconds, receivedAt, currentTime.value)
  return formatWaitingRoomDuration(remainingSeconds)
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
  queueStateReceivedAt.value = state ? Date.now() : null
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
  queueClockIntervalId = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)

  try {
    await handleQueueState(await joinQueue())
    await refreshQueueStatus()
    open()
  }
  catch (error) {
    queueError.value = parseApiError(error, t('waiting_room.join_failed')).message
  }
  finally {
    isJoining.value = false
  }
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
  <main class="relative flex min-h-[calc(100dvh_-_var(--header-height,0px))] items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div
      class="pointer-events-none absolute inset-x-8 top-1/2 h-72 -translate-y-1/2 rounded-full bg-muted/45 blur-3xl"
      aria-hidden="true"
    />

    <Motion
      as="section"
      class="relative w-full max-w-xl"
      :initial="{ opacity: 0, y: 18, scale: 0.98 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }"
      :aria-label="$t('waiting_room.title')"
    >
      <Card class="overflow-hidden rounded-[2rem] border-border/70 bg-card shadow-2xl shadow-primary/5 py-0">
        <CardHeader class="flex flex-col gap-6 p-6 sm:p-8">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Badge
              :variant="realtimeStatus === 'connected' ? 'default' : 'secondary'"
              class="flex w-fit gap-2 rounded-full px-3 py-1"
            >
              <Wifi
                class="size-3.5"
                aria-hidden="true"
              />
              {{ realtimeStatusLabel }}
            </Badge>

            <Badge
              v-if="passWindowLabel"
              variant="secondary"
              class="flex w-fit gap-2 rounded-full px-3 py-1"
            >
              <TicketCheck
                class="size-3.5"
                aria-hidden="true"
              />
              {{ $t('waiting_room.admission_window') }} · {{ passWindowLabel }}
            </Badge>
          </div>

          <div class="flex flex-col gap-2 text-center sm:text-left">
            <p class="text-sm font-medium text-muted-foreground">
              {{ $t('waiting_room.eyebrow') }}
            </p>
            <CardTitle class="text-balance text-3xl font-semibold leading-none tracking-[-0.05em] sm:text-4xl">
              {{ $t('waiting_room.title') }}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent class="flex flex-col gap-6 px-6 pb-6 sm:px-8 sm:pb-8">
          <section
            class="flex flex-col items-center gap-4 text-center"
            :aria-label="$t('waiting_room.estimated_wait')"
          >
            <div class="flex size-12 items-center justify-center rounded-2xl bg-muted">
              <Clock3
                class="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div class="flex flex-col gap-2">
              <p class="text-sm font-medium text-muted-foreground">
                {{ $t('waiting_room.estimated_wait') }}
              </p>
              <p class="text-balance text-5xl font-semibold leading-none tracking-[-0.08em] tabular-nums sm:text-6xl">
                {{ estimatedWaitLabel }}
              </p>
            </div>
          </section>

          <div class="flex flex-col gap-3">
            <Progress
              :model-value="queueProgress"
              class="h-2.5"
              :aria-label="$t('waiting_room.queue_progress_label')"
              :aria-valuetext="queueProgressValueText"
            />
            <div class="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{{ $t('waiting_room.queue_progress_label') }}</span>
              <span class="tabular-nums">{{ queueProgress }}%</span>
            </div>
          </div>

          <Separator />

          <section
            class="grid gap-3 sm:grid-cols-2"
            aria-live="polite"
          >
            <div class="flex flex-col gap-2 rounded-2xl bg-muted/50 p-4">
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Users
                  class="size-4"
                  aria-hidden="true"
                />
                <span>{{ $t('waiting_room.position_label') }}</span>
              </div>
              <p class="text-2xl font-semibold tracking-[-0.04em] tabular-nums">
                {{ queueState?.position ?? '—' }}
              </p>
            </div>

            <div class="flex flex-col gap-2 rounded-2xl bg-muted/50 p-4">
              <p class="text-sm text-muted-foreground">
                {{ $t('waiting_room.waiting_label') }}
              </p>
              <p class="text-2xl font-semibold tracking-[-0.04em] tabular-nums">
                {{ queueState?.waitingCount ?? 0 }}
              </p>
            </div>
          </section>

          <section
            class="rounded-2xl bg-muted/45 p-4"
            aria-live="polite"
          >
            <div class="flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-background">
                <Activity
                  class="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p class="text-sm font-medium">
                    {{ queueStatusLabel }}
                  </p>
                </div>
                <p class="text-sm leading-6 text-muted-foreground">
                  {{ $t('waiting_room.keep_page_open') }}
                </p>
              </div>
            </div>
          </section>

          <Alert
            v-if="queueError"
            variant="destructive"
          >
            <AlertDescription>{{ queueError }}</AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter class="flex flex-col gap-3 border-t p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <Button
            class="w-full rounded-full active:scale-[0.98] sm:w-auto"
            :disabled="isJoining"
            @click="refreshQueueStatusSafely"
          >
            <RefreshCw
              data-icon="inline-start"
              :class="{ 'animate-spin': isJoining }"
              aria-hidden="true"
            />
            {{ $t('waiting_room.refresh_status') }}
          </Button>

          <Button
            variant="ghost"
            class="w-full rounded-full active:scale-[0.98] sm:w-auto"
            :disabled="isJoining || isLeaving"
            @click="leaveQueue"
          >
            <LogOut
              data-icon="inline-start"
              aria-hidden="true"
            />
            {{ isLeaving ? $t('waiting_room.leaving') : $t('waiting_room.leave') }}
          </Button>
        </CardFooter>
      </Card>
    </Motion>
  </main>
</template>
