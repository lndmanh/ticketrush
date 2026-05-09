<script setup lang="ts">
import { Eye, LockKeyhole, Map, Ticket } from '@lucide/vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AdminChartCard from '@/components/admin/charts/AdminChartCard.vue'

const { t } = useI18n()

const route = useRoute()
const eventId = computed(() => Number(route.params.id))
const selectedStatus = ref<'all' | 'available' | 'locked' | 'sold'>('all')

const { detail, dashboard } = await useAdminEventWorkspace(eventId, {
  poll: true,
  includeOps: false,
})

const { createBarChartOption, createDonutChartOption } = useAdminChartTheme()

const filteredSeats = computed(() => {
  if (!detail.value?.seats) {
    return []
  }

  return detail.value.seats.filter((seat) => {
    return selectedStatus.value === 'all' || seat.status === selectedStatus.value
  })
})

const sectionCount = computed(() => new Set(filteredSeats.value.map(seat => seat.sectionNameSnapshot)).size)

const topSections = computed(() => {
  if (!dashboard.value?.salesBySection) {
    return []
  }

  return Object.entries(dashboard.value.salesBySection)
    .sort((left, right) => right[1].sold - left[1].sold)
    .slice(0, 4)
})

const seatStatusOption = computed(() => {
  return createDonutChartOption({
    data: [
      { label: t('common.available'), value: detail.value?.seats.filter(seat => seat.status === 'available').length ?? 0 },
      { label: t('common.held'), value: detail.value?.seats.filter(seat => seat.status === 'locked').length ?? 0 },
      { label: t('common.sold'), value: detail.value?.seats.filter(seat => seat.status === 'sold').length ?? 0 },
    ],
    centerValue: `${dashboard.value?.soldSeatsCount || 0}`,
    centerLabel: t('admin_event_seatmap.sold_seats'),
  })
})

const sectionSoldOption = computed(() => {
  return createBarChartOption({
    data: topSections.value.map(([section, row]) => ({
      label: section,
      value: row.sold,
    })),
    colorIndex: 1,
  })
})

definePageMeta({
  title: 'Event seat map',
  breadcrumb: 'Seat map',
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

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.1fr)] xl:auto-rows-fr">
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Ticket class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_seatmap.available_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ dashboard.availableSeatsCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin_event_seatmap.available_desc', { count: filteredSeats.length }) }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <LockKeyhole class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_seatmap.active_holds_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ dashboard.activeHoldsCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin_event_seatmap.active_holds_desc') }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent>
          <div class="flex items-center gap-3 text-muted-foreground">
            <Map class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_seatmap.sections_label') }}</span>
          </div><p class="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {{ sectionCount }}
          </p><p class="mt-2 text-sm text-muted-foreground">
            {{ $t('admin_event_seatmap.sections_desc') }}
          </p>
        </CardContent>
      </Card>
      <Card class="h-full">
        <CardContent class="flex h-full flex-col justify-between gap-4">
          <div class="flex items-center gap-3 text-muted-foreground">
            <Eye class="size-4" /><span class="text-[11px] uppercase tracking-[0.22em]">{{ $t('admin_event_seatmap.status_filter_label') }}</span>
          </div><Select v-model="selectedStatus">
            <SelectTrigger><SelectValue :placeholder="$t('admin_event_seatmap.filter_placeholder')" /></SelectTrigger><SelectContent>
              <SelectItem value="all">
                {{ $t('admin_event_seatmap.all_statuses') }}
              </SelectItem><SelectItem value="available">
                {{ $t('admin_event_seatmap.available') }}
              </SelectItem><SelectItem value="locked">
                {{ $t('admin_event_seatmap.held') }}
              </SelectItem><SelectItem value="sold">
                {{ $t('admin_event_seatmap.sold') }}
              </SelectItem>
            </SelectContent>
          </Select><p class="text-sm text-muted-foreground">
            {{ $t('admin_event_seatmap.status_filter_desc') }}
          </p>
        </CardContent>
      </Card>
    </section>
    <section>
      <TicketEventSeatMapExperience
        :seats="filteredSeats"
        :ticket-types="detail.ticketTypes"
        :action-label="null"
        mode="admin"
      />
    </section>

    <section class="grid gap-4 xl:grid-cols-12 xl:auto-rows-fr">
      <div class="grid gap-4 xl:col-span-5 xl:auto-rows-fr">
        <AdminChartCard
          eyebrow="Inventory"
          :title="$t('admin.event_chart_seat_status')"
          description="Current inventory split across available, held, and sold seats."
          :option="seatStatusOption"
          :height="260"
          tone="emerald"
          :stat="`${dashboard.availableSeatsCount}`"
          stat-label="Ready now"
        />
        <AdminChartCard
          eyebrow="Ranking"
          :title="$t('admin_event_seatmap.sections_by_sold_seats')"
          description="Section ranking based on sold inventory."
          :option="sectionSoldOption"
          :height="260"
          tone="amber"
          :stat="`${topSections.length}`"
          stat-label="Visible leaders"
        />
      </div>

      <Card class="h-full xl:col-span-6">
        <CardHeader><CardTitle>{{ $t('admin_event_seatmap.top_sections') }}</CardTitle></CardHeader>
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
                  {{ row.sold }} {{ $t('common.sold') }}
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
            {{ $t('admin_event_seatmap.no_section_movement') }}
          </p>
        </CardContent>
      </Card>

      <Card class="h-full xl:col-span-6">
        <CardHeader><CardTitle>{{ $t('admin_event_seatmap.queue_pulse') }}</CardTitle></CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {{ $t('admin_event_seatmap.waiting') }}
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ dashboard.queueWaitingCount }}
            </p>
          </div>
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {{ $t('admin_event_seatmap.admitted') }}
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ dashboard.queueAdmittedCount }}
            </p>
          </div>
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {{ $t('admin_event_seatmap.sold_seats') }}
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ dashboard.soldSeatsCount }}
            </p>
          </div>
          <div class="rounded-[1.25rem] border border-border bg-secondary/30 p-4">
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {{ $t('admin_event_seatmap.sections_in_view') }}
            </p><p class="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ sectionCount }}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
