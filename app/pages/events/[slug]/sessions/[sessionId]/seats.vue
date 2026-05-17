<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowLeft, CheckCircle2, ShoppingBag, Sparkles, TicketCheck, TicketPlus, Trash2, XCircle, RefreshCw } from '@lucide/vue'
import NumberFlow from '@number-flow/vue'
import { parseApiError } from '@/utils/apiError'
import { getEventSessionGateFetchKey, getEventSessionSeatmapFetchKey } from '@/utils/eventSessionAccessData'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatDateTime } from '@/lib/utils'
import { resolveSeatSelectionAfterRefresh } from '@/lib/seatSelectionRefresh'
import { apiRoutes } from '#shared/apiRoutes'
import type { ApiResponse } from '~~/types/api'
import type { EventSessionDetailResponse } from '~~/types/events'
import type { HoldData, EventSessionGateResponse } from '~~/types/ticketing'
import type { SessionSeatMapResponse, SessionSeatMapVersionResponse } from '~~/types/seatmap'
import type { SelfAttendeeStatusModel } from '~~/types/models/saved-attendee'
import { SeatStatus } from '#shared/commonEnums'
import { CashAppIcon } from 'vue3-simple-icons'

const route = useRoute()
const slug = computed(() => {
  const value = route.params.slug
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? ''
  return ''
})
const sessionPublicId = computed(() => typeof route.params.sessionId === 'string' ? route.params.sessionId : '')
const passToken = computed(() => typeof route.query.pass === 'string' ? route.query.pass : undefined)
const { locale, t } = useI18n()
const { formatCurrency: formatPreferredCurrency } = useCurrencyPreference()
const gateFetchKey = computed(() => getEventSessionGateFetchKey(sessionPublicId.value, passToken.value))
const seatMapFetchKey = computed(() => getEventSessionSeatmapFetchKey(sessionPublicId.value, locale.value))

const { data: detailResponse, error: detailFetchError } = await useAPI<ApiResponse<EventSessionDetailResponse>>(() => apiRoutes.eventSession(sessionPublicId.value), {
  query: computed(() => ({ locale: locale.value })),
})
const detail = computed(() => detailResponse.value?.success ? detailResponse.value.data : null)
const event = computed(() => detail.value?.event ?? null)
const session = computed(() => detail.value?.session ?? null)
const pageTitle = computed(() => event.value?.title ? `${event.value.title} · ${t('seats.page_title')}` : t('seats.page_title'))
const pageDescription = computed(() => t('seats.page_description'))

useSeo({
  title: pageTitle,
  description: pageDescription,
  type: 'website',
})

usePageBreadcrumbs(computed(() => {
  if (!event.value || event.value.slug !== slug.value || !session.value || session.value.publicId !== sessionPublicId.value) {
    return undefined
  }

  return [
    { title: t('home.breadcrumb'), href: '/' },
    { title: t('events.breadcrumb'), href: '/events' },
    { title: event.value.title, href: `/events/${slug.value}` },
    { title: session.value.label || t('seats.breadcrumb'), href: route.path },
  ]
}))

const { data: gateResponse, error: gateFetchError } = await useAPI<ApiResponse<EventSessionGateResponse>>(() => apiRoutes.eventSessionGate(sessionPublicId.value), {
  key: gateFetchKey,
  query: computed(() => passToken.value ? { pass: passToken.value } : {}),
})
const gateRequiresQueue = computed(() => Boolean(gateResponse.value?.success && gateResponse.value.data.shouldQueue))
const gateRequiresQueueAtLoad = Boolean(gateResponse.value?.success && gateResponse.value.data.shouldQueue)
const hasRedirectedToWaitingRoom = ref(false)

if (gateRequiresQueueAtLoad) {
  hasRedirectedToWaitingRoom.value = true
  await navigateTo({
    path: `/waiting-room/${sessionPublicId.value}`,
    query: { slug: slug.value },
  })
}

const { data: selfAttendeeStatusResponse } = await useAPI<ApiResponse<SelfAttendeeStatusModel>>(() => apiRoutes.SAVED_ATTENDEE_SELF_STATUS, {
  immediate: !gateRequiresQueueAtLoad,
})
const selfAttendeeStatus = computed(() => selfAttendeeStatusResponse.value?.success ? selfAttendeeStatusResponse.value.data : null)

