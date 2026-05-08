<script setup lang="ts">
import { Activity, LockKeyhole, ShoppingCart, Tickets } from '@lucide/vue'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'

const route = useRoute()
const eventId = computed(() => Number(route.params.id))

const { detail, ops } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: true,
})

const { createBarChartOption, createDonutChartOption } = useAdminChartTheme()

const orders = computed(() => ops.value?.recentOrders ?? [])
const tickets = computed(() => ops.value?.recentTickets ?? [])
const holds = computed(() => ops.value?.activeHolds ?? [])
const queueFeed = computed(() => ops.value?.queueFeed ?? [])

const operationsMixOption = computed(() => {
  if (!ops.value) {
    return createDonutChartOption({ data: [] })
  }

  return createDonutChartOption({
    data: [
      { label: 'Orders', value: ops.value.totals.ordersCount },
      { label: 'Tickets', value: ops.value.totals.ticketsCount },
      { label: 'Holds', value: ops.value.totals.activeHoldsCount },
      { label: 'Queue', value: ops.value.totals.queueEntriesCount },
    ],
  })
})

const queueStatusOption = computed(() => {
  const statusCounts = queueFeed.value.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.status] = (accumulator[entry.status] || 0) + 1
    return accumulator
  }, {})

  return createBarChartOption({
    data: Object.entries(statusCounts).map(([label, value]) => ({ label, value })),
    colorIndex: 1,
  })
})

const recentOrderSampleOption = computed(() => {
  return createBarChartOption({
    data: orders.value.map((order, index) => ({
      label: `#${index + 1}`,
      value: Math.round(order.amountCents / 100),
    })),
    colorIndex: 5,
    maxItems: 6,
  })
})

definePageMeta({
  title: 'Event operations',
  breadcrumb: 'Ops',
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

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:auto-rows-fr">
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <ShoppingCart class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_ops.orders_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ ops.totals.ordersCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            Recent commercial activity in this event.
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Tickets class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_ops.tickets_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ ops.totals.ticketsCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            Issued tickets in the current feed.
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <LockKeyhole class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_ops.active_holds_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ ops.totals.activeHoldsCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            Temporary inventory locks still open.
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Activity class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_ops.queue_entries_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ ops.totals.queueEntriesCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            Entries recorded in the queue feed.
          </p>
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <AdminChartCard
        class="xl:col-span-4"
        eyebrow="Footprint"
        :title="$t('admin_event_ops.operations_mix')"
        description="Current operations footprint across orders, tickets, holds, and queue entries."
        :option="operationsMixOption"
        :height="320"
        tone="emerald"
        :stat="`${ops.totals.ordersCount + ops.totals.ticketsCount}`"
        stat-label="Order + ticket volume"
      />
      <AdminChartCard
        class="xl:col-span-4"
        eyebrow="Queue"
        :title="$t('admin_event_ops.queue_status')"
        description="Distribution of queue entry statuses in the current feed."
        :option="queueStatusOption"
        :height="320"
        tone="blue"
        :stat="`${queueFeed.length}`"
        stat-label="Recent entries"
      />
      <AdminChartCard
        class="xl:col-span-4"
        eyebrow="Sample"
        :title="$t('admin_event_ops.recent_order_sample')"
        description="Latest order amounts shown as a recent-value sample, not a long-term trend."
        :option="recentOrderSampleOption"
        :height="320"
        tone="rose"
        :stat="`${orders.length}`"
        stat-label="Orders sampled"
      />

      <Card class="h-full xl:col-span-7">
        <CardHeader><CardTitle>{{ $t('admin_event_ops.orders_title') }}</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="order in orders"
            :key="order.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
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
            v-if="orders.length === 0"
            class="text-sm text-muted-foreground"
          >
            No orders yet.
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-5">
        <CardHeader><CardTitle>{{ $t('admin_event_ops.active_holds_title') }}</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="hold in holds"
            :key="hold.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ hold.publicId }}
                </p><p class="text-sm text-muted-foreground">
                  {{ hold.seatCount }} seat(s) · expires {{ new Date(hold.expiresAt).toLocaleTimeString() }}
                </p>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ hold.status }}
              </p>
            </div>
          </div>
          <p
            v-if="holds.length === 0"
            class="text-sm text-muted-foreground"
          >
            No active holds.
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-6">
        <CardHeader><CardTitle>{{ $t('admin_event_ops.tickets_title') }}</CardTitle></CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="ticket in tickets"
            :key="ticket.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <p class="text-sm font-medium text-foreground">
              {{ ticket.attendeeName }}
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ ticket.sectionLabel || 'GA' }} · {{ ticket.rowLabel || '' }}{{ ticket.rowLabel ? '-' : '' }}{{ ticket.seatLabel || 'Open seating' }}
            </p>
          </div>
          <p
            v-if="tickets.length === 0"
            class="text-sm text-muted-foreground sm:col-span-2"
          >
            No tickets issued yet.
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-6">
        <CardHeader><CardTitle>{{ $t('admin_event_ops.queue_feed_title') }}</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div
            v-for="entry in queueFeed"
            :key="entry.id"
            class="rounded-[1.25rem] border border-border p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-foreground">
                  {{ entry.customerKey }}
                </p><p class="text-sm text-muted-foreground">
                  Created {{ new Date(entry.createdAt).toLocaleString() }}
                </p>
              </div>
              <p class="text-xs text-muted-foreground">
                {{ entry.status }}
              </p>
            </div>
          </div>
          <p
            v-if="queueFeed.length === 0"
            class="text-sm text-muted-foreground"
          >
            No queue activity yet.
          </p>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
