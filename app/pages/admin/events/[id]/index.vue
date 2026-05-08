<script setup lang="ts">
import { CircleDollarSign, LayoutGrid, LockKeyhole, Ticket, TrendingUp, Users } from '@lucide/vue'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'

const route = useRoute()
const eventId = computed(() => Number(route.params.id))
const { t } = useI18n()

const { detail, dashboard, refreshAll } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: false,
})

const { createBarChartOption, createDonutChartOption } = useAdminChartTheme()

const isPublishing = ref(false)
const isUnpublishing = ref(false)

const recentOrders = computed(() => dashboard.value?.recentOrders?.slice(0, 4) ?? [])
const topSections = computed(() => {
  if (!dashboard.value?.salesBySection) {
    return []
  }

  return Object.entries(dashboard.value.salesBySection)
    .sort((left, right) => right[1].revenueCents - left[1].revenueCents)
    .slice(0, 4)
})

const availableSeats = computed(() => detail.value?.seats.filter(seat => seat.status === 'available').length ?? 0)
const heldSeats = computed(() => detail.value?.seats.filter(seat => seat.status === 'locked').length ?? 0)
const soldSeats = computed(() => detail.value?.seats.filter(seat => seat.status === 'sold').length ?? 0)
const totalTicketCapacity = computed(() => detail.value?.ticketTypes.reduce((total, ticketType) => total + ticketType.capacity, 0) ?? 0)
const reservedReleases = computed(() => detail.value?.ticketTypes.filter(ticketType => ticketType.isReservedSeating).length ?? 0)

const launchChecklist = computed(() => {
  if (!detail.value?.event) {
    return []
  }

  return [
    {
      label: t('admin.event_checklist_releases_staged'),
      value: detail.value.ticketTypes.length > 0,
      hint: detail.value.ticketTypes.length > 0
        ? t('admin.event_checklist_releases_staged_ok', { count: detail.value.ticketTypes.length })
        : t('admin.event_checklist_releases_staged_fail'),
    },
    {
      label: t('admin.event_checklist_sales_window'),
      value: Boolean(detail.value.event.salesStartAt && detail.value.event.salesEndAt),
      hint: detail.value.event.salesStartAt && detail.value.event.salesEndAt
        ? t('admin.event_checklist_sales_window_ok', { date: new Date(detail.value.event.salesStartAt).toLocaleString() })
        : t('admin.event_checklist_sales_window_fail'),
    },
    {
      label: t('admin.event_checklist_inventory'),
      value: detail.value.seats.length > 0,
      hint: detail.value.seats.length > 0
        ? t('admin.event_checklist_inventory_ok', { count: detail.value.seats.length })
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

async function publishEvent() {
  isPublishing.value = true
  try {
    const response = await apiRequest(apiRoutes.adminEventPublish(eventId.value), { method: 'POST' })
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
    const response = await apiRequest(apiRoutes.adminEventUnpublish(eventId.value), { method: 'POST' })
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

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] xl:auto-rows-fr">
      <Card class="h-full">
        <CardContent class="flex h-full flex-col justify-between gap-6">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span>{{ detail.event.status.replaceAll('_', ' ') }}</span>
              <span class="h-1 w-1 rounded-full bg-border" />
              <span>{{ new Date(detail.event.startsAt).toLocaleString() }}</span>
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
              v-if="detail.event.status === 'draft'"
              :is-loading="isPublishing"
              class="rounded-full"
              @click="publishEvent"
            >
              Publish event
            </Button>
            <Button
              v-else
              variant="outline"
              :is-loading="isUnpublishing"
              class="rounded-full"
              @click="unpublishEvent"
            >
              Move to draft
            </Button>
            <Button
              as-child
              variant="outline"
              class="rounded-full"
            >
              <NuxtLink :to="`/admin/events/${eventId}/pricing`">{{ $t('admin.event_open_pricing') }}</NuxtLink>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <CircleDollarSign class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_revenue') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ Intl.NumberFormat('en-US').format((dashboard.revenueCents || 0) / 100) }} VND
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ dashboard.soldSeatsCount }} seats converted so far.
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
            {{ availableSeats }} seats still open in the snapshot.
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
            {{ detail.ticketTypes.length }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ reservedReleases }} reserved release(s).
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Ticket class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin.event_stat_ticket_capacity') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ totalTicketCapacity }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            Total tickets represented in pricing.
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
            {{ heldSeats }} currently held in checkout.
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
            Snapshot seat inventory already converted.
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
          <div
            v-for="item in launchChecklist"
            :key="item.label"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ item.label }}
                </p>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">
                  {{ item.hint }}
                </p>
              </div>
              <span
                :class="item.value ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-border bg-background text-muted-foreground'"
                class="rounded-full border px-3 py-1 text-xs font-medium"
              >{{ item.value ? 'Ready' : 'Pending' }}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminChartCard
        class="xl:col-span-4"
        eyebrow="Inventory"
        :title="$t('admin.event_chart_seat_status')"
        description="Current inventory split across available, held, and sold seats."
        :option="seatStatusOption"
        :height="320"
        tone="emerald"
        :stat="`${availableSeats}`"
        stat-label="Ready now"
      />
      <AdminChartCard
        class="xl:col-span-3"
        eyebrow="Commercial"
        :title="$t('admin.event_chart_revenue_section')"
        description="Top performing sections by confirmed revenue."
        :option="revenueBySectionOption"
        :height="320"
        tone="blue"
        :stat="`${topSections.length}`"
        stat-label="Tracked sections"
      />

      <Card class="h-full xl:col-span-5">
        <CardHeader><CardTitle>{{ $t('admin.event_ticket_stats') }}</CardTitle></CardHeader>
        <CardContent class="grid gap-3 md:grid-cols-2">
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Sold seats
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ soldSeats }}
            </p>
          </div>
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Held seats
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ heldSeats }}
            </p>
          </div>
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Queue waiting
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ dashboard.queueWaitingCount }}
            </p>
          </div>
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Admitted
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ dashboard.queueAdmittedCount }}
            </p>
          </div>
        </CardContent>
      </Card>

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
                  {{ row.sold }} sold
                </p>
              </div>
              <p class="text-sm font-medium text-foreground">
                {{ Intl.NumberFormat('en-US').format(row.revenueCents / 100) }} VND
              </p>
            </div>
          </div>
          <p
            v-if="topSections.length === 0"
            class="text-sm text-muted-foreground"
          >
            No section sales yet.
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-3">
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
                  {{ order.customerName || 'Pending buyer' }}
                </p><p class="text-sm text-muted-foreground">
                  {{ order.customerEmail || 'No email captured yet' }}
                </p>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ Intl.NumberFormat('en-US').format(order.amountCents / 100) }} VND
              </p>
            </div>
          </div>
          <p
            v-if="recentOrders.length === 0"
            class="text-sm text-muted-foreground"
          >
            No buyer activity yet.
          </p>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
