<script setup lang="ts">
import { AlertTriangle, CalendarDays, CircleSlash, RotateCcw, SaveIcon, Settings2, Ticket } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import type { EventSession } from '#shared/db'
import AdminDashboardKpiCard from '@/components/admin/dashboard/AdminDashboardKpiCard.vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatCurrency } from '@/lib/utils'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { eventPricingFormSchema, getEventSessionTimingIssues } from '#shared/schemas/ticketingSchema'
import type { EventPricingFormInput } from '#shared/schemas/ticketingSchema'
import type { ApiResponse } from '~~/types/api'
import type { AdminEventWorkspaceDetail, AdminEventWorkspaceSeat, AdminEventWorkspaceSession, AdminSessionSeatOverride } from '~~/types/admin-events'
import type { SeatMapSeat } from '~~/types/seatmap'
import { EventStatus, PricingMode, SeatPricingSource, SeatStatus } from '#shared/commonEnums'

const route = useRoute()
const { t, locale } = useI18n()
const eventId = computed(() => Number(route.params.id))
const isSaving = ref(false)
const selectedStatus = ref<'all' | SeatStatus>('all')
const selectedSeatIds = ref<number[]>([])
const customPriceInput = ref('')
const isSavingOverride = ref(false)
const sessionValidationErrors = ref<Record<string, string>>({})
const syncDialogOpen = ref(false)
const syncDialogSessionId = ref<number | null>(null)

type VenueSection = NonNullable<NonNullable<AdminEventWorkspaceDetail['venue']>['sections']>[number]
type SessionSectionPrice = EventPricingFormInput['sessions'][number]['sectionPrices'][number]
type SessionPricingSource = {
  pricingMode: EventPricingFormInput['sessions'][number]['pricingMode']
  currency: string
  sectionPrices: SessionSectionPrice[]
}

const { detail, dashboard, refreshAll, fetchVenueLayoutSyncPreview, applyVenueLayoutSync } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: false,
})

const eventTitle = computed(() => detail.value?.event.title ?? null)
const pageTitle = computed(() => eventTitle.value ? `${eventTitle.value} · ${t('admin.event_pricing_title')}` : t('admin.event_pricing_title'))
const pageDescription = computed(() => t('admin.event_pricing_description'))

useSeo({ title: pageTitle, description: pageDescription, type: 'website' })

usePageBreadcrumbs(computed(() => {
  if (!detail.value || detail.value.event.id !== eventId.value) return undefined
  return [
    { title: t('home.breadcrumb'), href: '/' },
    { title: t('admin.dashboard_breadcrumb'), href: '/admin' },
    { title: t('nav.events'), href: '/admin/events' },
    { title: eventTitle.value ?? t('admin.event_dashboard_breadcrumb'), href: `/admin/events/${eventId.value}` },
    { title: t('admin.event_pricing_breadcrumb'), href: route.path },
  ]
}))

const defaultValues: EventPricingFormInput = {
  sessions: [],
}

const { handleSubmit, meta, resetForm, setFieldValue, values } = useForm({
  initialValues: { ...defaultValues },
  validationSchema: eventPricingFormSchema,
})

const shouldResetPricingFormFromDetail = ref(false)

