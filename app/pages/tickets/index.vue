<script setup lang="ts">
import { ArrowRight, CalendarRange, MapPin, Ticket, UserRound } from '@lucide/vue'
import { OrderStatus, TicketStatus } from '#shared/commonEnums'
import type { ApiResponse } from '~~/types/api'
import type { TicketListItem } from '~~/types/ticketing'
import { getDisplayDateLocale } from '@/lib/localizedEvents'

type TicketStatusFilter = 'all' | 'success' | 'processing' | 'cancelled'
type TicketTimeFilter = '24h' | '7d' | '30d' | 'all'

const { locale, t } = useI18n()
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
  if (selectedStatus.value === 'all') {
    return true
  }

  if (selectedStatus.value === 'success') {
    return ticket.status === TicketStatus.Issued || ticket.status === TicketStatus.CheckedIn || ticket.order?.status === OrderStatus.Confirmed
  }

  if (selectedStatus.value === 'processing') {
    return ticket.order?.status === OrderStatus.Pending
  }

  return ticket.status === TicketStatus.Cancelled || ticket.order?.status === OrderStatus.Cancelled
}

function matchesSelectedRange(value: string | Date) {
  if (selectedRange.value === 'all') {
    return true
  }

  const issuedAt = new Date(value).getTime()
  if (Number.isNaN(issuedAt)) {
    return false
  }

  const diff = Date.now() - issuedAt

  if (selectedRange.value === '24h') {
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000
  }

  if (selectedRange.value === '7d') {
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  }

  return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000
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

function getTicketStatusLabel(status: TicketStatus) {
  const key = `tickets.status_${status}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
}

definePageMeta({
  breadcrumb: 'nav.my_tickets',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main class="space-y-6 pb-8 pt-6">
    <div class="space-y-4">
      <TicketFilter
        v-model:selected-range="selectedRange"
        :total-tickets="tickets.length"
        :filtered-tickets="filteredTickets.length"
      />
      <TicketStatusTabs v-model="selectedStatus" />
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
