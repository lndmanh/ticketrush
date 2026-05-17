<script setup lang="ts">
import { ArrowRight, CalendarRange, MapPin, Ticket, UserRound } from '@lucide/vue'
import { OrderStatus, TicketStatus } from '#shared/commonEnums'
import type { ApiResponse } from '~~/types/api'
import type { TicketListItem } from '~~/types/ticketing'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { timeRangeDurations } from '#shared/timeRangeDurations'

type TicketStatusFilter = 'all' | 'success' | 'processing' | 'cancelled'
type TicketTimeFilter = '24h' | '7d' | '30d' | 'all'

const { locale, t } = useI18n()

const rangeOptions = computed<Array<{ value: TicketTimeFilter, label: string }>>(() => [
  { value: '24h', label: t('tickets.last_24h') },
  { value: '7d', label: t('tickets.last_7_days') },
  { value: '30d', label: t('tickets.last_30_days') },
  { value: 'all', label: t('tickets.all_time') },
])

const statusTabs = computed<Array<{ value: TicketStatusFilter, label: string }>>(() => [
  { value: 'all', label: t('tickets.status_all') },
  { value: 'success', label: t('tickets.status_success') },
  { value: 'processing', label: t('tickets.status_processing') },
  { value: 'cancelled', label: t('tickets.status_cancelled') },
])
const selectedRange = ref<TicketTimeFilter>('7d')
const selectedStatus = ref<TicketStatusFilter>('all')

useSeo({
  title: computed(() => t('tickets.page_title')),
  description: computed(() => t('tickets.empty_subtitle')),
  type: 'website',
})

const { data: ticketsResponse } = await useAPI<ApiResponse<TicketListItem[]>>(() => '/api/tickets', {
  query: computed(() => ({ locale: locale.value })),
})

const tickets = computed(() => ticketsResponse.value?.data ?? [])

const filteredTickets = computed(() => {
  return tickets.value.filter((ticket) => {
    if (!matchesSelectedStatus(ticket)) {
      return false
    }

    return matchesSelectedRange(ticket.issuedAt)
  })
})

function matchesSelectedStatus(ticket: TicketListItem) {
  const isCancelled = ticket.status === TicketStatus.Cancelled || ticket.order?.status === OrderStatus.Cancelled

  if (selectedStatus.value === 'all') {
    return true
  }

  if (selectedStatus.value === 'success') {
    return !isCancelled
      && (ticket.status === TicketStatus.Issued || ticket.status === TicketStatus.CheckedIn || ticket.order?.status === OrderStatus.Confirmed)
  }

  if (selectedStatus.value === 'processing') {
    return ticket.order?.status === OrderStatus.Pending
  }

  return isCancelled
}