function toDateTimeLocal(value: string | Date | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function normalizeSectionPricesForVenue(session: SessionPricingSource, venueSections: VenueSection[]): SessionSectionPrice[] {
  return venueSections.map((section, index) => {
    const matchedPrice = session.sectionPrices.find(sectionPrice => sectionPrice.venueSectionId === section.id)

    return {
      venueSectionId: section.id,
      priceCents: matchedPrice?.priceCents ?? 0,
      currency: matchedPrice?.currency ?? session.currency,
      sortOrder: index,
    }
  })
}

function resetPricingFormFromDetail(value: AdminEventWorkspaceDetail) {
  resetForm({
    values: {
      sessions: value.sessions.map(s => ({
        id: s.id,
        publicId: s.publicId,
        label: s.label,
        venueId: s.venueId,
        status: s.status,
        queueEnabled: s.queueEnabled,
        startsAt: toDateTimeLocal(s.startsAt),
        endsAt: toDateTimeLocal(s.endsAt),
        salesStartAt: toDateTimeLocal(s.salesStartAt),
        salesEndAt: toDateTimeLocal(s.salesEndAt),
        pricingMode: s.pricingMode,
        currency: s.currency,
        sectionPrices: normalizeSectionPricesForVenue(s, value.venue?.sections ?? []),
        seatOverrides: s.seatOverrides.map(seatOverride => ({
          venueSeatId: seatOverride.venueSeatId,
          venueSectionId: seatOverride.venueSectionId,
          priceCents: seatOverride.priceCents,
          currency: seatOverride.currency,
          isDisabled: seatOverride.isDisabled,
        })),
      })),
    },
  })
}

watch(detail, (value) => {
  if (!value?.sessions) return
  if (meta.value.dirty && !shouldResetPricingFormFromDetail.value) return

  resetPricingFormFromDetail(value)
  shouldResetPricingFormFromDetail.value = false
}, { immediate: true })

const isLockedConfiguration = computed(() => detail.value?.event?.status !== EventStatus.Draft)
const staleSessions = computed(() => detail.value?.sessions.filter(session => session.venueSyncStatus === 'stale') ?? [])
const hasStaleSessions = computed(() => staleSessions.value.length > 0)
const editableStateLabel = computed(() => isLockedConfiguration.value ? t('admin_event_pricing.locked_label') : t('admin_event_pricing.editable_label'))
const editableStateDescription = computed(() => isLockedConfiguration.value ? t('admin_event_pricing.locked_desc') : t('admin_event_pricing.editable_desc'))
const currentSession = computed(() => {
  const currentDetail = detail.value
  if (!currentDetail) {
    return null
  }

  return currentDetail.sessions.find(session => session.id === currentDetail.primarySessionId) ?? currentDetail.sessions[0] ?? null
})
const selectedSyncSession = computed(() => {
  const sessionId = syncDialogSessionId.value
  if (!detail.value || sessionId === null) {
    return null
  }

  return detail.value.sessions.find(session => session.id === sessionId) ?? null
})

function getEventStatusLabel(status: EventStatus) {
  switch (status) {
    case EventStatus.Draft:
      return t('event_card.status_draft')
    case EventStatus.Published:
      return t('event_card.status_published')
    case EventStatus.OnSale:
      return t('event_card.status_on_sale')
    case EventStatus.SoldOut:
      return t('event_card.status_sold_out')
    case EventStatus.Ended:
      return t('event_card.status_ended')
    case EventStatus.Cancelled:
      return t('event_card.status_cancelled')
  }
}

function normalizeSessionErrorPath(path: string) {
  return path.replace(/\[(\d+)\]/g, '.$1')
}

function buildSessionValidationErrors(sessions: EventPricingFormInput['sessions']) {
  const result = eventPricingFormSchema.safeParse({ sessions })
  const errors: Record<string, string> = {}
  if (!result.success) {
    for (const issue of result.error.issues) {
      const normalizedPath = normalizeSessionErrorPath(issue.path.join('.'))
      if (normalizedPath.startsWith('sessions')) {
        errors[normalizedPath] = t(issue.message)
      }
    }
  }

  sessions.forEach((session, sessionIndex) => {
    const sessionLabel = session.label?.trim() || t('admin_event_pricing.session_fallback', { count: sessionIndex + 1 })
    for (const issue of getEventSessionTimingIssues(session, sessionLabel)) {
      errors[`sessions.${sessionIndex}.${issue.field}`] = t(issue.message)
    }
  })

  return errors
}

function getFirstValidationError(errors: Record<string, string>) {
  return Object.values(errors)[0] || t('admin_event_pricing.fix_highlighted_fields')
}

function validateSessions(sessions: EventPricingFormInput['sessions']) {
  const errors = buildSessionValidationErrors(sessions)
  if (Object.keys(errors).length) {
    sessionValidationErrors.value = errors
    toast.error(getFirstValidationError(errors))
    return false
  }

  return true
}

function openVenueSync(session: AdminEventWorkspaceSession | null) {
  if (!session) {
    return
  }

  syncDialogSessionId.value = session.id
  syncDialogOpen.value = true
}

async function handleVenueSyncApplied() {
  toast.success(t('admin_event_sync.synced'))
  sessionValidationErrors.value = {}
  shouldResetPricingFormFromDetail.value = true
  await refreshAll()
}

function updateSessions(sessions: EventPricingFormInput['sessions']) {
  setFieldValue('sessions', sessions)
  if (Object.keys(sessionValidationErrors.value).length) {
    sessionValidationErrors.value = buildSessionValidationErrors(sessions)
  }
}

function isSeatMapStatus(status: string): status is SeatStatus {
  return status === SeatStatus.Available || status === SeatStatus.Locked || status === SeatStatus.Sold || status === SeatStatus.Unavailable
}

function getSectionPrice(venueSectionId: number | null | undefined) {
  if (typeof venueSectionId !== 'number') {
    return null
  }

  return currentSession.value?.sectionPrices.find(sectionPrice => sectionPrice.venueSectionId === venueSectionId) ?? null
}

function getEffectiveSeat(seat: AdminEventWorkspaceSeat): AdminEventWorkspaceSeat & SeatMapSeat {
  const sectionPrice = getSectionPrice(seat.venueSectionId)
  const override = currentSession.value?.seatOverrides.find(seatOverride => seatOverride.venueSeatId === seat.venueSeatId) ?? null
  const inheritedPriceCents = sectionPrice?.priceCents ?? seat.priceCents
  const inheritedCurrency = sectionPrice?.currency ?? seat.currency
  const customPriceCents = typeof override?.priceCents === 'number' ? override.priceCents : null
  const status: SeatStatus = override?.isDisabled ? SeatStatus.Unavailable : isSeatMapStatus(seat.status) ? seat.status : SeatStatus.Unavailable
  const pricingSource: SeatMapSeat['pricingSource'] = customPriceCents !== null ? SeatPricingSource.SeatOverride : SeatPricingSource.Section

  return {
    ...seat,
    status,
    priceCents: customPriceCents ?? inheritedPriceCents,
    currency: customPriceCents !== null ? override?.currency ?? inheritedCurrency : inheritedCurrency,
    pricingSource,
  }
}

const currentSeats = computed(() => currentSession.value?.seats?.map(seat => getEffectiveSeat(seat)) ?? [])
const filteredSeats = computed(() => currentSeats.value.filter(seat => selectedStatus.value === 'all' || seat.status === selectedStatus.value))
const statusFilterOptions = computed(() => [
  { value: 'all', label: t('admin_event_seatmap.all_statuses') },
  { value: SeatStatus.Available, label: t('admin_event_seatmap.available') },
  { value: SeatStatus.Locked, label: t('admin_event_seatmap.held') },
  { value: SeatStatus.Sold, label: t('admin_event_seatmap.sold') },
  { value: SeatStatus.Unavailable, label: t('admin_event_seatmap.unavailable') },
])

function parsePriceInputValue(value: string) {
  const price = Number(value)
  if (!Number.isFinite(price) || price < 0) {
    return null
  }

  return Math.round(price * 100)
}

function getSeatOverride(seat: AdminEventWorkspaceSeat) {
  return currentSession.value?.seatOverrides.find(override => override.venueSeatId === seat.venueSeatId) ?? null
}

const selectedSeats = computed(() => currentSeats.value.filter(seat => selectedSeatIds.value.includes(seat.id)))
const selectedSeatPreview = computed(() => selectedSeats.value.slice(0, 4))
const selectedSeatExtraCount = computed(() => Math.max(selectedSeats.value.length - selectedSeatPreview.value.length, 0))
const areOverrideActionsDisabled = computed(() => selectedSeats.value.length === 0 || isSavingOverride.value || currentSession.value?.status !== EventStatus.Draft || currentSession.value?.venueSyncStatus === 'stale')
const overrideDisabledMessage = computed(() => {
  if (isSavingOverride.value) return t('admin_event_seatmap.override_disabled_saving')
  if (currentSession.value?.venueSyncStatus === 'stale') return t('admin_event_seatmap.override_disabled_stale')
  if (currentSession.value?.status !== EventStatus.Draft) return t('admin_event_seatmap.override_disabled_locked')
  return ''
})

function getSeatLocationLabel(seat: AdminEventWorkspaceSeat & SeatMapSeat) {
  const section = seat.sectionNameSnapshot || t('admin_event_seatmap.unknown_section')
  const seatLabel = seat.seatLabelSnapshot || String(seat.id)

  if (seat.rowLabelSnapshot) {
    return t('admin_event_seatmap.seat_location_with_row', { section, row: seat.rowLabelSnapshot, seat: seatLabel })
  }

  return t('admin_event_seatmap.seat_location_without_row', { section, seat: seatLabel })
}

function toggleSeat(seatId: number) {
  selectedSeatIds.value = selectedSeatIds.value.includes(seatId) ? selectedSeatIds.value.filter(selectedSeatId => selectedSeatId !== seatId) : [...selectedSeatIds.value, seatId]
}

function buildOverridePayload(updatedOverrides: AdminSessionSeatOverride[]) {
  return updatedOverrides.map(override => ({
    venueSeatId: override.venueSeatId,
    venueSectionId: override.venueSectionId,
    priceCents: override.priceCents,
    currency: override.currency,
    isDisabled: override.isDisabled,
  }))
}

function mergeOverrides(seats: AdminEventWorkspaceSeat[], updateSeat: (seat: AdminEventWorkspaceSeat, current: AdminSessionSeatOverride | null) => AdminSessionSeatOverride | null) {
  const session = currentSession.value
  if (!session) return []

  const overrideBySeatId = new Map(session.seatOverrides.map(override => [override.venueSeatId, override]))
  for (const seat of seats) {
    if (typeof seat.venueSeatId !== 'number' || typeof seat.venueSectionId !== 'number') continue
    const nextOverride = updateSeat(seat, getSeatOverride(seat))
    if (nextOverride) overrideBySeatId.set(seat.venueSeatId, nextOverride)
    else overrideBySeatId.delete(seat.venueSeatId)
  }

  return Array.from(overrideBySeatId.values())
}

async function saveSeatOverrides(overrides: AdminSessionSeatOverride[]) {
  const session = currentSession.value
  if (!session) return

  isSavingOverride.value = true
  try {
    const response = await apiRequest<ApiResponse<EventSession | undefined>>(apiRoutes.adminEventSessionSeatOverrides(eventId.value, session.id), {
      method: 'PUT',
      body: { seatOverrides: buildOverridePayload(overrides) },
    })
    if (!response.success) throw response

    toast.success(t('admin_event_seatmap.overrides_updated'))
    selectedSeatIds.value = []
    customPriceInput.value = ''
    await refreshAll()
  }
  catch (err) {
    toast.error(parseApiError(err, t('admin_event_seatmap.overrides_update_failed')).message)
  }
  finally {
    isSavingOverride.value = false
  }
}

async function setCustomPrice() {
  const priceCents = parsePriceInputValue(customPriceInput.value)
  if (priceCents === null) {
    toast.error(t('admin_event_seatmap.invalid_custom_price'))
    return
  }

  const overrides = mergeOverrides(selectedSeats.value, (seat) => {
    if (typeof seat.venueSeatId !== 'number' || typeof seat.venueSectionId !== 'number') return null
    return { venueSeatId: seat.venueSeatId, venueSectionId: seat.venueSectionId, priceCents, currency: currentSession.value?.currency ?? 'VND', isDisabled: false }
  })
  await saveSeatOverrides(overrides)
}

async function disableSelectedSeats() {
  const overrides = mergeOverrides(selectedSeats.value, (seat) => {
    if (typeof seat.venueSeatId !== 'number' || typeof seat.venueSectionId !== 'number') return null
    return { venueSeatId: seat.venueSeatId, venueSectionId: seat.venueSectionId, priceCents: null, currency: null, isDisabled: true }
  })
  await saveSeatOverrides(overrides)
}

async function resetSelectedOverrides() {
  const overrides = mergeOverrides(selectedSeats.value, () => null)
  await saveSeatOverrides(overrides)
}

function buildPricingPayload(session: EventPricingFormInput['sessions'][number]) {
  if (session.pricingMode === PricingMode.Uniform) {
    return {
      pricingMode: session.pricingMode,
      currency: session.currency,
      priceCents: session.sectionPrices[0]?.priceCents ?? 0,
    }
  }

  const sectionPrices = normalizeSectionPricesForVenue(session, detail.value?.venue?.sections ?? [])

  return {
    pricingMode: session.pricingMode,
    currency: session.currency,
    sectionPrices: sectionPrices.map((sectionPrice, sectionIndex) => ({
      venueSectionId: sectionPrice.venueSectionId,
      priceCents: sectionPrice.priceCents,
      currency: sectionPrice.currency || session.currency,
      sortOrder: sectionIndex,
    })),
  }
}

const onSubmit = handleSubmit(
  async (formValues) => {
    sessionValidationErrors.value = {}
    if (hasStaleSessions.value) {
      toast.error(t('admin_event_sync.pricing_stale_desc'))
      return
    }

    if (!validateSessions(formValues.sessions)) {
      return
    }

    isSaving.value = true

    try {
      for (const session of formValues.sessions) {
        if (!session.id) {
          continue
        }

        const response = await apiRequest<ApiResponse<EventSession | undefined>>(apiRoutes.adminEventSessionPricing(eventId.value, session.id), {
          method: 'PUT',
          body: buildPricingPayload(session),
        })
        if (!response.success) throw response
      }

      toast.success(t('admin_event_pricing.updated'))
      shouldResetPricingFormFromDetail.value = true
      await refreshAll()
    }
    catch (err) {
      toast.error(parseApiError(err, t('admin_event_pricing.update_failed')).message)
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    const sessionErrors: Record<string, string> = {}
    for (const [path, message] of Object.entries(errors)) {
      if (path.startsWith('sessions') && message) {
        sessionErrors[normalizeSessionErrorPath(path)] = String(message)
      }
    }

    sessionValidationErrors.value = sessionErrors
    const firstError = Object.values(sessionErrors)[0] || Object.values(errors).flat().filter(Boolean)[0] || t('admin_event_pricing.fix_highlighted_fields')
    toast.error(String(firstError))
  },
)

definePageMeta({
  title: 'admin.event_pricing_title',
  breadcrumb: 'admin.event_pricing_breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div
    v-if="detail && dashboard"
    class="space-y-6"
  >
    <AdminEventsAdminEventNav :event-id="eventId" />

    <Alert
      v-if="currentSession?.venueSyncStatus === 'stale'"
      variant="destructive"
    >
      <AlertTitle>{{ $t('admin_event_sync.seatmap_stale_title') }}</AlertTitle>
      <AlertDescription class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{{ $t('admin_event_sync.seatmap_stale_desc') }}</span>
        <Button
          size="sm"
          variant="secondary"
          class="w-fit"
          @click="openVenueSync(currentSession)"
        >
          {{ $t('admin_event_sync.sync_button') }}
        </Button>
      </AlertDescription>
    </Alert>

    <Card class="shadow-none py-0">
      <CardContent class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0 space-y-1">
          <Label for="seat-status-filter">{{ $t('admin_event_seatmap.status_filter_label') }}</Label>
          <p class="text-xs text-muted-foreground">
            {{ $t('admin_event_seatmap.status_filter_desc') }}
          </p>
        </div>
        <Select v-model="selectedStatus">
          <SelectTrigger id="seat-status-filter" class="h-9 w-full sm:w-[12rem]">
            <SelectValue :placeholder="$t('admin_event_seatmap.filter_placeholder')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="option in statusFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>

    <TicketEventSeatMapExperience
      class="min-h-[32rem]"
      :seats="filteredSeats"
      :ticket-types="[]"
      :section-prices="currentSession?.sectionPrices ?? []"
      :seat-overrides="currentSession?.seatOverrides ?? []"
      :selected-seat-ids="selectedSeatIds"
      :action-label="null"
      interactive
      mode="admin"
      @toggle="toggleSeat"
    />

    <AnimatePresence>
      <motion.div
        v-if="selectedSeats.length > 0"
        :initial="{ opacity: 0, y: 28, scale: 0.98 }"
        :animate="{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } }"
        :exit="{ opacity: 0, y: 28, scale: 0.98, transition: { duration: 0.18 } }"
        class="pointer-events-none fixed inset-x-0 bottom-4 z-40 px-4"
      >
        <div class="pointer-events-auto mx-auto flex max-w-4xl flex-col gap-3 rounded-[1.5rem] border border-border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Alert v-if="areOverrideActionsDisabled && overrideDisabledMessage" variant="destructive" class="w-full self-stretch py-2">
            <AlertDescription class="text-xs leading-5">
              {{ overrideDisabledMessage }}
            </AlertDescription>
          </Alert>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 flex-1 flex-col gap-2">
              <div class="flex items-center gap-2">
                <Ticket class="size-4 shrink-0 text-primary" />
                <p class="text-sm font-medium text-foreground">
                  {{ $t('admin_event_seatmap.override_actions_title') }} · {{ selectedSeats.length }} {{ $t('admin_event_seatmap.selected_seats_label') }}
                </p>
              </div>
              <div class="flex min-w-0 flex-wrap gap-1.5">
                <Badge v-for="seat in selectedSeatPreview" :key="seat.id" variant="outline" class="max-w-[12rem] truncate rounded-full font-normal">
                  {{ getSeatLocationLabel(seat) }}
                </Badge>
                <Badge v-if="selectedSeatExtraCount > 0" variant="secondary" class="rounded-full">
                  {{ $t('admin_event_seatmap.selected_context_more', { count: selectedSeatExtraCount }) }}
                </Badge>
              </div>
            </div>
            <div class="flex w-full flex-wrap items-end justify-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
              <div class="flex min-w-[8rem] flex-1 flex-col gap-1 sm:w-40 sm:flex-none">
                <Label for="custom-seat-price" class="text-xs">
                  {{ $t('admin_event_seatmap.custom_price') }}
                </Label>
                <Input
                  id="custom-seat-price"
                  v-model="customPriceInput"
                  inputmode="decimal"
                  class="h-9"
                  :placeholder="formatCurrency(50000000, 'VND', getDisplayDateLocale(locale))"
                  :disabled="areOverrideActionsDisabled"
                />
              </div>
              <Button size="icon" :title="$t('admin_event_seatmap.set_custom_price')" :aria-label="$t('admin_event_seatmap.set_custom_price')" :disabled="areOverrideActionsDisabled" @click="setCustomPrice">
                <SaveIcon class="size-4" />
              </Button>
              <Button size="icon" variant="secondary" :title="$t('admin_event_seatmap.disable_seat')" :aria-label="$t('admin_event_seatmap.disable_seat')" :disabled="areOverrideActionsDisabled" @click="disableSelectedSeats">
                <CircleSlash class="size-4" />
              </Button>
              <Button size="icon" variant="outline" :title="$t('admin_event_seatmap.reset_override')" :aria-label="$t('admin_event_seatmap.reset_override')" :disabled="areOverrideActionsDisabled" @click="resetSelectedOverrides">
                <RotateCcw class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>

    <Card
      class="overflow-hidden shadow-none pt-0"
    >
      <CardHeader class="border-b bg-muted/20 py-6!">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>{{ $t('admin_event_pricing.title') }}</CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ $t('admin_event_pricing.desc') }}
            </p>
          </div>
          <Badge
            variant="outline"
            class="w-fit capitalize"
          >
            {{ getEventStatusLabel(detail.event.status) }}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form
          class="flex flex-col gap-6"
          @submit.prevent="onSubmit"
        >
          <Alert
            v-if="isLockedConfiguration"
            variant="destructive"
          >
            <AlertTitle>{{ $t('admin_event_pricing.read_only_title') }}</AlertTitle>
            <AlertDescription>
              {{ $t('admin_event_pricing.read_only_desc') }}
            </AlertDescription>
          </Alert>

          <Alert
            v-if="hasStaleSessions"
            variant="destructive"
          >
            <AlertTitle>{{ $t('admin_event_sync.pricing_stale_title') }}</AlertTitle>
            <AlertDescription class="mt-2 flex flex-col gap-3">
              <p>{{ $t('admin_event_sync.pricing_stale_desc') }}</p>
              <div class="flex flex-col gap-2">
                <div
                  v-for="session in staleSessions"
                  :key="session.id"
                  class="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span class="text-sm font-medium text-foreground">
                    {{ $t('admin_event_sync.pricing_stale_session', { session: session.label }) }}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    class="w-fit"
                    @click="openVenueSync(session)"
                  >
                    {{ $t('admin_event_sync.sync_button') }}
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <AdminEventsAdminEventSessionEditor
            :model-value="values.sessions || []"
            :venue-sections="detail.venue?.sections ?? []"
            :locked="isLockedConfiguration"
            :default-venue-id="detail.event.venueId"
            :validation-errors="sessionValidationErrors"
            @update:model-value="updateSessions"
          />

          <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted-foreground">
              {{ $t('admin_event_pricing.changes_note') }}
            </p>
            <Button
              type="submit"
              :disabled="isLockedConfiguration || hasStaleSessions || isSaving"
              :is-loading="isSaving"
            >
              <SaveIcon class="size-4" />
              {{ $t('admin_event_pricing.save_changes') }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <AdminEventsAdminVenueLayoutSyncDialog
      v-model:open="syncDialogOpen"
      :session-id="syncDialogSessionId"
      :session-label="selectedSyncSession?.label"
      :load-preview="fetchVenueLayoutSyncPreview"
      :apply-sync="applyVenueLayoutSync"
      @applied="handleVenueSyncApplied"
    />
  </div>
</template>
