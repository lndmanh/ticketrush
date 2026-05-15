<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { ApiResponse } from '~~/types/api'
import type { AdminDashboardResponse } from '~~/types/admin-dashboard'
import { Eye, LineChart, Ticket, Users } from '@lucide/vue'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'
import AdminDashboardKpiCard from '@/components/admin/dashboard/AdminDashboardKpiCard.vue'
import AdminDashboardSessionCalendar from '@/components/admin/dashboard/AdminDashboardSessionCalendar.vue'
import DataTable from '@/components/DataTable.vue'
import { createAdminDashboardColumns } from '@/components/admin/dashboard/columns'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { apiRoutes } from '#shared/apiRoutes'

const emptyDashboard: AdminDashboardResponse = {
  summary: {
    totalRevenueCents: 0,
    totalSeatsListed: 0,
    soldSeatsCount: 0,
    ticketsIssuedCount: 0,
    totalViews: 0,
    occupancyRate: 0,
    activeEventsCount: 0,
    activeSessionsCount: 0,
    activeHoldsCount: 0,
    queueWaitingCount: 0,
  },
  chart: [],
  events: [],
  sessions: [],
}

const { locale } = useI18n()
const { data: dashboardResponse, refresh } = await useAPI<ApiResponse<AdminDashboardResponse>>(() => apiRoutes.ADMIN_DASHBOARD, {
  query: computed(() => ({ locale: locale.value })),
})
const { createDonutChartOption } = useAdminChartTheme()
const colorMode = useColorMode()

const selectedDate = ref(getIsoDate(new Date()))
const isRefreshing = ref(false)
const columns = createAdminDashboardColumns()

const dashboard = computed<AdminDashboardResponse>(() => dashboardResponse.value?.success ? dashboardResponse.value.data : emptyDashboard)
const summary = computed(() => dashboard.value.summary)

const sortedSessions = computed(() => {
  return [...dashboard.value.sessions].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
})

const selectedDaySessions = computed(() => {
  return sortedSessions.value.filter(session => getIsoDate(new Date(session.startsAt)) === selectedDate.value)
})

