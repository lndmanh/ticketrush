<script setup lang="ts">
import { CircleDollarSign, PieChart, Ticket, TrendingUp } from '@lucide/vue'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'
import AdminDashboardKpiCard from '@/components/admin/dashboard/AdminDashboardKpiCard.vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatCurrency } from '@/lib/utils'
import { AgeBracket, SavedAttendeeGender } from '#shared/commonEnums'

const { t, locale } = useI18n()

const route = useRoute()
const eventId = computed(() => Number(route.params.id))

const { detail, dashboard } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: false,
})

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
  { label: t('admin_event_sales.age_unknown'), value: dashboard.value?.ageDistribution.unknown || 0 },
])

const audienceMappedBuyers = computed(() => audienceMix.value.reduce((total, bucket) => total + bucket.value, 0))

const genderAudienceMix = computed(() => [
  { label: t('admin_event_sales.gender_female'), value: dashboard.value?.genderDistribution[SavedAttendeeGender.Female] || 0 },
  { label: t('admin_event_sales.gender_male'), value: dashboard.value?.genderDistribution[SavedAttendeeGender.Male] || 0 },
  { label: t('admin_event_sales.gender_non_binary'), value: dashboard.value?.genderDistribution[SavedAttendeeGender.NonBinary] || 0 },
  { label: t('admin_event_sales.gender_prefer_not'), value: dashboard.value?.genderDistribution[SavedAttendeeGender.PreferNotToSay] || 0 },
  { label: t('admin_event_sales.gender_unknown'), value: dashboard.value?.genderDistribution.unknown || 0 },
])

const genderMappedBuyers = computed(() => genderAudienceMix.value.reduce((total, bucket) => total + bucket.value, 0))

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
    centerLabel: t('admin_event_sales.buyers_label'),
  })
})

const genderAudienceMixOption = computed(() => {
  return createDonutChartOption({
    data: genderAudienceMix.value,
    centerValue: `${genderMappedBuyers.value}`,
    centerLabel: t('admin_event_sales.buyers_label'),
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
  title: 'Event sales',
  breadcrumb: 'Sales',
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

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
      <AdminDashboardKpiCard
        :label="$t('admin_event_sales.revenue_label')"
        :value="formatCurrency(dashboard.revenueCents || 0, 'VND', getDisplayDateLocale(locale))"
        :description="$t('admin_event_sales.revenue_desc')"
      >
        <template #icon>
          <CircleDollarSign class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin_event_sales.occupancy_label')"
        :value="`${Math.round((dashboard.occupancyRate || 0) * 100)}%`"
        :description="$t('admin_event_sales.occupancy_desc', { count: dashboard.soldSeatsCount })"
      >
        <template #icon>
          <TrendingUp class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin_event_sales.revenue_per_seat_label')"
        :value="formatCurrency(revenuePerSeat, 'VND', getDisplayDateLocale(locale))"
        :description="$t('admin_event_sales.revenue_per_seat_desc')"
      >
        <template #icon>
          <Ticket class="size-4" />
        </template>
      </AdminDashboardKpiCard>
      <AdminDashboardKpiCard
        :label="$t('admin_event_sales.active_holds_label')"
        :value="dashboard.activeHoldsCount"
        :description="$t('admin_event_sales.active_holds_desc')"
      >
        <template #icon>
          <PieChart class="size-4" />
        </template>
      </AdminDashboardKpiCard>
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <AdminChartCard
        class="xl:col-span-7"
        :eyebrow="$t('admin_event_sales.ranking_eyebrow')"
        :title="$t('admin_event_sales.section_revenue')"
        :description="$t('admin_event_sales.section_revenue_desc')"
        :option="sectionRevenueOption"
        :height="320"
        tone="blue"
        :stat="`${topSections.length}`"
        :stat-label="$t('admin_event_sales.top_performers_label')"
      />
      <AdminChartCard
        class="xl:col-span-5"
        :eyebrow="$t('admin_event_sales.sample_eyebrow')"
        :title="$t('admin_event_sales.recent_order_sample')"
        :description="$t('admin_event_sales.recent_order_sample_desc')"
        :option="recentOrderSampleOption"
        :height="320"
        tone="violet"
        :stat="`${dashboard.recentOrders.length}`"
        :stat-label="$t('admin_event_sales.orders_sampled_label')"
      />
      <AdminChartCard
        class="xl:col-span-6"
        :eyebrow="$t('admin_event_sales.audience_eyebrow')"
        :title="$t('admin_event_sales.audience_mix')"
        :description="$t('admin_event_sales.audience_mix_desc')"
        :option="audienceMixOption"
        :height="320"
        tone="rose"
        :stat="audienceMappedBuyers"
        :stat-label="$t('admin_event_sales.buyers_label')"
      />
      <AdminChartCard
        class="xl:col-span-6"
        :eyebrow="$t('admin_event_sales.audience_eyebrow')"
        :title="$t('admin_event_sales.gender_mix')"
        :description="$t('admin_event_sales.gender_mix_desc')"
        :option="genderAudienceMixOption"
        :height="320"
        tone="emerald"
        :stat="genderMappedBuyers"
        :stat-label="$t('admin_event_sales.buyers_label')"
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
              <div class="min-w-0">
                <p class="break-words text-sm font-medium text-foreground">
                  {{ order.customerName || $t('admin_event_sales.pending_buyer') }}
                </p><p class="break-words text-sm text-muted-foreground">
                  {{ order.customerEmail || $t('admin_event_sales.no_email_yet') }}
                </p>
              </div>
              <p class="shrink-0 text-sm text-muted-foreground">
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
