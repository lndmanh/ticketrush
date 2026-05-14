<script setup lang="ts">
import { CircleDollarSign, LayoutGrid, LockKeyhole, Ticket, TrendingUp, Users } from '@lucide/vue'
import type { Event } from '#shared/db'
import type { ApiResponse } from '~~/types/api'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
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
const sectionReleaseCount = computed(() => primarySectionPrices.value.length)

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
        ? t('admin.event_checklist_sales_window_ok', { date: formatDateTime(detail.value.event.salesStartAt) })
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

function formatCurrency(cents: number) {
  return `${Intl.NumberFormat(getDisplayDateLocale(locale.value)).format(cents / 100)} VND`
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value))
}

function getEventStatusLabel(status: EventStatus) {
  const key = `event_card.status_${status}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
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
    toast.error(parseApiError(error, 'Failed to publish event').message)
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
    toast.error(parseApiError(error, 'Failed to unpublish event').message)
  }
  finally {
    isUnpublishing.value = false
  }
}

definePageMeta({
  title: 'admin.event_dashboard_title',
  breadcrumb: 'admin.event_dashboard_breadcrumb',
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

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] xl:auto-rows-fr">
      <Card class="h-full">
        <CardContent class="flex h-full flex-col justify-between gap-6">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>{{ getEventStatusLabel(detail.event.status) }}</span>
              <span class="h-1 w-1 rounded-full bg-border" />
              <span>{{ formatDateTime(detail.event.startsAt) }}</span>
            </div>
            <div>
              <h1 class="text-balance text-3xl font-semibold tracking-[-0.06em] text-foreground md:text-4xl">
                {{ detail.event.title }}
              </h1>
              <p class="mt-2 max-w-[58ch] text-sm leading-7 text-muted-foreground md:text-base">
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
              {{ $t('admin.event_publish_btn') }}
            </Button>
            <Button
              v-else
              variant="outline"
              :is-loading="isUnpublishing"

              @click="unpublishEvent"
            >
              {{ $t('admin.event_move_to_draft_btn') }}
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

      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <CircleDollarSign class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_revenue') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ formatCurrency(dashboard.revenueCents || 0) }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin.event_stat_revenue_desc', { count: dashboard.soldSeatsCount }) }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <TrendingUp class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_occupancy') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ Math.round((dashboard.occupancyRate || 0) * 100) }}%
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin.event_stat_occupancy_desc', { count: availableSeats }) }}
          </p>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <LayoutGrid class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_releases') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ sectionReleaseCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin.event_stat_releases_desc', { count: configuredSectionCount }) }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Ticket class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_ticket_capacity') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ totalSeatCapacity }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin.event_stat_ticket_capacity_desc') }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Users class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_seats_open') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ availableSeats }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin.event_stat_seats_open_desc', { count: heldSeats }) }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <LockKeyhole class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_seats_sold') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ soldSeats }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin.event_stat_seats_sold_desc') }}
          </p>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <Card class="h-full xl:col-span-5">
        <CardHeader class="flex flex-row items-center justify-between gap-3">
          <CardTitle>{{ $t('admin.event_launch_readiness') }}</CardTitle><span class="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">{{ $t('admin.event_launch_ready_count', { ready: launchChecklist.filter(item => item.value).length, total: launchChecklist.length }) }}</span>
        </CardHeader>
        <CardContent class="space-y-3">
          <Item
            v-for="item in launchChecklist"
            :key="item.label"
            variant="outline"
          >
            <ItemContent>
              <ItemTitle>{{ item.label }}</ItemTitle>
              <ItemDescription>{{ item.hint }}</ItemDescription>
            </ItemContent>
            <div class="flex items-start justify-between gap-3">
              <span
                :class="item.value ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-border bg-background text-muted-foreground'"
                class="rounded-full border px-3 py-1 text-xs font-medium"
              >{{ item.value ? $t('admin.event_launch_ready') : $t('admin.event_launch_pending') }}</span>
            </div>
          </Item>
        </CardContent>
      </Card>

      <AdminChartCard
        class="xl:col-span-7"
        :eyebrow="$t('admin.event_chart_inventory')"
        :title="$t('admin.event_chart_seat_status')"
        :description="$t('admin.event_chart_seat_status_desc')"
        :option="seatStatusOption"
        :height="320"
        tone="emerald"
        :stat="`${availableSeats}`"
        :stat-label="$t('admin.event_chart_ready_now')"
      />
      <AdminChartCard
        class="xl:col-span-4"
        :eyebrow="$t('admin.event_chart_commercial')"
        :title="$t('admin.event_chart_revenue_section')"
        :description="$t('admin.event_chart_revenue_section_desc')"
        :option="revenueBySectionOption"
        :height="320"
        tone="blue"
        :stat="`${topSections.length}`"
        :stat-label="$t('admin.event_chart_tracked_sections')"
      />

      <Card class="h-full xl:col-span-4">
        <CardHeader><CardTitle>{{ $t('admin.event_top_sections') }}</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="[section, row] in topSections"
            :key="section"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ section }}
                </p><p class="text-sm text-muted-foreground">
                  {{ $t('admin.event_section_sold', { count: row.sold }) }}
                </p>
              </div>
              <p class="text-sm font-medium text-foreground">
                {{ formatCurrency(row.revenueCents) }}
              </p>
            </div>
          </div>
          <p
            v-if="topSections.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin.event_no_section_sales') }}
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-4">
        <CardHeader><CardTitle>{{ $t('admin.event_recent_buyers') }}</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="order in recentOrders"
            :key="order.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex flex-col gap-2">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ order.customerName || $t('admin.event_pending_buyer') }}
                </p><p class="text-sm text-muted-foreground">
                {{ order.customerEmail || $t('admin.event_no_email') }}
                </p>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ formatCurrency(order.amountCents) }}
              </p>
            </div>
          </div>
          <p
            v-if="recentOrders.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin.event_no_buyers') }}
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
