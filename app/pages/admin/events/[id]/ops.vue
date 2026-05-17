<script setup lang="ts">
import { Activity, LockKeyhole, ShoppingCart, Tickets } from '@lucide/vue'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'
import AdminDashboardKpiCard from '@/components/admin/dashboard/AdminDashboardKpiCard.vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatDateTime, formatTime } from '@/lib/utils'
import { formatMoney } from '@/lib/money'

const { t, locale } = useI18n()
const { displayCurrency, formatCurrency: formatPreferredCurrency } = useCurrencyPreference()

const route = useRoute()
const eventId = computed(() => Number(route.params.id))

const { detail, ops } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: true,
})

const eventTitle = computed(() => detail.value?.event.title ?? null)
const pageTitle = computed(() => eventTitle.value ? `${eventTitle.value} · ${t('admin.event_ops_title')}` : t('admin.event_ops_title'))
const pageDescription = computed(() => t('admin.event_ops_description'))

useSeo({ title: pageTitle, description: pageDescription, type: 'website' })

usePageBreadcrumbs(computed(() => {
  if (!detail.value || detail.value.event.id !== eventId.value) return undefined
  return [
    { title: t('home.breadcrumb'), href: '/' },
    { title: t('admin.dashboard_breadcrumb'), href: '/admin' },
    { title: t('nav.events'), href: '/admin/events' },
    { title: eventTitle.value ?? t('admin.event_dashboard_breadcrumb'), href: `/admin/events/${eventId.value}` },
    { title: t('admin.event_ops_breadcrumb'), href: route.path },
  ]
}))

const { createBarChartOption, createDonutChartOption } = useAdminChartTheme()

const orders = computed(() => ops.value?.recentOrders ?? [])
const tickets = computed(() => ops.value?.recentTickets ?? [])
const holds = computed(() => ops.value?.activeHolds ?? [])
const queueFeed = computed(() => ops.value?.queueFeed ?? [])

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: t('admin_event_ops.status_active'),
    admitted: t('admin_event_ops.status_admitted'),
    completed: t('admin_event_ops.status_completed'),
    converted: t('admin_event_ops.status_converted'),
    expired: t('admin_event_ops.status_expired'),
    released: t('admin_event_ops.status_released'),
    waiting: t('admin_event_ops.status_waiting'),
  }

  return labels[status] ?? t('admin_event_ops.status_unknown', { status })
}

function getSeatCountLabel(count: number) {
  return count === 1
    ? t('admin_event_ops.seat_count_one', { count })
    : t('admin_event_ops.seat_count_other', { count })
}

function getTicketLocationLabel(
  sectionLabel: string | null | undefined,
  rowLabel: string | null | undefined,
  seatLabel: string | null | undefined,
) {
  const section = sectionLabel || t('admin_event_ops.general_admission')
  const seat = seatLabel || t('admin_event_ops.open_seating')

  if (rowLabel) {
    return t('admin_event_ops.seat_location_with_row', { section, row: rowLabel, seat })
  }

  return t('admin_event_ops.seat_location_without_row', { section, seat })
}

const operationsMixOption = computed(() => {
  if (!ops.value) {
    return createDonutChartOption({ data: [] })
  }

  return createDonutChartOption({
    data: [
      { label: t('admin_event_ops.orders_label'), value: ops.value.totals.ordersCount },
      { label: t('admin_event_ops.tickets_label'), value: ops.value.totals.ticketsCount },
      { label: t('admin_event_ops.active_holds_label'), value: ops.value.totals.activeHoldsCount },
      { label: t('admin_event_ops.queue_entries_label'), value: ops.value.totals.queueEntriesCount },
    ],
  })
})

const queueStatusOption = computed(() => {
  const statusCounts = queueFeed.value.reduce<Record<string, number>>((accumulator, entry) => {
    const statusLabel = getStatusLabel(entry.status)

    accumulator[statusLabel] = (accumulator[statusLabel] || 0) + 1
    return accumulator
  }, {})

  return createBarChartOption({
    data: Object.entries(statusCounts).map(([label, value]) => ({ label, value })),
    colorIndex: 1,
  })
})

const recentOrderSampleOption = computed(() => {
  const selectedDisplayCurrency = displayCurrency.value

  return createBarChartOption({
    data: orders.value.map((order, index) => ({
      label: `#${index + 1}`,
      value: Math.round(order.amountCents / 100),
    })),
    valueFormatter: value => formatMoney(value * 100, 'VND', selectedDisplayCurrency, getDisplayDateLocale(locale.value), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }),
    colorIndex: 5,
    maxItems: 6,
  })
})

const displayLocale = computed(() => getDisplayDateLocale(locale.value))