const sessionCountsByDate = computed(() => {
  return sortedSessions.value.reduce<Record<string, number>>((counts, session) => {
    const key = getIsoDate(new Date(session.startsAt))
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
})

const occupancyLabel = computed(() => `${formatPercent(summary.value.occupancyRate)} occupied`)

const revenueChartOption = computed<EChartsOption>(() => {
  const isDark = colorMode.value === 'dark'
  const axisColor = isDark ? '#94A3B8' : '#64748B'
  const gridColor = isDark ? '#1E293B' : '#E2E8F0'
  const revenueColor = isDark ? '#34D399' : '#059669'
  const ticketColor = isDark ? '#93C5FD' : '#2563EB'
  const labels = dashboard.value.chart.map(point => point.label)

  return {
    animationDuration: 450,
    color: [revenueColor, ticketColor],
    grid: {
      left: 8,
      right: 12,
      top: 20,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: {
        color: axisColor,
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLabel: {
        color: axisColor,
      },
      axisLine: {
        lineStyle: {
          color: gridColor,
        },
      },
    },
    yAxis: [
      {
        type: 'value',
        axisLabel: {
          color: axisColor,
          formatter: (value: string | number) => formatCompactCurrency(Number(value) * 100),
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: 'dashed',
          },
        },
      },
      {
        type: 'value',
        axisLabel: {
          color: axisColor,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: 'Revenue',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: dashboard.value.chart.map(point => Math.round(point.revenueCents / 100)),
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          opacity: isDark ? 0.18 : 0.12,
          color: revenueColor,
        },
      },
      {
        name: 'Tickets',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        symbolSize: 7,
        data: dashboard.value.chart.map(point => point.ticketsSold),
        lineStyle: {
          width: 2,
        },
      },
    ],
  }
})

const seatMixOption = computed(() => {
  return createDonutChartOption({
    data: [
      { label: 'Sold', value: summary.value.soldSeatsCount },
      { label: 'Available', value: Math.max(summary.value.totalSeatsListed - summary.value.soldSeatsCount, 0) },
    ],
    centerValue: formatPercent(summary.value.occupancyRate),
    centerLabel: 'Occupancy',
  })
})

watch(sortedSessions, (sessions) => {
  if (sessions.length === 0) return
  const hasSelectedDate = sessions.some(session => getIsoDate(new Date(session.startsAt)) === selectedDate.value)
  if (!hasSelectedDate) {
    selectedDate.value = getIsoDate(new Date(sessions[0].startsAt))
  }
}, { immediate: true })

async function refreshDashboard() {
  isRefreshing.value = true
  try {
    await refresh()
  }
  finally {
    isRefreshing.value = false
  }
}

function getIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat(getDisplayDateLocale(locale.value), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatCompactCurrency(cents: number) {
  return new Intl.NumberFormat(getDisplayDateLocale(locale.value), {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100)
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(getDisplayDateLocale(locale.value), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatPercent(value: number) {
  return new Intl.NumberFormat(getDisplayDateLocale(locale.value), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}

definePageMeta({
  title: 'Admin Dashboard',
  breadcrumb: 'Admin',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <h1 class="text-balance text-3xl font-semibold tracking-[-0.06em] text-foreground md:text-4xl">
          {{ $t('admin.dashboard_analytics_title') }}
        </h1>
        <p class="text-sm text-muted-foreground md:text-base">
          {{ $t('admin.dashboard_analytics_desc') }}
        </p>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminDashboardKpiCard
        label="Total revenue"
        :value="formatCurrency(summary.totalRevenueCents)"
        :description="$t('admin.dashboard_total_revenue_desc')"
        :trend-label="$t('admin.dashboard_confirmed')"
        trend-direction="up"
      >
        <template #icon>
          <LineChart class="size-4" />
        </template>
      </AdminDashboardKpiCard>

      <AdminDashboardKpiCard
        :label="$t('admin.dashboard_seats_listed')"
        :value="formatCompactNumber(summary.totalSeatsListed)"
        :description="$t('admin.dashboard_seats_listed_desc')"
        :trend-label="`${summary.soldSeatsCount} sold`"
        trend-direction="neutral"
      >
        <template #icon>
          <Users class="size-4" />
        </template>
      </AdminDashboardKpiCard>

      <AdminDashboardKpiCard
        :label="$t('admin.dashboard_tickets_issued')"
        :value="formatCompactNumber(summary.ticketsIssuedCount)"
        :description="$t('admin.dashboard_tickets_issued_desc')"
        :trend-label="occupancyLabel"
        trend-direction="up"
      >
        <template #icon>
          <Ticket class="size-4" />
        </template>
      </AdminDashboardKpiCard>

      <AdminDashboardKpiCard
        :label="$t('admin.dashboard_total_views')"
        :value="formatCompactNumber(summary.totalViews)"
        :description="$t('admin.dashboard_total_views_desc')"
        trend-label="Tracking pending"
        trend-direction="neutral"
      >
        <template #icon>
          <Eye class="size-4" />
        </template>
      </AdminDashboardKpiCard>
    </section>

    <section class="grid gap-6 xl:grid-cols-12 xl:items-start">
      <div class="space-y-6 xl:col-span-8">
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
          <AdminChartCard
            :title="$t('admin.dashboard_performance')"
            :description="$t('admin.dashboard_performance_desc')"
            :option="revenueChartOption"
            :height="320"
            :stat="formatCurrency(summary.totalRevenueCents)"
            stat-label="Total revenue"
            tone="emerald"
          />

          <AdminChartCard
            :title="$t('admin.dashboard_seat_mix')"
            :description="$t('admin.dashboard_seat_mix_desc')"
            :option="seatMixOption"
            :height="320"
            :stat="formatPercent(summary.occupancyRate)"
            stat-label="Occupancy"
            tone="slate"
          />
        </div>

        <Card class="overflow-hidden border-border/70 bg-card/90 shadow-sm">
          <CardHeader class="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{{ $t('admin.dashboard_active_listing') }}</CardTitle>
              <CardDescription>
                {{ $t('admin.dashboard_active_listing_desc') }}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              class="w-fit rounded-full"
            >
              {{ dashboard.events.length }} event{{ dashboard.events.length === 1 ? '' : 's' }}
            </Badge>
          </CardHeader>
          <CardContent class="space-y-4">
            <DataTable
              :columns="columns"
              :data="dashboard.events"
              :loading="isRefreshing"
              search-placeholder="Search events, venues, statuses"
              :empty-title="$t('admin.dashboard_empty_title')"
              :empty-description="$t('admin.dashboard_empty_desc')"
              @update:data="refreshDashboard"
            />
          </CardContent>
        </Card>
      </div>

      <aside class="space-y-6 xl:sticky xl:top-6 xl:col-span-4">
        <AdminDashboardSessionCalendar
          v-model:selected-date="selectedDate"
          :session-counts="sessionCountsByDate"
          :sessions="selectedDaySessions"
        />
      </aside>
    </section>
  </div>
</template>
