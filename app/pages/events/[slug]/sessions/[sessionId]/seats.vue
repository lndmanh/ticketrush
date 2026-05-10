<script setup lang="ts">
import { toast } from 'vue-sonner'
import { CheckCircle2, Clock3, RefreshCw, ShoppingBag, Sparkles, TicketCheck, TicketPlus, Trash2, Users } from '@lucide/vue'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { parseSeatmapRealtimeMessage } from '~~/types/seatmap-realtime'
import type { SeatStatusDeltaChange } from '~~/types/seatmap-realtime'

const route = useRoute()
const slug = computed(() => route.params.slug.toString())
const sessionPublicId = computed(() => route.params.sessionId.toString())
const passToken = computed(() => typeof route.query.pass === 'string' ? route.query.pass : undefined)
const requestUrl = useRequestURL()

const { data: detailResponse } = await useAPI(() => apiRoutes.eventSession(sessionPublicId.value))
const detail = computed(() => detailResponse.value?.success ? detailResponse.value.data : null)
const event = computed(() => detail.value?.event ?? null)
const session = computed(() => detail.value?.session ?? null)

const { data: gateResponse } = await useAPI(() => apiRoutes.eventSessionGate(sessionPublicId.value), {
  query: computed(() => passToken.value ? { pass: passToken.value } : {}),
})

if (gateResponse.value?.success && gateResponse.value.data.shouldQueue) {
  await navigateTo({
    path: `/waiting-room/${sessionPublicId.value}`,
    query: { slug: slug.value },
  })
}

const { data: seatMapResponse, refresh: refreshSeatMap } = await useAPI(() => apiRoutes.eventSessionSeatmap(sessionPublicId.value))
const seatMap = computed(() => seatMapResponse.value?.success ? seatMapResponse.value.data : null)
const selectedSeatIds = ref<number[]>([])
const previewSeatId = ref<number | null>(null)
const previewTicketItem = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)
const realtimeStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const currentSeatmapVersion = ref(0)
let fallbackRefreshTimer: ReturnType<typeof setInterval> | undefined
const socketUrl = computed(() => {
  const url = new URL(apiRoutes.eventSessionSeatmapSocket(sessionPublicId.value), requestUrl.origin)
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
    await refreshSeatMap()
    currentSeatmapVersion.value = seatMap.value?.version ?? currentSeatmapVersion.value
    realtimeStatus.value = 'connected'
  },
  onDisconnected() {
    realtimeStatus.value = 'connecting'
  },
  onError() {
    if (realtimeStatus.value !== 'connected') {
      realtimeStatus.value = 'connecting'
    }
  },
  async onMessage(_ws, event) {
    if (typeof event.data === 'string') {
      await handleRealtimeMessage(event.data)
      return
    }

    if (event.data instanceof Blob) {
      await handleRealtimeMessage(await event.data.text())
    }
  },
})

const inventorySummary = computed(() => {
  const seats = seatMap.value?.seats ?? []

  return {
    available: seats.filter(seat => seat.status === 'available').length,
    locked: seats.filter(seat => seat.status === 'locked').length,
    sold: seats.filter(seat => seat.status === 'sold').length,
  }
})

