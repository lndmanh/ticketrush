<script setup lang="ts">
import { CircleDollarSign, PieChart, Ticket, TrendingUp } from '@lucide/vue'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatCurrency } from '@/lib/utils'
import { AgeBracket } from '#shared/commonEnums'

const { t, locale } = useI18n()

const route = useRoute()
const eventId = computed(() => Number(route.params.id))

const { detail, dashboard } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: false,
})

const eventTitle = computed(() => detail.value?.event.title ?? null)
const pageTitle = computed(() => eventTitle.value ? `${eventTitle.value} · ${t('admin.event_sales_title')}` : t('admin.event_sales_title'))
const pageDescription = computed(() => t('admin.event_sales_description'))

useSeo({ title: pageTitle, description: pageDescription, type: 'website' })

usePageBreadcrumbs(computed(() => {
  if (!detail.value || detail.value.event.id !== eventId.value) return undefined
  return [
    { title: t('home.breadcrumb'), href: '/' },
    { title: t('admin.dashboard_breadcrumb'), href: '/admin' },
    { title: t('nav.events'), href: '/admin/events' },
    { title: eventTitle.value ?? t('admin.event_dashboard_breadcrumb'), href: `/admin/events/${eventId.value}` },
    { title: t('admin.event_sales_breadcrumb'), href: route.path },
  ]
}))

const { createBarChartOption, createDonutChartOption } = useAdminChartTheme()

const topSections = computed(() => {
  if (!dashboard.value?.salesBySection) {
    return []
  }

  return Object.entries(dashboard.value.salesBySection)
    .sort((left, right) => right[1].revenueCents - left[1].revenueCents)
    .slice(0, 5)
})

const revenuePerSeat = computed(() => {
  if (!dashboard.value?.soldSeatsCount) {
    return 0
  }

  return Math.round((dashboard.value.revenueCents || 0) / dashboard.value.soldSeatsCount)
})

const audienceMix = computed(() => [
  { label: '18–24', value: dashboard.value?.ageDistribution[AgeBracket.EighteenToTwentyFour] || 0 },
  { label: '25–34', value: dashboard.value?.ageDistribution[AgeBracket.TwentyFiveToThirtyFour] || 0 },
  { label: '35–44', value: dashboard.value?.ageDistribution[AgeBracket.ThirtyFiveToFortyFour] || 0 },
  { label: '45+', value: dashboard.value?.ageDistribution[AgeBracket.FortyFivePlus] || 0 },
  { label: 'Unknown', value: dashboard.value?.ageDistribution.unknown || 0 },
])

const sectionRevenueOption = computed(() => {
  return createBarChartOption({
    data: topSections.value.map(([section, totals]) => ({
      label: section,
      value: Math.round(totals.revenueCents / 100),
    })),
  })
})

const audienceMixOption = computed(() => {
  const mappedBuyers = audienceMix.value.reduce((total, bucket) => total + bucket.value, 0)

  return createDonutChartOption({
    data: audienceMix.value,
    centerValue: `${mappedBuyers}`,
    centerLabel: t('admin_event_sales.pending_buyer'),
  })
})

const recentOrderSampleOption = computed(() => {
  return createBarChartOption({
    data: (dashboard.value?.recentOrders ?? []).map((order, index) => ({
      label: `#${index + 1}`,
      value: Math.round(order.amountCents / 100),
    })),
    colorIndex: 4,
    maxItems: 6,
  })
})

definePageMeta({
  title: 'admin.event_sales_title',
  breadcrumb: 'admin.event_sales_breadcrumb',
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

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <CircleDollarSign class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_sales.revenue_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ formatCurrency(dashboard.revenueCents || 0, 'VND', getDisplayDateLocale(locale)) }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin_event_sales.revenue_desc') }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <TrendingUp class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_sales.occupancy_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ Math.round((dashboard.occupancyRate || 0) * 100) }}%
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin_event_sales.occupancy_desc', { count: dashboard.soldSeatsCount }) }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Ticket class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_sales.revenue_per_seat_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ formatCurrency(revenuePerSeat, 'VND', getDisplayDateLocale(locale)) }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin_event_sales.revenue_per_seat_desc') }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <PieChart class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_sales.active_holds_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ dashboard.activeHoldsCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin_event_sales.active_holds_desc') }}
          </p>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <AdminChartCard
        class="xl:col-span-5"
        eyebrow="Ranking"
        :title="$t('admin_event_sales.section_revenue')"
        description="Top sections ranked by confirmed revenue."
        :option="sectionRevenueOption"
        :height="320"
        tone="blue"
        :stat="`${topSections.length}`"
        stat-label="Top performers"
      />
      <AdminChartCard
        class="xl:col-span-4"
        eyebrow="Audience"
        :title="$t('admin_event_sales.audience_mix')"
        description="Current age distribution of buyers captured in the dashboard snapshot."
        :option="audienceMixOption"
        :height="320"
        tone="rose"
        :stat="`${dashboard.recentOrders.length}`"
        stat-label="Recent orders"
      />
      <AdminChartCard
        class="xl:col-span-3"
        eyebrow="Sample"
        :title="$t('admin_event_sales.recent_order_sample')"
        description="Latest order amounts shown as a recent-value sample, not a long-term trend."
        :option="recentOrderSampleOption"
        :height="320"
        tone="violet"
        :stat="`${dashboard.recentOrders.length}`"
        stat-label="Orders sampled"
      />

      <Card class="h-full col-span-full">
        <CardHeader><CardTitle>{{ $t('admin_event_sales.recent_orders_title') }}</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="order in dashboard.recentOrders"
            :key="order.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ order.customerName || $t('admin_event_sales.pending_buyer') }}
                </p><p class="text-sm text-muted-foreground">
                  {{ order.customerEmail || $t('admin_event_sales.no_email_yet') }}
                </p>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ formatCurrency(order.amountCents, 'VND', getDisplayDateLocale(locale)) }}
              </p>
            </div>
          </div>
          <p
            v-if="dashboard.recentOrders.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin_event_sales.no_orders') }}
          </p>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
