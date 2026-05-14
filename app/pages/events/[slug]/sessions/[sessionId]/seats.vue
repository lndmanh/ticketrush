<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, CheckCircle2, ShoppingBag, Sparkles, TicketCheck, TicketPlus, Trash2, XCircle, RefreshCw } from '@lucide/vue'
import NumberFlow from '@number-flow/vue'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { apiRoutes } from '#shared/apiRoutes'
import { parseSeatmapRealtimeMessage } from '~~/types/seatmap-realtime'
import type { SeatStatusDeltaChange } from '~~/types/seatmap-realtime'
import type { ApiResponse } from '~~/types/api'
import type { EventSessionDetailResponse } from '~~/types/events'
import type { HoldData, EventSessionGateResponse } from '~~/types/ticketing'
import type { SessionSeatMapResponse } from '~~/types/seatmap'
import { SeatStatus } from '#shared/commonEnums'

const route = useRoute()
const slug = computed(() => {
  const value = route.params.slug
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? ''
  return ''
})
const sessionPublicId = computed(() => typeof route.params.sessionId === 'string' ? route.params.sessionId : '')
const passToken = computed(() => typeof route.query.pass === 'string' ? route.query.pass : undefined)
const requestUrl = useRequestURL()
const { locale } = useI18n()

const { data: detailResponse, error: detailFetchError } = await useAPI<ApiResponse<EventSessionDetailResponse>>(() => apiRoutes.eventSession(sessionPublicId.value), {
  query: computed(() => ({ locale: locale.value })),
})
const detail = computed(() => detailResponse.value?.success ? detailResponse.value.data : null)
const event = computed(() => detail.value?.event ?? null)
const session = computed(() => detail.value?.session ?? null)

const { data: gateResponse, error: gateFetchError } = await useAPI<ApiResponse<EventSessionGateResponse>>(() => apiRoutes.eventSessionGate(sessionPublicId.value), {
  query: computed(() => passToken.value ? { pass: passToken.value } : {}),
})

if (gateResponse.value?.success && gateResponse.value.data.shouldQueue) {
  await navigateTo({
    path: `/waiting-room/${sessionPublicId.value}`,
    query: { slug: slug.value },
  })
}

const { data: seatMapResponse, refresh: refreshSeatMap, error: seatMapFetchError } = await useAPI<ApiResponse<SessionSeatMapResponse>>(() => apiRoutes.eventSessionSeatmap(sessionPublicId.value), {
  query: computed(() => ({ locale: locale.value })),
})
const seatMap = computed(() => seatMapResponse.value?.success ? seatMapResponse.value.data : null)
const selectedSeatIds = ref<number[]>([])
const previewSeatId = ref<number | null>(null)
const previewTicketItem = ref<HTMLElement | null>(null)
const isSubmitting = ref(false)
const checkoutUnavailableError = ref<ReturnType<typeof parseApiError> | null>(null)
const realtimeStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const currentSeatmapVersion = ref(0)
let fallbackRefreshTimer: ReturnType<typeof setInterval> | undefined
let seatMapRefreshPromise: Promise<void> | null = null
let seatMapRefreshQueued = false
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
    await refreshSeatMapSafely()
    if (sessionUnavailableError.value) {
      return
    }

    currentSeatmapVersion.value = seatMap.value?.version ?? currentSeatmapVersion.value
    realtimeStatus.value = 'connected'
  },
  onDisconnected() {
    if (sessionUnavailableError.value) {
      realtimeStatus.value = 'disconnected'
      return
    }

    realtimeStatus.value = 'connecting'
    void refreshSeatMapSafely()
  },
  onError() {
    if (sessionUnavailableError.value) {
      realtimeStatus.value = 'disconnected'
      return
    }

    if (realtimeStatus.value !== 'connected') {
      realtimeStatus.value = 'connecting'
    }
    void refreshSeatMapSafely()
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
    available: seats.filter(seat => seat.status === SeatStatus.Available).length,
    locked: seats.filter(seat => seat.status === SeatStatus.Locked).length,
    sold: seats.filter(seat => seat.status === SeatStatus.Sold).length,
  }
})

const venueName = computed(() => detail.value?.venue?.venue.name || 'Venue pending')
const venueCity = computed(() => detail.value?.venue?.venue.city || 'Location incoming')
const sessionTimeLabel = computed(() => {
  if (!session.value) {
    return 'Session time pending'
  }

  return new Date(session.value.startsAt).toLocaleString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})
