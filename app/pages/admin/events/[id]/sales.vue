<script setup lang="ts">
import { CircleDollarSign, PieChart, Ticket, TrendingUp } from '@lucide/vue'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'

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
  { label: '18–24', value: dashboard.value?.ageDistribution['18-24'] || 0 },
  { label: '25–34', value: dashboard.value?.ageDistribution['25-34'] || 0 },
  { label: '35–44', value: dashboard.value?.ageDistribution['35-44'] || 0 },
  { label: '45+', value: dashboard.value?.ageDistribution['45+'] || 0 },
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
    centerLabel: 'Mapped buyers',
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

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <CircleDollarSign class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">Revenue</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ Intl.NumberFormat('en-US').format((dashboard.revenueCents || 0) / 100) }} VND
          </p><p class="mt-2 text-sm text-muted-foreground">
            Gross confirmed sales for this event.
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <TrendingUp class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">Occupancy</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ Math.round((dashboard.occupancyRate || 0) * 100) }}%
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ dashboard.soldSeatsCount }} seats converted.
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Ticket class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">Revenue / seat</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ Intl.NumberFormat('en-US').format(revenuePerSeat / 100) }} VND
          </p><p class="mt-2 text-sm text-muted-foreground">
            Average yield on sold seats.
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <PieChart class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">Active holds</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ dashboard.activeHoldsCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            Seats still waiting on checkout confirmation.
          </p>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <AdminChartCard
        class="xl:col-span-5"
        eyebrow="Ranking"
        title="Section revenue"
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
        title="Audience mix"
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
        title="Recent order sample"
        description="Latest order amounts shown as a recent-value sample, not a long-term trend."
        :option="recentOrderSampleOption"
        :height="320"
        tone="violet"
        :stat="`${dashboard.recentOrders.length}`"
        stat-label="Orders sampled"
      />

      <Card class="h-full xl:col-span-8">
        <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="order in dashboard.recentOrders"
            :key="order.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ order.customerName || 'Pending buyer' }}
                </p><p class="text-sm text-muted-foreground">
                  {{ order.customerEmail || 'No email yet' }}
                </p>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ Intl.NumberFormat('en-US').format(order.amountCents / 100) }} VND
              </p>
            </div>
          </div>
          <p
            v-if="dashboard.recentOrders.length === 0"
            class="text-sm text-muted-foreground"
          >
            No confirmed orders yet.
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-4">
        <CardHeader><CardTitle>Live pressure</CardTitle></CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Waiting
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
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Active holds
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ dashboard.activeHoldsCount }}
            </p>
          </div>
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Available
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ dashboard.availableSeatsCount }}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
