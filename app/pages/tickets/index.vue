<script setup lang="ts">
import { ArrowRight, CalendarRange, MapPin, Ticket, UserRound } from '@lucide/vue'

const { data: ticketsResponse } = await useAPI(() => '/api/tickets')
const tickets = computed(() => ticketsResponse.value?.data ?? [])

function formatIssuedAt(value: string | Date) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatEventTime(value: string | Date | null | undefined) {
  if (!value) {
    return 'Time to be announced'
  }

  return new Date(value).toLocaleString('en-US', {
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
  title: 'My tickets',
  breadcrumb: 'Tickets',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main class="space-y-6 pb-8 pt-6">
    <section
      v-if="tickets.length > 0"
      class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
    >
      <NuxtLink
        v-for="ticket in tickets"
        :key="ticket.id"
        :to="`/tickets/${ticket.publicId}`"
        class="group relative block overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div class="h-1.5 bg-gradient-to-r from-primary via-primary/55 to-transparent" />

        <div class="space-y-5 p-5">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 space-y-3">
              <Badge
                variant="secondary"
                class="w-fit capitalize"
              >
                {{ ticket.status }}
              </Badge>
              <h2 class="line-clamp-2 text-xl font-semibold tracking-tight">
                {{ ticket.event?.title || ticket.publicId }}
              </h2>
              <p class="flex items-center gap-2 truncate text-sm text-muted-foreground">
                <UserRound class="size-3.5 shrink-0" />
                <span class="truncate">{{ ticket.attendeeEmail }}</span>
              </p>
            </div>

            <div class="rounded-lg border bg-muted/30 px-2.5 py-2 text-right">
              <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {{ $t('tickets.detail_issued') }}
              </p>
              <p class="mt-1 whitespace-nowrap font-mono text-xs">
                {{ formatIssuedAt(ticket.issuedAt) }}
              </p>
            </div>
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

            <div class="mt-5 flex items-center justify-between gap-3 text-sm">
              <span class="text-muted-foreground">
                {{ $t('tickets.open_digital_pass') }}
              </span>
              <span class="inline-flex items-center gap-1 font-medium text-primary transition-transform duration-300 group-hover:translate-x-1">
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
        <EmptyTitle>Your first issued ticket will appear here.</EmptyTitle>
        <EmptyDescription>
          This wallet stores the QR pass, seat assignment, and event timing.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div class="flex gap-2">
          <Button
            as-child
            class="rounded-full"
          >
            <NuxtLink to="/events">
              Browse events
            </NuxtLink>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  </main>
</template>