definePageMeta({
  title: 'admin.event_ops_title',
  breadcrumb: 'admin.event_ops_breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div
    v-if="detail && ops"
    class="space-y-6"
  >
    <AdminEventsAdminEventNav :event-id="eventId" />
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
      <AdminDashboardKpiCard
        :label="$t('admin_event_ops.orders_label')"
        :value="ops.totals.ordersCount"
        :description="$t('admin_event_ops.orders_desc')"
      >
        <template #icon>
          <ShoppingCart class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin_event_ops.tickets_label')"
        :value="ops.totals.ticketsCount"
        :description="$t('admin_event_ops.tickets_desc')"
      >
        <template #icon>
          <Tickets class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin_event_ops.active_holds_label')"
        :value="ops.totals.activeHoldsCount"
        :description="$t('admin_event_ops.active_holds_desc')"
      >
        <template #icon>
          <LockKeyhole class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin_event_ops.queue_entries_label')"
        :value="ops.totals.queueEntriesCount"
        :description="$t('admin_event_ops.queue_entries_desc')"
      >
        <template #icon>
          <Activity class="size-4" />
        </template>
      </AdminDashboardKpiCard>
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <AdminChartCard
        class="xl:col-span-4"
        :eyebrow="$t('admin_event_ops.footprint_eyebrow')"
        :title="$t('admin_event_ops.operations_mix')"
        :description="$t('admin_event_ops.operations_mix_desc')"
        :option="operationsMixOption"
        :height="320"
        tone="emerald"
        :stat="`${ops.totals.ordersCount + ops.totals.ticketsCount}`"
        :stat-label="$t('admin_event_ops.order_ticket_volume_label')"
      />
      <AdminChartCard
        class="xl:col-span-4"
        :eyebrow="$t('admin_event_ops.queue_eyebrow')"
        :title="$t('admin_event_ops.queue_status')"
        :description="$t('admin_event_ops.queue_status_desc')"
        :option="queueStatusOption"
        :height="320"
        tone="blue"
        :stat="`${queueFeed.length}`"
        :stat-label="$t('admin_event_ops.recent_entries_label')"
      />
      <AdminChartCard
        class="xl:col-span-4"
        :eyebrow="$t('admin_event_ops.sample_eyebrow')"
        :title="$t('admin_event_ops.recent_order_sample')"
        :description="$t('admin_event_ops.recent_order_sample_desc')"
        :option="recentOrderSampleOption"
        :height="320"
        tone="rose"
        :stat="`${orders.length}`"
        :stat-label="$t('admin_event_ops.orders_sampled_label')"
      />

      <Card class="h-full xl:col-span-4">
        <CardHeader><CardTitle>{{ $t('admin_event_ops.orders_title') }}</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-3">
          <div
            v-for="order in orders"
            :key="order.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="break-words text-sm font-medium text-foreground">
                  {{ order.customerName || $t('admin_event_ops.pending_buyer') }}
                </p><p class="break-words text-sm text-muted-foreground">
                  {{ order.customerEmail || $t('admin_event_ops.no_email') }}
                </p>
              </div>
              <p class="shrink-0 text-sm text-muted-foreground">
                {{ formatPreferredCurrency(order.amountCents, 'VND', displayLocale) }}
              </p>
            </div>
          </div>
          <p
            v-if="orders.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin_event_ops.no_orders') }}
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-4">
        <CardHeader><CardTitle>{{ $t('admin_event_ops.active_holds_title') }}</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-3">
          <div
            v-for="hold in holds"
            :key="hold.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="break-words text-sm font-medium text-foreground">
                  {{ hold.publicId }}
                </p><p class="break-words text-sm text-muted-foreground">
                  {{ getSeatCountLabel(hold.seatCount) }} · {{ $t('admin_event_ops.expires_label') }} {{ formatTime(hold.expiresAt, displayLocale) }}
                </p>
              </div>
              <p class="shrink-0 text-xs text-muted-foreground">
                {{ getStatusLabel(hold.status) }}
              </p>
            </div>
          </div>
          <p
            v-if="holds.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin_event_ops.no_holds') }}
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-4">
        <CardHeader><CardTitle>{{ $t('admin_event_ops.queue_feed_title') }}</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-3">
          <div
            v-for="entry in queueFeed"
            :key="entry.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="break-words text-sm font-medium text-foreground">
                  {{ entry.customerKey }}
                </p><p class="break-words text-sm text-muted-foreground">
                  {{ $t('admin_event_ops.created_label') }} {{ formatDateTime(entry.createdAt, displayLocale) }}
                </p>
              </div>
              <p class="shrink-0 text-xs text-muted-foreground">
                {{ getStatusLabel(entry.status) }}
              </p>
            </div>
          </div>
          <p
            v-if="queueFeed.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin_event_ops.no_queue') }}
          </p>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