const venueName = computed(() => detail.value?.venue?.venue.name || 'Venue pending')
const venueCity = computed(() => detail.value?.venue?.venue.city || 'Location incoming')
const sessionTimeLabel = computed(() => {
  if (!session.value) {
    return 'Session time pending'
  }

  return new Date(session.value.startsAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})
const selectedSeats = computed(() => {
  return (seatMap.value?.seats ?? []).filter(seat => selectedSeatIds.value.includes(seat.id))
})

const previewSeat = computed(() => {
  if (previewSeatId.value === null) {
    return null
  }

  return (seatMap.value?.seats ?? []).find(seat => seat.id === previewSeatId.value) ?? null
})

const seatMapSelectedSeatIds = computed(() => {
  if (!previewSeat.value || selectedSeatIds.value.includes(previewSeat.value.id)) {
    return selectedSeatIds.value
  }

  return [...selectedSeatIds.value, previewSeat.value.id]
})

const selectedTicketCount = computed(() => {
  return selectedSeatIds.value.length + (previewSeat.value ? 1 : 0)
})

const totalValue = computed(() => {
  return selectedSeats.value.reduce((total, seat) => total + seat.priceCents, 0)
})

const previewTotalValue = computed(() => {
  return totalValue.value + (previewSeat.value?.priceCents ?? 0)
})

const inventoryStatusLabel = computed(() => {
  if (realtimeStatus.value === 'connected') {
    return 'Connected'
  }

  if (realtimeStatus.value === 'connecting') {
    return 'Connecting'
  }

  return 'Disconnected'
})

function formatCurrency(value: number, currency = 'VND') {
  return `${Intl.NumberFormat('en-US').format(value / 100)} ${currency}`
}

function formatSeatLabel(seat: { sectionNameSnapshot: string, rowLabelSnapshot: string | null, seatLabelSnapshot: string }) {
  const rowLabel = seat.rowLabelSnapshot ? `${seat.rowLabelSnapshot}-` : ''

  return `${seat.sectionNameSnapshot} · ${rowLabel}${seat.seatLabelSnapshot}`
}

async function scrollToPreviewTicket() {
  await nextTick()
  previewTicketItem.value?.scrollIntoView({
    block: 'nearest',
    behavior: 'smooth',
  })
}

function clearPreviewSeat() {
  previewSeatId.value = null
}

function confirmPreviewSeat() {
  if (!previewSeat.value) {
    return
  }

  if (selectedSeatIds.value.includes(previewSeat.value.id)) {
    previewSeatId.value = null
    return
  }

  if (selectedSeatIds.value.length >= 10) {
    toast.error('You can select up to 10 seats.')
    return
  }

  selectedSeatIds.value = [...selectedSeatIds.value, previewSeat.value.id]
  previewSeatId.value = null
}

function removeSelectedSeat(seatId: number) {
  selectedSeatIds.value = selectedSeatIds.value.filter(id => id !== seatId)

  if (previewSeatId.value === seatId) {
    previewSeatId.value = null
  }
}

function toggleSeat(seatId: number) {
  if (selectedSeatIds.value.includes(seatId)) {
    removeSelectedSeat(seatId)
    return
  }

  if (previewSeatId.value === seatId) {
    previewSeatId.value = null
    return
  }

  if (selectedSeatIds.value.length >= 10) {
    toast.error('You can select up to 10 seats.')
    return
  }

  previewSeatId.value = seatId
  void scrollToPreviewTicket()
}

function applySeatChanges(changes: SeatStatusDeltaChange[], version: number) {
  if (!seatMapResponse.value?.success) {
    return false
  }

  const seatIds = new Set(seatMapResponse.value.data.seats.map(seat => seat.id))
  if (changes.some(change => !seatIds.has(change.seatId))) {
    return false
  }

  const nextSeats = seatMapResponse.value.data.seats.map((seat) => {
    const change = changes.find(item => item.seatId === seat.id)
    if (!change) {
      return seat
    }

    return {
      ...seat,
      status: change.status,
    }
  })

  seatMapResponse.value = {
    ...seatMapResponse.value,
    data: {
      ...seatMapResponse.value.data,
      version,
      seats: nextSeats,
    },
  }

  return true
}

async function handleRealtimeMessage(rawValue: string) {
  const message = parseSeatmapRealtimeMessage(rawValue)
  if (!message || message.sessionPublicId !== sessionPublicId.value) {
    await refreshSeatMap()
    currentSeatmapVersion.value = seatMap.value?.version ?? message?.version ?? currentSeatmapVersion.value
    return
  }

  if (message.type === 'seatmap-connected') {
    realtimeStatus.value = 'connected'
    if (message.version > currentSeatmapVersion.value) {
      await refreshSeatMap()
      currentSeatmapVersion.value = seatMap.value?.version ?? message.version
      return
    }

    currentSeatmapVersion.value = currentSeatmapVersion.value > message.version ? currentSeatmapVersion.value : message.version
    return
  }

  if (message.version !== currentSeatmapVersion.value + 1) {
    await refreshSeatMap()
    currentSeatmapVersion.value = seatMap.value?.version ?? message.version
    return
  }

  if (message.type === 'seat-status-delta') {
    if (!applySeatChanges(message.changes, message.version)) {
      await refreshSeatMap()
      currentSeatmapVersion.value = seatMap.value?.version ?? message.version
      return
    }

    currentSeatmapVersion.value = message.version
    return
  }

  await refreshSeatMap()
  currentSeatmapVersion.value = seatMap.value?.version ?? message.version
}

async function reserveSeats() {
  if (!session.value || selectedSeatIds.value.length === 0) {
    return
  }

  isSubmitting.value = true

  try {
    const holdResponse = await apiRequest(apiRoutes.eventSessionHolds(sessionPublicId.value), {
      method: 'POST',
      body: {
        eventSeatIds: selectedSeatIds.value,
        idempotencyKey: crypto.randomUUID(),
        passToken: passToken.value,
      },
    })
    if (!holdResponse.success) {
      throw holdResponse
    }

    const holdPublicId = holdResponse.data.hold.publicId
    const checkoutResponse = await apiRequest(apiRoutes.CHECKOUT_START, {
      method: 'POST',
      body: {
        holdPublicId,
      },
    })
    if (!checkoutResponse.success) {
      throw checkoutResponse
    }

    await navigateTo(`/checkout/${checkoutResponse.data.publicId}?hold=${holdPublicId}`)
  }
  catch (error) {
    const parsedError = parseApiError(error, 'We could not open checkout. Please try again.')

    const statusCode = parsedError.status
    const message = parsedError.message

    if (statusCode === 409) {
      toast.error('Some of the selected seats are no longer available. We refreshed the map for you.')
      return
    }

    if (statusCode === 403) {
      toast.error(message)
      await navigateTo({
        path: `/waiting-room/${sessionPublicId.value}`,
        query: { slug: slug.value },
      })
      return
    }

    toast.error(message)
    return
  }
  finally {
    isSubmitting.value = false
    await refreshSeatMap()
  }
}

watch(seatMap, (value) => {
  if (value) {
    currentSeatmapVersion.value = value.version
  }

  const availableSeatIds = new Set(
    (value?.seats ?? [])
      .filter(seat => seat.status === 'available')
      .map(seat => seat.id),
  )

  const nextSelectedSeatIds = selectedSeatIds.value.filter(seatId => availableSeatIds.has(seatId))
  const selectedSeatsChanged = nextSelectedSeatIds.length !== selectedSeatIds.value.length
  const previewSeatWasTaken = previewSeatId.value !== null && !availableSeatIds.has(previewSeatId.value)

  if (selectedSeatsChanged) {
    selectedSeatIds.value = nextSelectedSeatIds
  }

  if (previewSeatWasTaken) {
    previewSeatId.value = null
  }

  if (selectedSeatsChanged || previewSeatWasTaken) {
    toast.error('One or more selected seats were taken by another customer.')
  }
}, { deep: true, immediate: true })

onMounted(() => {
  fallbackRefreshTimer = setInterval(() => {
    if (realtimeStatus.value !== 'connected') {
      void refreshSeatMap()
    }
  }, 15000)
  open()
})

onUnmounted(() => {
  if (fallbackRefreshTimer) {
    clearInterval(fallbackRefreshTimer)
  }
  close()
})

definePageMeta({
  title: 'Choose seats',
  breadcrumb: 'Seat selection',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="detail && event && session && seatMap"
    class="flex h-[calc(100dvh-var(--header-height,3.5rem)-2rem)] min-h-0 flex-col overflow-hidden md:h-[calc(100dvh-var(--header-height,3.5rem)-3rem)]"
  >
    <section class="grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)] lg:grid-rows-1 lg:overflow-hidden">
      <div class="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border bg-background/95 shadow-sm">
        <div class="shrink-0 border-b bg-muted/20 p-4 md:p-5">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Live seat selection
              </p>
              <h1 class="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
                {{ event.title }}
              </h1>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ session.label }} &middot; {{ venueName }}, {{ venueCity }} &middot; {{ sessionTimeLabel }}
              </p>
            </div>

            <div class="grid grid-cols-3 gap-2 text-sm sm:min-w-[18rem]">
              <div class="rounded-2xl border bg-background/80 px-3 py-2">
                <span class="text-xs text-muted-foreground">{{ $t('common.available') }}</span>
                <p class="font-semibold tabular-nums text-foreground">
                  {{ inventorySummary.available }}
                </p>
              </div>
              <div class="rounded-2xl border bg-background/80 px-3 py-2">
                <span class="text-xs text-muted-foreground">{{ $t('common.held') }}</span>
                <p class="font-semibold tabular-nums text-foreground">
                  {{ inventorySummary.locked }}
                </p>
              </div>
              <div class="rounded-2xl border bg-background/80 px-3 py-2">
                <span class="text-xs text-muted-foreground">{{ $t('common.sold') }}</span>
                <p class="font-semibold tabular-nums text-foreground">
                  {{ inventorySummary.sold }}
                </p>
              </div>
            </div>
          </div>

          <p
            v-if="realtimeStatus !== 'connected'"
            class="mt-3 text-xs text-muted-foreground"
          >
            {{ realtimeStatus === 'connecting' ? $t('seats.realtime_reconnecting_short') : $t('seats.realtime_unavailable') }}
          </p>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden p-3 md:p-4 [&>section]:flex [&>section]:h-full [&>section]:min-h-0 [&>section]:flex-col [&_[data-slot=scroll-area]]:min-h-0">
          <TicketEventSeatMapExperience
            :seats="seatMap.seats"
            :ticket-types="seatMap.ticketTypes"
            :selected-seat-ids="seatMapSelectedSeatIds"
            :interactive="true"
            :action-label="null"
            @toggle="toggleSeat"
          />
        </div>
      </div>

      <Card class="flex min-h-0 overflow-hidden rounded-[1.75rem]">
        <CardHeader class="shrink-0 border-b p-4 md:p-5">
          <div class="flex items-start gap-3">
            <div class="flex size-11 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
              <ShoppingBag class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <CardTitle>{{ $t('seats.selection_summary') }}</CardTitle>
              <p class="mt-1 text-sm text-muted-foreground">
                Choose a seat, review the preview ticket, then confirm it into your checkout selection.
              </p>
            </div>
          </div>

          <div class="grid gap-2 pt-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div class="rounded-2xl border bg-muted/30 p-3">
              <Users class="mb-2 size-4 text-muted-foreground" />
              <p class="text-xs text-muted-foreground">
                {{ $t('common.selected') }}
              </p>
              <p class="text-sm font-medium text-foreground">
                {{ $t('seats.selected_seats', { count: selectedTicketCount }) }}
              </p>
            </div>
            <div class="rounded-2xl border bg-muted/30 p-3">
              <Clock3 class="mb-2 size-4 text-muted-foreground" />
              <p class="text-xs text-muted-foreground">
                {{ $t('seats.hold_window') }}
              </p>
              <p class="text-sm font-medium text-foreground">
                {{ $t('seats.hold_minutes') }}
              </p>
            </div>
            <div class="rounded-2xl border bg-muted/30 p-3">
              <RefreshCw :class="['mb-2 size-4 text-muted-foreground', realtimeStatus === 'connecting' ? 'animate-spin' : '']" />
              <p class="text-xs text-muted-foreground">
                {{ $t('seats.inventory') }}
              </p>
              <p class="text-sm font-medium text-foreground">
                {{ inventoryStatusLabel }}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent class="flex min-h-0 flex-1 flex-col gap-4 p-0">
          <ScrollArea class="min-h-0 flex-1 px-4 py-4 md:px-5">
            <div class="space-y-5 pb-2">
              <section
                v-if="previewSeat"
                ref="previewTicketItem"
                class="scroll-mt-4"
              >
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                      Preview ticket
                    </p>
                    <p class="text-sm text-muted-foreground">
                      Confirm this seat to include it at checkout.
                    </p>
                  </div>
                  <span class="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <Sparkles class="size-3.5" />
                    New
                  </span>
                </div>

                <ItemGroup>
                  <Item class="relative isolate overflow-hidden border-dashed border-primary/40 bg-gradient-to-br from-primary/15 via-background to-background shadow-[0_18px_60px_-36px_hsl(var(--primary))]">
                    <div class="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-primary/15 blur-2xl" />
                    <ItemMedia
                      variant="icon"
                      class="border-primary/25 bg-primary text-primary-foreground"
                    >
                      <TicketPlus class="size-4" />
                    </ItemMedia>
                    <ItemContent class="relative">
                      <ItemTitle>{{ formatSeatLabel(previewSeat) }}</ItemTitle>
                      <ItemDescription class="line-clamp-none">
                        Preview only. Confirm it to add this ticket to checkout.
                      </ItemDescription>
                    </ItemContent>
                    <div class="relative ml-auto text-right">
                      <p class="font-mono text-sm font-semibold text-foreground">
                        {{ formatCurrency(previewSeat.priceCents, previewSeat.currency) }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        Expected add-on
                      </p>
                    </div>
                    <ItemActions class="relative w-full justify-end sm:w-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        @click="clearPreviewSeat"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        @click="confirmPreviewSeat"
                      >
                        <CheckCircle2 class="size-4" />
                        Confirm
                      </Button>
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </section>

              <section v-if="selectedSeats.length > 0">
                <div class="mb-2">
                  <p class="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Confirmed tickets
                  </p>
                  <p class="text-sm text-muted-foreground">
                    These seats will be held together when you continue.
                  </p>
                </div>

                <ItemGroup>
                  <Item
                    v-for="seat in selectedSeats"
                    :key="seat.id"
                    variant="outline"
                    class="bg-background/80"
                  >
                    <ItemMedia variant="icon">
                      <TicketCheck class="size-4" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{{ formatSeatLabel(seat) }}</ItemTitle>
                      <ItemDescription>{{ $t('seats.reserved_for_checkout') }}</ItemDescription>
                    </ItemContent>
                    <div class="ml-auto text-right">
                      <p class="font-mono text-sm font-semibold text-foreground">
                        {{ formatCurrency(seat.priceCents, seat.currency) }}
                      </p>
                    </div>
                    <ItemActions class="w-full justify-end sm:w-auto">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        class="text-muted-foreground hover:text-destructive"
                        :aria-label="`Remove ${formatSeatLabel(seat)}`"
                        @click="removeSelectedSeat(seat.id)"
                      >
                        <Trash2 class="size-4" />
                      </Button>
                    </ItemActions>
                  </Item>
                </ItemGroup>
              </section>

              <div
                v-if="!previewSeat && selectedSeats.length === 0"
                class="rounded-[1.5rem] border border-dashed bg-muted/20 p-6 text-center"
              >
                <div class="mx-auto flex size-12 items-center justify-center rounded-full border bg-background">
                  <TicketPlus class="size-5 text-muted-foreground" />
                </div>
                <p class="mt-4 text-sm font-medium text-foreground">
                  {{ $t('seats.pick_seats_prompt') }}
                </p>
                <p class="mt-2 text-sm text-muted-foreground">
                  Click a seat on the map to create a preview ticket here.
                </p>
              </div>
            </div>
          </ScrollArea>

          <div class="shrink-0 border-t bg-background/95 p-4 md:p-5">
            <div class="rounded-[1.5rem] border bg-muted/25 p-4">
              <div class="flex items-center justify-between gap-4 text-sm">
                <span class="text-muted-foreground">Original price</span>
                <span class="font-mono font-medium text-muted-foreground">
                  {{ formatCurrency(totalValue) }}
                </span>
              </div>
              <div class="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p class="text-xs text-muted-foreground">
                    Expected price
                  </p>
                  <p class="text-xs text-muted-foreground">
                    Includes the preview ticket after confirmation.
                  </p>
                </div>
                <p class="text-2xl font-semibold tracking-tight text-foreground">
                  {{ formatCurrency(previewTotalValue) }}
                </p>
              </div>
            </div>

            <div class="mt-4 grid gap-3">
              <Button
                class="w-full"
                size="lg"
                :disabled="selectedSeatIds.length === 0"
                :is-loading="isSubmitting"
                @click="reserveSeats"
              >
                {{ $t('seats.continue_to_checkout') }}
              </Button>
              <Button
                class="w-full"
                size="lg"
                variant="outline"
                @click="refreshSeatMap"
              >
                {{ $t('seats.refresh_map') }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