if (!gateRequiresQueueAtLoad && selfAttendeeStatus.value && !selfAttendeeStatus.value.isComplete) {
  await navigateTo({
    path: '/attendees',
    query: {
      returnTo: route.fullPath,
      reason: 'complete-profile',
    },
  })
}

const { data: seatMapResponse, refresh: refreshSeatMap, error: seatMapFetchError } = await useAPI<ApiResponse<SessionSeatMapResponse>>(() => apiRoutes.eventSessionSeatmap(sessionPublicId.value), {
  key: seatMapFetchKey,
  query: computed(() => ({ locale: locale.value })),
  immediate: !gateRequiresQueueAtLoad,
})
const seatMap = computed(() => seatMapResponse.value?.success ? seatMapResponse.value.data : null)
const queueRequiredAccessError = computed(() => {
  const parsedErrors = [
    parseApiFetchState(gateResponse.value, gateFetchError.value),
    parseApiFetchState(seatMapResponse.value, seatMapFetchError.value),
  ]

  for (const parsedError of parsedErrors) {
    if (parsedError && isQueueRequiredAccessError(parsedError)) {
      return parsedError
    }
  }

  return null
})
const shouldEnterWaitingRoom = computed(() => gateRequiresQueue.value || Boolean(queueRequiredAccessError.value))
const selectedSeatIds = ref<number[]>([])
const previewSeatIds = ref<number[]>([])
const previewTicketItems = new Map<number, HTMLElement>()
const selectedTicketItems = new Map<number, HTMLElement>()
const isSubmitting = ref(false)
const isCheckoutNavigationPending = ref(false)
const checkoutUnavailableError = ref<ReturnType<typeof parseApiError> | null>(null)
const realtimeStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const currentSeatmapVersion = ref(0)
let seatMapVersionPollTimer: ReturnType<typeof setInterval> | undefined
let seatMapRefreshPromise: Promise<void> | null = null
let seatMapRefreshQueued = false
let isPollingSeatMapVersion = false
const seatMapVersionPollIntervalMs = 1500

const inventorySummary = computed(() => {
  const seats = seatMap.value?.seats ?? []

  return {
    available: seats.filter(seat => seat.status === SeatStatus.Available).length,
    locked: seats.filter(seat => seat.status === SeatStatus.Locked).length,
    sold: seats.filter(seat => seat.status === SeatStatus.Sold).length,
  }
})

