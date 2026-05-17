<script setup lang="ts">
import { CircleDollarSign, Ticket, TrendingUp, Users } from '@lucide/vue'
import type { Event } from '#shared/db'
import type { ApiResponse } from '~~/types/api'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'
import AdminDashboardKpiCard from '@/components/admin/dashboard/AdminDashboardKpiCard.vue'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { apiRoutes } from '#shared/apiRoutes'
import { EventStatus, SeatStatus } from '#shared/commonEnums'
import { toast } from 'vue-sonner'
import type { AdminEventWorkspaceSession } from '~~/types/admin-events'

const route = useRoute()
const eventId = computed(() => Number(route.params.id))
const { t, locale } = useI18n()

const { detail, dashboard, refreshAll, fetchVenueLayoutSyncPreview, applyVenueLayoutSync } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: false,
})

const { createBarChartOption, createDonutChartOption } = useAdminChartTheme()

const isPublishing = ref(false)
const isUnpublishing = ref(false)
const syncDialogOpen = ref(false)
const syncDialogSessionId = ref<number | null>(null)

const recentOrders = computed(() => dashboard.value?.recentOrders?.slice(0, 4) ?? [])
const topSections = computed(() => {
  if (!dashboard.value?.salesBySection) {
    return []
  }

  return Object.entries(dashboard.value.salesBySection)
    .sort((left, right) => right[1].revenueCents - left[1].revenueCents)
    .slice(0, 4)
})

const primarySession = computed(() => {
  if (!detail.value) {
    return null
  }

  return detail.value.sessions.find(session => session.id === detail.value.primarySessionId) ?? detail.value.sessions[0] ?? null
})

const primarySeats = computed(() => primarySession.value?.seats ?? [])
const primarySectionPrices = computed(() => primarySession.value?.sectionPrices ?? [])
const isPrimarySessionStale = computed(() => primarySession.value?.venueSyncStatus === 'stale' && detail.value?.event.status === EventStatus.Draft)
const selectedSyncSession = computed(() => {
  const sessionId = syncDialogSessionId.value
  if (!detail.value || sessionId === null) {
    return null
  }

  return detail.value.sessions.find(session => session.id === sessionId) ?? null
})

const availableSeats = computed(() => primarySeats.value.filter(seat => seat.status === SeatStatus.Available).length)
const heldSeats = computed(() => primarySeats.value.filter(seat => seat.status === SeatStatus.Locked).length)
const soldSeats = computed(() => primarySeats.value.filter(seat => seat.status === SeatStatus.Sold).length)
const totalSeatCapacity = computed(() => {
  if (primarySeats.value.length > 0) {
    return primarySeats.value.filter(seat => seat.status !== SeatStatus.Unavailable).length
  }

  return detail.value?.venue?.capacity ?? 0
})
const configuredSectionCount = computed(() => primarySectionPrices.value.length)

const launchChecklist = computed(() => {
  if (!detail.value?.event) {
    return []
  }

  return [
    {
      label: t('admin.event_checklist_sections_configured'),
      value: configuredSectionCount.value > 0,
      hint: configuredSectionCount.value > 0
        ? t('admin.event_checklist_sections_configured_ok', { count: configuredSectionCount.value })
        : t('admin.event_checklist_sections_configured_fail'),
    },
    {
      label: t('admin.event_checklist_sales_window'),
      value: Boolean(detail.value.event.salesStartAt && detail.value.event.salesEndAt),
      hint: detail.value.event.salesStartAt && detail.value.event.salesEndAt
        ? t('admin.event_checklist_sales_window_ok', { date: formatDateTime(detail.value.event.salesStartAt, getDisplayDateLocale(locale.value)) })
        : t('admin.event_checklist_sales_window_fail'),
    },
    {
      label: t('admin.event_checklist_inventory'),
      value: totalSeatCapacity.value > 0,
      hint: totalSeatCapacity.value > 0
        ? t('admin.event_checklist_inventory_ok', { count: totalSeatCapacity.value })
        : t('admin.event_checklist_inventory_fail'),
    },
  ]
})

const revenueBySectionOption = computed(() => {
  return createBarChartOption({
    data: topSections.value.map(([section, row]) => ({
      label: section,
      value: Math.round(row.revenueCents / 100),
    })),
  })
})