function getTicketStatusLabel(status: TicketStatus) {
  const key = `tickets.status_${status}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
}

function matchesSelectedRange(value: string | Date) {
  const range = selectedRange.value

  if (range === 'all') {
    return true
  }

  const issuedAt = new Date(value).getTime()
  if (Number.isNaN(issuedAt)) {
    return false
  }

  const duration = getTicketTimeRangeDuration(range)
  const diff = Date.now() - issuedAt

  return diff >= 0 && diff <= duration
}

function getTicketTimeRangeDuration(range: Exclude<TicketTimeFilter, 'all'>) {
  if (range === '24h') {
    return timeRangeDurations.last24Hours
  }

  if (range === '7d') {
    return timeRangeDurations.last7Days
  }

  return timeRangeDurations.last30Days
}

function formatEventTime(value: string | Date | null | undefined) {
  if (!value) {
    return t('tickets.time_tba')
  }

  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getShortTicketId(value: string) {
  return value.length > 10 ? value.slice(-10) : value
}

definePageMeta({
  breadcrumb: 'nav.my_tickets',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main class="space-y-6">
    <div class="space-y-4">
      <Card>
        <CardContent class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p class="text-sm text-muted-foreground">
            {{ $t('tickets.showing_count', { filtered: filteredTickets.length, total: tickets.length }) }}
          </p>

          <div class="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <Label
              for="ticket-time-range"
              class="shrink-0 text-sm font-semibold text-muted-foreground"
            >
              {{ $t('tickets.filter_by_date') }}
            </Label>
            <div class="w-full">
              <Select v-model="selectedRange">
                <SelectTrigger
                  id="ticket-time-range"
                >
                  <SelectValue :placeholder="$t('tickets.select_range')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in rangeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        v-model="selectedStatus"
        class="w-full"
      >
        <TabsList class="grid h-auto w-full grid-cols-2 gap-1 p-2 sm:grid-cols-4">
          <TabsTrigger
            v-for="tab in statusTabs"
            :key="tab.value"
            :value="tab.value"
            class="px-4 py-3 font-semibold"
          >
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    <section
      v-if="filteredTickets.length > 0"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <NuxtLink
        v-for="ticket in filteredTickets"
        :key="ticket.id"
        :to="`/tickets/${ticket.publicId}`"
        class="group relative block overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div class="h-1.5 bg-gradient-to-r from-primary via-primary/55 to-transparent" />

        <div class="space-y-5 p-5">
          <div class="min-w-0 space-y-3">
            <Badge
              variant="secondary"
              class="w-fit capitalize"
            >
              {{ getTicketStatusLabel(ticket.status) }}
            </Badge>
            <h2 class="line-clamp-2 text-xl font-semibold tracking-tight">
              {{ ticket.event?.title || ticket.publicId }}
            </h2>
            <p class="flex items-center gap-2 truncate text-sm text-muted-foreground">
              <UserRound class="size-3.5 shrink-0" />
              <span class="truncate">{{ ticket.attendeeName }}</span>
            </p>
          </div>

          <div class="relative border-t border-dashed pt-5">
            <span class="absolute -left-8 -top-3 size-6 rounded-full border bg-background transition-colors duration-300 group-hover:border-primary/50" />
            <span class="absolute -right-8 -top-3 size-6 rounded-full border bg-background transition-colors duration-300 group-hover:border-primary/50" />

            <div class="grid gap-3 text-sm">
              <div class="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                <CalendarRange class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div class="min-w-0">
                  <p class="text-xs text-muted-foreground">{{ $t('tickets.event_time') }}</p>
                  <p class="truncate font-medium">
                    {{ formatEventTime(ticket.event?.startsAt) }}
                  </p>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                  <MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">{{ $t('tickets.seat_label') }}</p>
                    <p class="truncate font-medium">
                      {{ ticket.orderItem?.sectionLabel || $t('tickets.detail_general_admission') }} · {{ ticket.orderItem?.seatLabel || $t('tickets.ga') }}
                    </p>
                  </div>
                </div>

                <div class="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                  <Ticket class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">{{ $t('tickets.ticket_label') }}</p>
                    <p class="truncate font-mono text-xs font-medium">
                      #{{ getShortTicketId(ticket.publicId) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-5 flex justify-end text-sm">
              <span class="inline-flex items-center gap-1 font-semibold text-emerald-500 transition-transform duration-300 group-hover:translate-x-1 dark:text-emerald-400">
                {{ $t('tickets.view_pass') }}
                <ArrowRight class="size-4" />
              </span>
            </div>
          </div>
        </div>
      </NuxtLink>
    </section>

    <Empty
      v-else
      class="rounded-xl border bg-card/60 py-16"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Ticket class="size-5" />
        </EmptyMedia>
        <EmptyTitle>{{ $t('tickets.empty_title') }}</EmptyTitle>
        <EmptyDescription>
          {{ $t('tickets.empty_wallet_desc') }}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div class="flex gap-2">
          <Button
            as-child
            class="rounded-full"
          >
            <NuxtLink to="/events">
              {{ $t('tickets.browse_events') }}
            </NuxtLink>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  </main>
</template>
