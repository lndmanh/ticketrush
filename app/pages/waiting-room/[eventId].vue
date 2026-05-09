<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { QueueState } from '~~/types/ticketing'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'

const route = useRoute()
const { t } = useI18n()
const sessionPublicId = computed(() => route.params.eventId.toString())
const slug = computed(() => typeof route.query.slug === 'string' ? route.query.slug : '')

const queueState = ref<QueueState | null>(null)
const isJoining = ref(true)
const isLeaving = ref(false)
const queueError = ref('')
const currentTime = ref(Date.now())
let queueIntervalId: number | null = null
let queueClockIntervalId: number | null = null

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
  if (!expiresAt || queueState.value?.entry?.status !== 'admitted') {
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

  if (queueState.value.entry?.status === 'admitted') {
    return 100
  }

  return Math.max(0, Math.min(100, Math.round(((queueState.value.waitingCount - queueState.value.position + 1) / queueState.value.waitingCount) * 100)))
})

const queueStatusLabel = computed(() => {
  if (isJoining.value) {
    return t('waiting_room.joining')
  }

  return queueState.value?.entry?.status || t('waiting_room.waiting_for_admission')
})

async function refreshQueueStatus() {
  if (!sessionPublicId.value) {
    return
  }

  try {
    const response = await apiRequest(apiRoutes.eventSessionQueueStatus(sessionPublicId.value))
    if (!response.success) {
      throw response
    }

    queueState.value = response.data
    queueError.value = ''

    if (queueState.value?.entry?.status === 'admitted' && queueState.value.entry.passToken && slug.value) {
      await navigateTo(`/events/${slug.value}/sessions/${sessionPublicId.value}/seats?pass=${queueState.value.entry.passToken}`)
    }
  }
  catch (error) {
    queueError.value = parseApiError(error, t('waiting_room.lost_contact')).message
  }
}

async function leaveQueue() {
  if (!sessionPublicId.value) {
    return
  }

  isLeaving.value = true

  try {
    const response = await apiRequest(apiRoutes.eventSessionQueueLeave(sessionPublicId.value), { method: 'POST' })
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
    const response = await apiRequest(apiRoutes.eventSessionQueueJoin(sessionPublicId.value), { method: 'POST', body: {} })
    if (!response.success) {
      throw response
    }
    await refreshQueueStatus()
  }
  catch (error) {
    queueError.value = parseApiError(error, t('waiting_room.join_failed')).message
  }
  finally {
    isJoining.value = false
  }

  queueIntervalId = window.setInterval(refreshQueueStatus, 2500)
  queueClockIntervalId = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (queueIntervalId !== null) {
    window.clearInterval(queueIntervalId)
  }
  if (queueClockIntervalId !== null) {
    window.clearInterval(queueClockIntervalId)
  }
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
              <div class="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  class="h-full rounded-full bg-primary transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  :style="{ width: `${queueProgress}%` }"
                />
              </div>
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
          class="rounded-[1.5rem] border border-rose-200/70 bg-rose-50 px-5 py-4 text-left text-sm text-rose-950 dark:border-rose-300/15 dark:bg-rose-500/10 dark:text-rose-100"
        >
          {{ queueError }}
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:justify-center">
          <Button
            variant="outline"
            class="rounded-full"
            :disabled="isJoining"
            @click="refreshQueueStatus"
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