const seatStatusOption = computed(() => {
  return createDonutChartOption({
    data: [
      { label: t('common.available'), value: availableSeats.value },
      { label: t('common.held'), value: heldSeats.value },
      { label: t('common.sold'), value: soldSeats.value },
    ],
    centerValue: `${soldSeats.value}`,
    centerLabel: t('admin.event_stat_sold_seats'),
  })
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

async function publishEvent() {
  if (isPrimarySessionStale.value) {
    openVenueSync(primarySession.value)
    return
  }

  isPublishing.value = true
  try {
    const response = await apiRequest<ApiResponse<Event>>(apiRoutes.adminEventPublish(eventId.value), { method: 'POST' })
    if (!response.success) throw response
    await refreshAll()
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin_event_overview.publish_failed')).message)
  }
  finally {
    isPublishing.value = false
  }
}

async function unpublishEvent() {
  isUnpublishing.value = true
  try {
    const response = await apiRequest<ApiResponse<Event | undefined>>(apiRoutes.adminEventUnpublish(eventId.value), { method: 'POST' })
    if (!response.success) throw response
    await refreshAll()
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin_event_overview.unpublish_failed')).message)
  }
  finally {
    isUnpublishing.value = false
  }
}

definePageMeta({
  title: 'Event dashboard',
  breadcrumb: 'Event dashboard',
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
      v-if="isPrimarySessionStale"
      variant="destructive"
    >
      <AlertTitle>{{ $t('admin_event_sync.dashboard_stale_title') }}</AlertTitle>
      <AlertDescription class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{{ $t('admin_event_sync.dashboard_stale_desc') }}</span>
        <Button
          size="sm"
          variant="secondary"
          class="w-fit"
          @click="openVenueSync(primarySession)"
        >
          {{ $t('admin_event_sync.sync_button') }}
        </Button>
      </AlertDescription>
    </Alert>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <Card class="h-full xl:col-span-7">
        <CardContent class="flex h-full flex-col justify-between gap-6">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>{{ getEventStatusLabel(detail.event.status) }}</span>
              <span class="h-1 w-1 rounded-full bg-border" />
              <span>{{ formatDateTime(detail.event.startsAt, getDisplayDateLocale(locale)) }}</span>
            </div>
            <div>
              <h1 class="break-words text-balance text-3xl font-semibold tracking-[-0.06em] text-foreground md:text-4xl">
                {{ detail.event.title }}
              </h1>
              <p class="mt-2 max-w-[58ch] break-words text-sm leading-7 text-muted-foreground md:text-base">
                {{ detail.event.subtitle || detail.event.description }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <Button
              v-if="detail.event.status === EventStatus.Draft"
              :disabled="isPrimarySessionStale"
              :is-loading="isPublishing"

              @click="publishEvent"
            >
              {{ $t('admin_event_overview.publish_event') }}
            </Button>
            <Button
              v-else
              variant="outline"
              :is-loading="isUnpublishing"

              @click="unpublishEvent"
            >
              {{ $t('admin_event_overview.move_to_draft') }}
            </Button>
            <Button
              as-child
              variant="outline"
            >
              <NuxtLink :to="`/admin/events/${eventId}/pricing`">{{ $t('admin.event_open_pricing') }}</NuxtLink>
            </Button>
            <AdminLocalizationAdminEventLocalizationPanel :event-id="eventId" />
          </div>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-5">
        <CardHeader class="flex flex-row items-center justify-between gap-3">
          <CardTitle>{{ $t('admin.event_launch_readiness') }}</CardTitle>
          <Badge variant="outline">
            {{ $t('admin.event_launch_ready_count', { ready: launchChecklist.filter(item => item.value).length, total: launchChecklist.length }) }}
          </Badge>
        </CardHeader>
        <CardContent class="space-y-3">
          <Item
            v-for="item in launchChecklist"
            :key="item.label"
            variant="outline"
          >
            <ItemContent class="min-w-0">
              <ItemTitle class="break-words">{{ item.label }}</ItemTitle>
              <ItemDescription class="break-words">{{ item.hint }}</ItemDescription>
            </ItemContent>
            <div class="flex items-start justify-between gap-3">
              <Badge variant="outline">
                {{ item.value ? $t('admin_event_overview.ready') : $t('admin_event_overview.pending') }}
              </Badge>
            </div>
          </Item>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
      <AdminDashboardKpiCard
        :label="$t('admin.event_stat_revenue')"
        :value="formatCurrency(dashboard.revenueCents || 0, 'VND', getDisplayDateLocale(locale))"
        :description="$t('admin_event_overview.revenue_summary_desc', { count: dashboard.soldSeatsCount })"
      >
        <template #icon>
          <CircleDollarSign class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin.event_stat_occupancy')"
        :value="`${Math.round((dashboard.occupancyRate || 0) * 100)}%`"
        :description="$t('admin_event_overview.occupancy_summary_desc', { count: availableSeats })"
      >
        <template #icon>
          <TrendingUp class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin.event_stat_ticket_capacity')"
        :value="totalSeatCapacity"
        :description="$t('admin_event_overview.capacity_summary_desc')"
      >
        <template #icon>
          <Ticket class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin.event_stat_seats_open')"
        :value="availableSeats"
        :description="$t('admin_event_overview.open_seats_summary_desc', { count: heldSeats })"
      >
        <template #icon>
          <Users class="size-4" />
        </template>
      </AdminDashboardKpiCard>
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <AdminChartCard
        class="xl:col-span-5"
        :eyebrow="$t('admin_event_overview.inventory_eyebrow')"
        :title="$t('admin.event_chart_seat_status')"
        :description="$t('admin_event_overview.inventory_chart_desc')"
        :option="seatStatusOption"
        :height="320"
        tone="emerald"
        :stat="`${availableSeats}`"
        :stat-label="$t('admin_event_overview.ready_now')"
      />
      <AdminChartCard
        class="xl:col-span-4"
        :eyebrow="$t('admin_event_overview.commercial_eyebrow')"
        :title="$t('admin.event_chart_revenue_section')"
        :description="$t('admin_event_overview.revenue_section_chart_desc')"
        :option="revenueBySectionOption"
        :height="320"
        tone="blue"
        :stat="`${topSections.length}`"
        :stat-label="$t('admin_event_overview.tracked_sections')"
      />

      <Card class="h-full xl:col-span-3">
        <CardHeader><CardTitle>{{ $t('admin_event_overview.recent_activity_title') }}</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <Item
            v-for="order in recentOrders"
            :key="order.id"
            variant="outline"
          >
            <ItemContent class="min-w-0">
              <ItemTitle class="break-words">
                {{ order.customerName || $t('admin_event_overview.pending_buyer') }}
              </ItemTitle>
              <ItemDescription class="break-words">
                {{ order.customerEmail || $t('admin_event_overview.no_email_captured') }}
              </ItemDescription>
            </ItemContent>
            <p class="shrink-0 text-sm text-muted-foreground">
              {{ formatCurrency(order.amountCents, 'VND', getDisplayDateLocale(locale)) }}
            </p>
          </Item>
          <p
            v-if="recentOrders.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin_event_overview.no_recent_activity') }}
          </p>
        </CardContent>
      </Card>
    </section>

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