const venueName = computed(() => detail.value?.venue?.venue.name || t('seats.venue_pending'))
const venueCity = computed(() => detail.value?.venue?.venue.city || t('seats.location_incoming'))
const sessionTimeLabel = computed(() => {
  if (!session.value) {
    return t('seats.session_time_pending')
  }

  return formatDateTime(session.value.startsAt, getDisplayDateLocale(locale.value), {
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
    const section = seat.sectionNameSnapshot
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

const previewSeats = computed(() => {
  const seats = seatMap.value?.seats ?? []

  return previewSeatIds.value.flatMap((seatId) => {
    const seat = seats.find(currentSeat => currentSeat.id === seatId)

    return seat ? [seat] : []
  })
})

const seatMapSelectedSeatIds = computed(() => {
  return [...selectedSeatIds.value, ...previewSeatIds.value.filter(seatId => !selectedSeatIds.value.includes(seatId))]
})

const selectedTicketCount = computed(() => {
  return selectedSeatIds.value.length + previewSeats.value.length
})

const totalValue = computed(() => {
  return selectedSeats.value.reduce((total, seat) => total + seat.priceCents, 0)
})

const previewTotalValue = computed(() => {
  return previewSeats.value.reduce((total, seat) => total + seat.priceCents, totalValue.value)
})

const previewTotalCurrency = computed(() => {
  return previewSeats.value[0]?.currency ?? selectedSeats.value[0]?.currency ?? 'VND'
})

const inventoryStatusLabel = computed(() => {
  if (realtimeStatus.value === 'connected') {
    return t('seats.realtime_connected')
  }

  if (realtimeStatus.value === 'connecting') {
    return t('seats.realtime_connecting')
  }

  return t('seats.realtime_disconnected')
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

const captchaAccessError = computed(() => {
  const parsedErrors = [
    checkoutUnavailableError.value,
    parseApiFetchState(gateResponse.value, gateFetchError.value),
    parseApiFetchState(seatMapResponse.value, seatMapFetchError.value),
  ]

  for (const parsedError of parsedErrors) {
    if (parsedError && isCaptchaAccessError(parsedError)) {
      return parsedError
    }
  }

  return null
})

const isSeatSelectionBlocked = computed(() => Boolean(shouldEnterWaitingRoom.value || sessionUnavailableError.value || captchaAccessError.value))

watch(shouldEnterWaitingRoom, async (value) => {
  if (!value || hasRedirectedToWaitingRoom.value) {
    return
  }

  hasRedirectedToWaitingRoom.value = true
  await navigateTo({
    path: `/waiting-room/${sessionPublicId.value}`,
    query: { slug: slug.value },
  })
}, { immediate: true })

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

function isCaptchaAccessError(error: ReturnType<typeof parseApiError>) {
  return error.code === 'CAPTCHA_REQUIRED'
}

function isQueueRequiredAccessError(error: ReturnType<typeof parseApiError>) {
  return error.code === 'QUEUE_REQUIRED'
}

function stopSeatMapRefresh() {
  if (seatMapVersionPollTimer) {
    clearInterval(seatMapVersionPollTimer)
    seatMapVersionPollTimer = undefined
  }

  if (import.meta.client) {
    document.removeEventListener('visibilitychange', handleSeatMapVisibilityChange)
  }
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

async function pollSeatMapVersion() {
  if (!import.meta.client || isSeatSelectionBlocked.value || document.hidden || isPollingSeatMapVersion) {
    return
  }

  isPollingSeatMapVersion = true
  try {
    const response = await apiRequest<ApiResponse<SessionSeatMapVersionResponse>>(apiRoutes.eventSessionSeatmapVersion(sessionPublicId.value))
    if (!response.success) {
      throw response
    }

    realtimeStatus.value = 'connected'

    if (response.data.version === currentSeatmapVersion.value) {
      return
    }

    if (isSubmitting.value || isCheckoutNavigationPending.value) {
      return
    }

    await refreshSeatMapSafely()
    currentSeatmapVersion.value = seatMap.value?.version ?? response.data.version
  }
  catch {
    if (!isSeatSelectionBlocked.value) {
      realtimeStatus.value = 'disconnected'
    }
  }
  finally {
    isPollingSeatMapVersion = false
  }
}

function handleSeatMapVisibilityChange() {
  if (document.hidden || isSeatSelectionBlocked.value) {
    return
  }

  realtimeStatus.value = 'connecting'
  void pollSeatMapVersion()
}

function startSeatMapRefresh() {
  if (!import.meta.client || seatMapVersionPollTimer) {
    return
  }

  realtimeStatus.value = 'connecting'
  document.addEventListener('visibilitychange', handleSeatMapVisibilityChange)
  void pollSeatMapVersion()
  seatMapVersionPollTimer = setInterval(() => {
    void pollSeatMapVersion()
  }, seatMapVersionPollIntervalMs)
}

function formatSeatLabel(seat: { sectionNameSnapshot: string, rowLabelSnapshot: string | null, seatLabelSnapshot: string }) {
  const rowLabel = seat.rowLabelSnapshot ? `${seat.rowLabelSnapshot}-` : ''

  return `${seat.sectionNameSnapshot} · ${rowLabel}${seat.seatLabelSnapshot}`
}

function setPreviewTicketItemRef(seatId: number, element: unknown) {
  if (element instanceof HTMLElement) {
    previewTicketItems.set(seatId, element)
    return
  }

  previewTicketItems.delete(seatId)
}

async function scrollToPreviewTicket(seatId: number) {
  await nextTick()
  previewTicketItems.get(seatId)?.scrollIntoView({
    block: 'nearest',
    behavior: 'smooth',
  })
}

function setSelectedTicketItemRef(seatId: number, element: unknown) {
  if (element instanceof HTMLElement) {
    selectedTicketItems.set(seatId, element)
    return
  }

  selectedTicketItems.delete(seatId)
}

async function scrollToSelectedTicket(seatId: number) {
  await nextTick()
  selectedTicketItems.get(seatId)?.scrollIntoView({
    block: 'nearest',
    behavior: 'smooth',
  })
}

function clearPreviewSeat(seatId: number) {
  previewSeatIds.value = previewSeatIds.value.filter(previewSeatId => previewSeatId !== seatId)
}

function clearAllPreviewSeats() {
  previewSeatIds.value = []
}

function confirmPreviewSeat(seatId: number) {
  const previewSeat = previewSeats.value.find(seat => seat.id === seatId)

  if (!previewSeat) {
    return
  }

  if (selectedSeatIds.value.includes(previewSeat.id)) {
    clearPreviewSeat(previewSeat.id)
    return
  }

  if (selectedSeatIds.value.length >= 10) {
    toast.error(t('seats.max_selection_error'))
    return
  }

  selectedSeatIds.value = [...selectedSeatIds.value, previewSeat.id]
  clearPreviewSeat(previewSeat.id)
}

function confirmAllPreviewSeats() {
  const previewSeatIdsToConfirm = previewSeats.value
    .filter(seat => !selectedSeatIds.value.includes(seat.id))
    .map(seat => seat.id)

  if (previewSeatIdsToConfirm.length === 0) {
    clearAllPreviewSeats()
    return
  }

  if (selectedSeatIds.value.length + previewSeatIdsToConfirm.length > 10) {
    toast.error(t('seats.max_selection_error'))
    return
  }

  selectedSeatIds.value = [...selectedSeatIds.value, ...previewSeatIdsToConfirm]
  clearAllPreviewSeats()
}

function removeSelectedSeat(seatId: number) {
  selectedSeatIds.value = selectedSeatIds.value.filter(id => id !== seatId)

  clearPreviewSeat(seatId)
}

function removeSectionSeats(seatIds: number[]) {
  const removeSet = new Set(seatIds)
  selectedSeatIds.value = selectedSeatIds.value.filter(id => !removeSet.has(id))
  previewSeatIds.value = previewSeatIds.value.filter(id => !removeSet.has(id))
}

function removeAllSelectedSeats() {
  selectedSeatIds.value = []
}

function toggleSeat(seatId: number) {
  if (selectedSeatIds.value.includes(seatId)) {
    void scrollToSelectedTicket(seatId)
    return
  }

  if (previewSeatIds.value.includes(seatId)) {
    clearPreviewSeat(seatId)
    return
  }

  if (selectedSeatIds.value.length + previewSeatIds.value.length >= 10) {
    toast.error(t('seats.max_selection_error'))
    return
  }

  previewSeatIds.value = [...previewSeatIds.value, seatId]
  void scrollToPreviewTicket(seatId)
}

async function reserveSeats() {
  if (!session.value || isSeatSelectionBlocked.value || selectedSeatIds.value.length === 0) {
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

    isCheckoutNavigationPending.value = true
    stopSeatMapRefresh()
    await navigateTo(`/checkout/${checkoutResponse.data.publicId}?hold=${holdPublicId}`)
  }
  catch (error) {
    isCheckoutNavigationPending.value = false
    const parsedError = parseApiError(error, t('seats.checkout_error'))

    const statusCode = parsedError.status
    const message = parsedError.message

    if (isSessionUnavailableError(parsedError)) {
      checkoutUnavailableError.value = parsedError
      toast.error(t('seats.session_unavailable_title'))
      return
    }

    if (parsedError.code === 'SELF_ATTENDEE_INCOMPLETE') {
      toast.error(parsedError.message)
      await navigateTo({
        path: '/attendees',
        query: {
          returnTo: route.fullPath,
          reason: 'complete-profile',
        },
      })
      return
    }

    if (statusCode === 409) {
      toast.error(t('seats.seats_conflict_error'))
      return
    }

    if (statusCode === 403) {
      if (parsedError.code === 'CAPTCHA_REQUIRED') {
        checkoutUnavailableError.value = parsedError
        toast.error(message)
        return
      }

      if (parsedError.code === 'QUEUE_REQUIRED' || !parsedError.code) {
        hasRedirectedToWaitingRoom.value = true
        toast.error(message)
        await navigateTo({
          path: `/waiting-room/${sessionPublicId.value}`,
          query: { slug: slug.value },
        })
        return
      }

      checkoutUnavailableError.value = parsedError
      return
    }

    toast.error(message)
    return
  }
  finally {
    isSubmitting.value = false
    if (!isCheckoutNavigationPending.value && !hasRedirectedToWaitingRoom.value && !isSeatSelectionBlocked.value) {
      await refreshSeatMapSafely()
    }
  }
}

watch(isSeatSelectionBlocked, (value) => {
  if (!value) {
    return
  }

  selectedSeatIds.value = []
  previewSeatIds.value = []
  realtimeStatus.value = 'disconnected'
  stopSeatMapRefresh()
}, { immediate: true })

watch(seatMap, (value) => {
  if (isSeatSelectionBlocked.value) {
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

  const selection = resolveSeatSelectionAfterRefresh({
    selectedSeatIds: selectedSeatIds.value,
    previewSeatIds: previewSeatIds.value,
    availableSeatIds,
    preserveUnavailableSelection: isSubmitting.value || isCheckoutNavigationPending.value,
  })

  if (selection.selectedSeatIds.length !== selectedSeatIds.value.length) {
    selectedSeatIds.value = selection.selectedSeatIds
  }

  if (selection.previewSeatIds.length !== previewSeatIds.value.length) {
    previewSeatIds.value = selection.previewSeatIds
  }

  if (selection.changed) {
    toast.error(t('seats.seats_taken_error'))
  }
}, { deep: true, immediate: true })

onMounted(() => {
  if (isSeatSelectionBlocked.value) {
    return
  }

  startSeatMapRefresh()
})

onUnmounted(() => {
  stopSeatMapRefresh()
})

definePageMeta({
  title: 'seats.page_title',
  breadcrumb: 'seats.breadcrumb',
  layout: 'empty',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="sessionUnavailableError || captchaAccessError"
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
        <EmptyTitle>{{ captchaAccessError ? $t('booking_captcha.blocked_title') : $t('seats.session_unavailable_title') }}</EmptyTitle>
        <EmptyDescription>
          {{ captchaAccessError ? $t('booking_captcha.blocked_desc') : $t('seats.session_unavailable_desc') }}
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent class="space-y-5">
        <div class="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {{ captchaAccessError ? $t('booking_captcha.blocked_hint') : $t('seats.session_unavailable_hint') }}
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <template v-if="captchaAccessError">
            <Button as-child>
              <NuxtLink :to="slug ? `/events/${slug}` : '/events'">
                <ArrowLeft class="size-4" />
                {{ $t('booking_captcha.back_to_event') }}
              </NuxtLink>
            </Button>
            <Button
              as-child
              variant="outline"
            >
              <NuxtLink to="/events">
                {{ $t('booking_captcha.browse_events') }}
              </NuxtLink>
            </Button>
          </template>
          <template v-else>
            <Button as-child>
              <NuxtLink to="/events">
                <ArrowLeft class="size-4" />
                {{ $t('booking_captcha.browse_events') }}
              </NuxtLink>
            </Button>
            <Button
              as-child
              variant="outline"
            >
              <NuxtLink to="/">
                {{ $t('common.go_home') }}
              </NuxtLink>
            </Button>
          </template>
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
      <Card class="flex min-h-0 flex-col overflow-hidden py-0">
        <CardContent class="min-h-0 flex-1 overflow-hidden [&>section]:flex [&>section]:h-full [&>section]:min-h-0 [&>section]:flex-col [&_[data-slot=scroll-area]]:min-h-0">
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
        </CardContent>
      </Card>

      <Card class="flex min-h-0 overflow-hidden pt-0 gap-0!">
        <CardContent class="flex min-h-0 flex-1 flex-col gap-4 !p-0">
          <ScrollArea class="min-h-0 flex-1 px-4 py-4 md:px-5">
            <div class="space-y-5 pb-2">
              <section
                v-if="previewSeats.length > 0"
                class="scroll-mt-4"
              >
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium uppercase tracking-[0.22em] text-primary">
                      {{ $t('seats.preview_tickets') }}
                    </p>
                  </div>
                  <div class="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      class="text-muted-foreground hover:text-destructive"
                      :title="$t('seats.cancel_preview')"
                      :aria-label="$t('seats.cancel_all_preview_seats')"
                      @click="clearAllPreviewSeats"
                    >
                      <XCircle class="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      class="text-primary"
                      :title="$t('seats.confirm_preview_seats')"
                      :aria-label="$t('seats.confirm_all_preview_seats')"
                      @click="confirmAllPreviewSeats"
                    >
                      <CheckCircle2 class="size-4" />
                    </Button>
                    <span class="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <Sparkles class="size-3.5" />
                      {{ $t('seats.new_preview_count', { count: previewSeats.length }) }}
                    </span>
                  </div>
                </div>

                <ItemGroup class="gap-3">
                  <div
                    v-for="previewSeat in previewSeats"
                    :key="previewSeat.id"
                    :ref="element => setPreviewTicketItemRef(previewSeat.id, element)"
                  >
                    <Item
                      class="relative isolate overflow-hidden border-dashed border-primary/40 bg-gradient-to-br from-primary/15 via-background to-background shadow-[0_18px_60px_-36px_hsl(var(--primary))]"
                    >
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
                          {{ formatPreferredCurrency(previewSeat.priceCents, previewSeat.currency, getDisplayDateLocale(locale)) }}
                        </p>
                        <p class="text-xs text-muted-foreground">
                          {{ $t('seats.expected_add_on') }}
                        </p>
                      </div>
                      <ItemActions class="relative w-full justify-end sm:w-auto">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          @click="clearPreviewSeat(previewSeat.id)"
                        >
                          {{ $t('common.cancel') }}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          @click="confirmPreviewSeat(previewSeat.id)"
                        >
                          <CheckCircle2 class="size-4" />
                          {{ $t('seats.confirm') }}
                        </Button>
                      </ItemActions>
                    </Item>
                  </div>
                </ItemGroup>
              </section>

              <section v-if="selectedSeats.length > 0">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {{ $t('seats.confirmed_tickets') }}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    class="text-muted-foreground hover:text-destructive"
                    :title="$t('seats.remove_all_confirmed_seats')"
                    :aria-label="$t('seats.remove_all_confirmed_seats')"
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
                        :title="$t('seats.remove_all_seats_in_section', { section: group.name })"
                        :aria-label="$t('seats.remove_all_seats_in_section', { section: group.name })"
                        @click="removeSectionSeats(group.seats.map(s => s.id))"
                      >
                        <Trash2 class="size-3.5" />
                      </Button>
                    </div>

                    <ItemGroup class="gap-2.5">
                      <div
                        v-for="seat in group.seats"
                        :key="seat.id"
                        :ref="element => setSelectedTicketItemRef(seat.id, element)"
                      >
                        <Item
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
                              {{ formatPreferredCurrency(seat.priceCents, seat.currency, getDisplayDateLocale(locale)) }}
                            </p>
                          </div>
                          <ItemActions class="w-full justify-end sm:w-auto">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              class="text-muted-foreground hover:text-destructive"
                              :aria-label="$t('seats.remove_seat', { seat: formatSeatLabel(seat) })"
                              @click="removeSelectedSeat(seat.id)"
                            >
                              <Trash2 class="size-4" />
                            </Button>
                          </ItemActions>
                        </Item>
                      </div>
                    </ItemGroup>
                  </div>
                </div>
              </section>

              <Empty
                v-if="previewSeats.length === 0 && selectedSeats.length === 0"
              >
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <TicketPlus />
                  </EmptyMedia>
                  <EmptyTitle>{{ $t('seats.pick_seats_prompt') }}</EmptyTitle>
                  <EmptyDescription>
                    {{ $t('seats.preview_ticket_prompt') }}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent />
              </Empty>
            </div>
          </ScrollArea>

          <CardFooter class="flex items-end justify-between gap-3">
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
              <CashAppIcon class="size-4" />
            </Button>
          </CardFooter>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