const selectedSeats = computed(() => {
  return (seatMap.value?.seats ?? []).filter(seat => selectedSeatIds.value.includes(seat.id))
})

const selectedSeatsBySection = computed(() => {
  const groups = new Map<string, typeof selectedSeats.value>()
  for (const seat of selectedSeats.value) {
    const section = localizeSectionName(seat.sectionNameSnapshot)
    const existing = groups.get(section)
    if (existing) {
      existing.push(seat)
    }
    else {
      groups.set(section, [seat])
    }
  }
  return [...groups.entries()].map(([name, seats]) => ({ name, seats }))
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

const previewTotalCurrency = computed(() => {
  return previewSeat.value?.currency ?? selectedSeats.value[0]?.currency ?? 'VND'
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

const sessionUnavailableError = computed(() => {
  const parsedErrors = [
    checkoutUnavailableError.value,
    parseApiFetchState(detailResponse.value, detailFetchError.value),
    parseApiFetchState(gateResponse.value, gateFetchError.value),
    parseApiFetchState(seatMapResponse.value, seatMapFetchError.value),
  ]

  for (const parsedError of parsedErrors) {
    if (parsedError && isSessionUnavailableError(parsedError)) {
      return parsedError
    }
  }

  return null
})

function parseApiFetchState(response: ApiResponse<unknown> | null | undefined, fetchError: unknown) {
  if (fetchError) {
    return parseApiError(fetchError)
  }

  if (response && !response.success) {
    return parseApiError(response)
  }

  return null
}

function isSessionUnavailableError(error: ReturnType<typeof parseApiError>) {
  return error.status === 404
    || error.code === 'SESSION_NOT_FOUND'
    || error.code === 'EVENT_NOT_FOUND'
    || error.message === 'This session is not available for booking.'
}

function stopSeatMapRefresh() {
  if (fallbackRefreshTimer) {
    clearInterval(fallbackRefreshTimer)
    fallbackRefreshTimer = undefined
  }

  close()
}

async function refreshSeatMapSafely() {
  if (seatMapRefreshPromise) {
    seatMapRefreshQueued = true
    return seatMapRefreshPromise
  }

  do {
    seatMapRefreshQueued = false
    seatMapRefreshPromise = refreshSeatMap().then(() => undefined)

    try {
      await seatMapRefreshPromise
    }
    finally {
      seatMapRefreshPromise = null
    }
  } while (seatMapRefreshQueued)
}

function formatCurrency(value: number, currency = 'VND') {
  return `${Intl.NumberFormat(getDisplayDateLocale(locale.value)).format(value / 100)} ${currency}`
}

function formatSeatLabel(seat: { sectionNameSnapshot: string, rowLabelSnapshot: string | null, seatLabelSnapshot: string }) {
  const rowLabel = seat.rowLabelSnapshot ? `${seat.rowLabelSnapshot}-` : ''

  return `${localizeSectionName(seat.sectionNameSnapshot)} · ${rowLabel}${seat.seatLabelSnapshot}`
}

function localizeSectionName(name: string | null | undefined) {
  if (!name) {
    return ''
  }

  if (locale.value !== 'vi') {
    return name
  }

  const normalizedName = name.trim().toLowerCase()
  if (normalizedName === 'standard') return t('seatmap.section_standard')
  if (normalizedName === 'premium') return t('seatmap.section_premium')
  if (normalizedName === 'vip') return t('seatmap.section_vip')
  return name
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

function removeSectionSeats(seatIds: number[]) {
  const removeSet = new Set(seatIds)
  selectedSeatIds.value = selectedSeatIds.value.filter(id => !removeSet.has(id))
}

function removeAllSelectedSeats() {
  selectedSeatIds.value = []
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
  if (sessionUnavailableError.value) {
    return
  }

  const message = parseSeatmapRealtimeMessage(rawValue)
  if (!message || message.sessionPublicId !== sessionPublicId.value) {
    await refreshSeatMapSafely()
    currentSeatmapVersion.value = seatMap.value?.version ?? message?.version ?? currentSeatmapVersion.value
    return
  }

  if (message.type === 'seatmap-connected') {
    realtimeStatus.value = 'connected'
    if (message.version > currentSeatmapVersion.value) {
      await refreshSeatMapSafely()
      currentSeatmapVersion.value = seatMap.value?.version ?? message.version
      return
    }

    currentSeatmapVersion.value = currentSeatmapVersion.value > message.version ? currentSeatmapVersion.value : message.version
    return
  }

  if (message.version !== currentSeatmapVersion.value + 1) {
    await refreshSeatMapSafely()
    currentSeatmapVersion.value = seatMap.value?.version ?? message.version
    return
  }

  if (message.type === 'seat-status-delta') {
    if (!applySeatChanges(message.changes, message.version)) {
      await refreshSeatMapSafely()
      currentSeatmapVersion.value = seatMap.value?.version ?? message.version
      return
    }

    currentSeatmapVersion.value = message.version
    return
  }

  await refreshSeatMapSafely()
  currentSeatmapVersion.value = seatMap.value?.version ?? message.version
}

async function reserveSeats() {
  if (!session.value || sessionUnavailableError.value || selectedSeatIds.value.length === 0) {
    return
  }

  isSubmitting.value = true

  try {
    const holdResponse = await apiRequest<ApiResponse<HoldData>>(apiRoutes.eventSessionHolds(sessionPublicId.value), {
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

    if (isSessionUnavailableError(parsedError)) {
      checkoutUnavailableError.value = parsedError
      toast.error('This session is no longer available for booking.')
      return
    }

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
    if (!sessionUnavailableError.value) {
      await refreshSeatMapSafely()
    }
  }
}

watch(sessionUnavailableError, (value) => {
  if (!value) {
    return
  }

  selectedSeatIds.value = []
  previewSeatId.value = null
  realtimeStatus.value = 'disconnected'
  stopSeatMapRefresh()
}, { immediate: true })

watch(seatMap, (value) => {
  if (sessionUnavailableError.value) {
    return
  }

  if (value) {
    currentSeatmapVersion.value = value.version
  }

  const availableSeatIds = new Set(
    (value?.seats ?? [])
      .filter(seat => seat.status === SeatStatus.Available)
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
  if (sessionUnavailableError.value) {
    return
  }

  fallbackRefreshTimer = setInterval(() => {
    if (!sessionUnavailableError.value) {
      void refreshSeatMapSafely()
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
  layout: 'empty',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="sessionUnavailableError"
    aria-live="polite"
    class="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground"
  >
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,hsl(var(--destructive)/0.12),transparent_30%),radial-gradient(circle_at_82%_12%,hsl(var(--primary)/0.10),transparent_28%)]" />

    <Empty class="relative w-full max-w-xl rounded-[1.75rem] border bg-background/95 px-6 py-10 text-center shadow-sm">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          class="border-destructive/20 bg-destructive/10 text-destructive"
        >
          <XCircle class="size-7" />
        </EmptyMedia>
        <EmptyTitle>This session is no longer available</EmptyTitle>
        <EmptyDescription>
          The organizer has made this session unavailable while you were choosing seats. Your selection has been cleared and checkout is closed for this session.
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent class="space-y-5">
        <div class="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You can browse other available events, or check again later if the organizer republishes this event.
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button as-child>
            <NuxtLink to="/events">
              <ArrowLeft class="size-4" />
              Browse events
            </NuxtLink>
          </Button>
          <Button
            as-child
            variant="outline"
          >
            <NuxtLink to="/">
              Go home
            </NuxtLink>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  </main>

  <main
    v-else-if="detail && event && session && seatMap"
    class="grid h-[100dvh] max-h-[100dvh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background text-foreground"
  >
    <header class="border-b bg-background px-4 py-2">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex items-start gap-3">
          <Button
            as-child
            variant="outline"
            size="icon-sm"
          >
            <NuxtLink
              :to="`/events/${slug}`"
              :aria-label="$t('common.back')"
            >
              <ArrowLeft />
            </NuxtLink>
          </Button>

          <div class="min-w-0">
            <h1 class="truncate text-xl font-semibold">
              {{ event.title }}
            </h1>
            <p class="text-sm text-muted-foreground">
              {{ session.label }} &middot; {{ venueName }}, {{ venueCity }} &middot; {{ sessionTimeLabel }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
          <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <span class="font-medium text-foreground">{{ inventorySummary.available }}</span>
              <span>{{ $t('common.available') }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <span class="font-medium text-foreground">{{ inventorySummary.locked }}</span>
              <span>{{ $t('common.held') }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <span class="font-medium text-foreground">{{ inventorySummary.sold }}</span>
              <span>{{ $t('common.sold') }}</span>
            </div>
            <div class="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
              <RefreshCw :class="['size-3.5', realtimeStatus === 'connecting' ? 'animate-spin' : '']" />
              <span>{{ inventoryStatusLabel }}</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <section class="grid min-h-0 gap-3 overflow-hidden p-3 md:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)]">
      <div class="flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] border bg-background/95 shadow-sm">
        <div class="min-h-0 flex-1 overflow-hidden p-3 md:p-4 [&>section]:flex [&>section]:h-full [&>section]:min-h-0 [&>section]:flex-col [&_[data-slot=scroll-area]]:min-h-0">
          <TicketEventSeatMapExperience
            :seats="seatMap.seats"
            :ticket-types="seatMap.ticketTypes ?? []"
            :section-prices="seatMap.sectionPrices"
            :seat-overrides="seatMap.seatOverrides"
            :selected-seat-ids="seatMapSelectedSeatIds"
            :interactive="true"
            :action-label="null"
            @toggle="toggleSeat"
          />
        </div>
      </div>

      <Card class="flex min-h-0 overflow-hidden">
        <CardHeader class="shrink-0 border-b py-3">
          <div class="flex items-center gap-2.5">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
              <ShoppingBag class="size-4" />
            </div>
            <CardTitle class="text-base">
              {{ $t('seats.selection_summary') }}
            </CardTitle>
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
                  <div class="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      class="text-muted-foreground hover:text-destructive"
                      title="Cancel preview"
                      :aria-label="'Cancel preview seat'"
                      @click="clearPreviewSeat"
                    >
                      <XCircle class="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      class="text-primary"
                      title="Confirm preview seat"
                      :aria-label="'Confirm preview seat'"
                      @click="confirmPreviewSeat"
                    >
                      <CheckCircle2 class="size-4" />
                    </Button>
                    <span class="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <Sparkles class="size-3.5" />
                      New
                    </span>
                  </div>
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
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Confirmed tickets
                    </p>
                    <p class="text-sm text-muted-foreground">
                      These seats will be held together when you continue.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    class="text-muted-foreground hover:text-destructive"
                    title="Remove all confirmed seats"
                    :aria-label="'Remove all confirmed seats'"
                    @click="removeAllSelectedSeats"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>

                <div class="space-y-4">
                  <div
                    v-for="group in selectedSeatsBySection"
                    :key="group.name"
                  >
                    <div class="mb-1.5 flex items-center justify-between gap-2">
                      <p class="text-xs font-medium text-muted-foreground">
                        {{ group.name }}
                        <span class="ml-1 tabular-nums text-foreground/60">{{ group.seats.length }}</span>
                      </p>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        class="size-6 text-muted-foreground hover:text-destructive"
                        :title="`Remove all seats in ${group.name}`"
                        :aria-label="`Remove all seats in ${group.name}`"
                        @click="removeSectionSeats(group.seats.map(s => s.id))"
                      >
                        <Trash2 class="size-3.5" />
                      </Button>
                    </div>

                    <ItemGroup>
                      <Item
                        v-for="seat in group.seats"
                        :key="seat.id"
                        variant="outline"
                        class="bg-background/80"
                      >
                        <ItemMedia variant="icon">
                          <TicketCheck class="size-4" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{{ seat.rowLabelSnapshot ? `${seat.rowLabelSnapshot}-${seat.seatLabelSnapshot}` : seat.seatLabelSnapshot }}</ItemTitle>
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
                  </div>
                </div>
              </section>

              <Empty
                v-if="!previewSeat && selectedSeats.length === 0"
                class="border border-dashed"
              >
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TicketPlus />
                  </EmptyMedia>
                  <EmptyTitle>{{ $t('seats.pick_seats_prompt') }}</EmptyTitle>
                  <EmptyDescription>
                    Click a seat on the map to create a preview ticket here.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent />
              </Empty>
            </div>
          </ScrollArea>

          <div class="shrink-0 border-t bg-background/95 px-4 pb-4 pt-3 md:px-5">
            <div class="flex items-end justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-muted-foreground">
                  {{ $t('seats.selected_seats', { count: selectedTicketCount }) }}
                </p>
                <div class="mt-0.5 flex items-baseline gap-1.5">
                  <NumberFlow
                    class="text-2xl font-semibold tabular-nums tracking-tight text-foreground"
                    :value="previewTotalValue / 100"
                    :format="{ style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }"
                  />
                  <span class="text-sm font-medium text-muted-foreground">{{ previewTotalCurrency }}</span>
                </div>
              </div>

              <Button
                size="lg"
                :disabled="selectedSeatIds.length === 0"
                :is-loading="isSubmitting"
                @click="reserveSeats"
              >
                {{ $t('seats.continue_to_checkout') }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
