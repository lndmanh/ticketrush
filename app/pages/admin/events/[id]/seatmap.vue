<script setup lang="ts">
import { CircleSlash, RotateCcw, SaveIcon } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { EventSession } from '#shared/db'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatCurrency } from '@/lib/utils'
import { apiRoutes } from '#shared/apiRoutes'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import type { ApiResponse } from '~~/types/api'
import type { AdminEventWorkspaceSeat, AdminEventWorkspaceSession, AdminSessionSeatOverride } from '~~/types/admin-events'
import type { SeatMapSeat, SeatMapStatus } from '~~/types/seatmap'
import { EventStatus, SeatPricingSource, SeatStatus } from '#shared/commonEnums'

const { t, locale } = useI18n()

const route = useRoute()
const eventId = computed(() => Number(route.params.id))
const selectedStatus = ref<'all' | SeatStatus>('all')
const selectedSeatIds = ref<number[]>([])
const customPriceInput = ref('')
const isSavingOverride = ref(false)
const syncDialogOpen = ref(false)
const syncDialogSessionId = ref<number | null>(null)

const { detail, dashboard, refreshAll, fetchVenueLayoutSyncPreview, applyVenueLayoutSync } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: false,
})

const eventTitle = computed(() => detail.value?.event.title ?? null)
const pageTitle = computed(() => eventTitle.value ? `${eventTitle.value} · ${t('admin.event_seatmap_title')}` : t('admin.event_seatmap_title'))
const pageDescription = computed(() => t('admin.event_seatmap_description'))

useSeo({ title: pageTitle, description: pageDescription, type: 'website' })

usePageBreadcrumbs(computed(() => {
  if (!detail.value || detail.value.event.id !== eventId.value) return undefined
  return [
    { title: t('home.breadcrumb'), href: '/' },
    { title: t('admin.dashboard_breadcrumb'), href: '/admin' },
    { title: t('nav.events'), href: '/admin/events' },
    { title: eventTitle.value ?? t('admin.event_dashboard_breadcrumb'), href: `/admin/events/${eventId.value}` },
    { title: t('admin.event_seatmap_breadcrumb'), href: route.path },
  ]
}))

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

function isSeatMapStatus(status: string): status is SeatMapStatus {
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
  const status: SeatMapStatus = override?.isDisabled ? SeatStatus.Unavailable : isSeatMapStatus(seat.status) ? seat.status : SeatStatus.Unavailable
  const pricingSource: SeatMapSeat['pricingSource'] = customPriceCents !== null ? SeatPricingSource.SeatOverride : SeatPricingSource.Section

  return {
    ...seat,
    status,
    priceCents: customPriceCents ?? inheritedPriceCents,
    currency: customPriceCents !== null ? override?.currency ?? inheritedCurrency : inheritedCurrency,
    pricingSource,
  }
}

const currentSeats = computed(() => {
  return currentSession.value?.seats?.map(seat => getEffectiveSeat(seat)) ?? []
})

const filteredSeats = computed(() => {
  return currentSeats.value.filter((seat) => {
    return selectedStatus.value === 'all' || seat.status === selectedStatus.value
  })
})

function parsePriceInputValue(value: string) {
  const price = Number(value)
  if (!Number.isFinite(price) || price < 0) {
    return null
  }

  return Math.round(price * 100)
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
  await refreshAll()
}

function getSeatOverride(seat: AdminEventWorkspaceSeat) {
  return currentSession.value?.seatOverrides.find(override => override.venueSeatId === seat.venueSeatId) ?? null
}

const selectedSeats = computed(() => currentSeats.value.filter(seat => selectedSeatIds.value.includes(seat.id)))
const areOverrideActionsDisabled = computed(() => selectedSeats.value.length === 0 || isSavingOverride.value || currentSession.value?.status !== EventStatus.Draft || currentSession.value?.venueSyncStatus === 'stale')

function toggleSeat(seatId: number) {
  selectedSeatIds.value = selectedSeatIds.value.includes(seatId)
    ? selectedSeatIds.value.filter(selectedSeatId => selectedSeatId !== seatId)
    : [...selectedSeatIds.value, seatId]
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
  if (!session) {
    return []
  }

  const overrideBySeatId = new Map(session.seatOverrides.map(override => [override.venueSeatId, override]))
  for (const seat of seats) {
    if (typeof seat.venueSeatId !== 'number' || typeof seat.venueSectionId !== 'number') {
      continue
    }

    const nextOverride = updateSeat(seat, getSeatOverride(seat))
    if (nextOverride) {
      overrideBySeatId.set(seat.venueSeatId, nextOverride)
    }
    else {
      overrideBySeatId.delete(seat.venueSeatId)
    }
  }

  return Array.from(overrideBySeatId.values())
}

async function saveSeatOverrides(overrides: AdminSessionSeatOverride[]) {
  const session = currentSession.value
  if (!session) {
    return
  }

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
    if (typeof seat.venueSeatId !== 'number' || typeof seat.venueSectionId !== 'number') {
      return null
    }

    return {
      venueSeatId: seat.venueSeatId,
      venueSectionId: seat.venueSectionId,
      priceCents,
      currency: currentSession.value?.currency ?? 'VND',
      isDisabled: false,
    }
  })
  await saveSeatOverrides(overrides)
}

async function disableSelectedSeats() {
  const overrides = mergeOverrides(selectedSeats.value, (seat) => {
    if (typeof seat.venueSeatId !== 'number' || typeof seat.venueSectionId !== 'number') {
      return null
    }

    return {
      venueSeatId: seat.venueSeatId,
      venueSectionId: seat.venueSectionId,
      priceCents: null,
      currency: null,
      isDisabled: true,
    }
  })
  await saveSeatOverrides(overrides)
}

async function resetSelectedOverrides() {
  const overrides = mergeOverrides(selectedSeats.value, () => null)
  await saveSeatOverrides(overrides)
}

definePageMeta({
  title: 'admin.event_seatmap_title',
  breadcrumb: 'admin.event_seatmap_breadcrumb',
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

    <TicketEventSeatMapExperience
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

    <Card class="overflow-hidden shadow-none">
      <CardHeader class="border-b bg-muted/20">
        <CardTitle>{{ $t('admin_event_seatmap.override_actions_title') }}</CardTitle>
        <CardDescription>
          {{ $t('admin_event_seatmap.override_actions_desc', { count: selectedSeats.length }) }}
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div class="space-y-2">
          <Label for="custom-seat-price">{{ $t('admin_event_seatmap.custom_price') }}</Label>
          <Input
            id="custom-seat-price"
            v-model="customPriceInput"
            inputmode="decimal"
            :placeholder="formatCurrency(50000000, 'VND', getDisplayDateLocale(locale))"
            :disabled="areOverrideActionsDisabled"
          />
          <p class="text-xs text-muted-foreground">
            {{ $t('admin_event_seatmap.custom_price_desc') }}
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Button
            :disabled="areOverrideActionsDisabled"
            @click="setCustomPrice"
          >
            <SaveIcon class="size-4" />
            {{ $t('admin_event_seatmap.set_custom_price') }}
          </Button>
          <Button
            variant="secondary"
            :disabled="areOverrideActionsDisabled"
            @click="disableSelectedSeats"
          >
            <CircleSlash class="size-4" />
            {{ $t('admin_event_seatmap.disable_seat') }}
          </Button>
          <Button
            variant="outline"
            :disabled="areOverrideActionsDisabled"
            @click="resetSelectedOverrides"
          >
            <RotateCcw class="size-4" />
            {{ $t('admin_event_seatmap.reset_override') }}
          </Button>
        </div>
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
