<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { QueueState } from '~~/types/ticketing'

const route = useRoute()
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
    return 'Any moment now'
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

async function refreshQueueStatus() {
  if (!sessionPublicId.value) {
    return
  }

  try {
    const response = await $fetch<{ data: QueueState | null }>(`/api/event-sessions/${sessionPublicId.value}/queue/status`)
    queueState.value = response.data
    queueError.value = ''

    if (queueState.value?.entry?.status === 'admitted' && queueState.value.entry.passToken && slug.value) {
      await navigateTo(`/events/${slug.value}/sessions/${sessionPublicId.value}/seats?pass=${queueState.value.entry.passToken}`)
    }
  }
  catch {
    queueError.value = 'We lost contact with the queue for a moment. We will keep retrying automatically.'
  }
}

async function leaveQueue() {
  if (!sessionPublicId.value) {
    return
  }

  isLeaving.value = true

  try {
    await $fetch(`/api/event-sessions/${sessionPublicId.value}/queue/leave`, { method: 'POST' })
    toast.success('You left the queue')

    if (slug.value) {
      await navigateTo(`/events/${slug.value}`)
      return
    }

    await navigateTo('/events')
  }
  catch {
    toast.error('We could not leave the queue right now')
  }
  finally {
    isLeaving.value = false
  }
}

onMounted(async () => {
  try {
    await $fetch(`/api/event-sessions/${sessionPublicId.value}/queue/join`, { method: 'POST', body: {} })
    await refreshQueueStatus()
  }
  catch {
    queueError.value = 'We could not join the waiting room. Please try again.'
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
          Waiting room
        </span>

        <div class="space-y-4">
          <h1 class="display-title mx-auto max-w-2xl text-balance md:text-5xl">
            Stay here while we pace access to the seat map.
          </h1>
          <p class="mx-auto max-w-[34rem] text-base leading-8 text-muted-foreground">
            TicketRush is admitting customers in small batches so the inventory stays correct and the purchase flow feels stable.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <TicketSummaryMetric
            label="Position"
            :value="queueState?.position || '—'"
            hint="Your live place in line"
          />
          <TicketSummaryMetric
            label="Waiting"
            :value="queueState?.waitingCount || 0"
            hint="Customers still waiting"
          />
          <TicketSummaryMetric
            label="Admitted"
            :value="queueState?.admittedCount || 0"
            hint="Customers currently entering"
          />
        </div>

        <div class="surface-shell">
          <div class="surface-core space-y-4 text-left">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm text-muted-foreground">
                  Estimated wait
                </p>
                <p class="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  {{ estimatedWaitLabel }}
                </p>
              </div>

              <div
                v-if="passWindowLabel"
                class="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Admission window · {{ passWindowLabel }}
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
            Status
          </p>
          <p class="mt-2 text-xl font-semibold tracking-[-0.04em]">
            {{ isJoining ? 'Joining queue…' : queueState?.entry?.status || 'Waiting for admission' }}
          </p>
          <p class="mt-3 text-sm leading-7 text-muted-foreground">
            Please keep this page open. We refresh your status automatically and will move you into the seat map once your window opens.
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
            Refresh status
          </Button>
          <Button
            variant="ghost"
            class="rounded-full"
            :is-loading="isLeaving"
            :disabled="isJoining"
            @click="leaveQueue"
          >
            Leave waiting room
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>
