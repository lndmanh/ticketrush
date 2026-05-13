<script setup lang="ts">
import { ArrowRight, BadgeCheck, CalendarRange, MapPin, Ticket, UserRound } from '@lucide/vue'
import type { TicketListItem } from '~~/types/ticketing'

defineProps<{
  ticket: TicketListItem
  issuedAtLabel: string
  eventTimeLabel: string
  statusLabel: string
  shortTicketId: string
}>()
</script>

<template>
  <NuxtLink
    :to="`/tickets/${ticket.publicId}`"
    class="group relative block overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#10110d]/86 text-card-foreground shadow-xl shadow-black/20 outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-2xl hover:shadow-primary/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <div class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_16%_0%,hsl(var(--primary)/0.28),transparent_38%),radial-gradient(circle_at_92%_12%,rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] opacity-95" />
    <div class="pointer-events-none absolute bottom-0 right-0 size-32 rounded-full bg-primary/10 blur-3xl transition group-hover:bg-primary/20" />
    <div class="pointer-events-none absolute -left-2.5 top-1/2 hidden size-5 -translate-y-1/2 rounded-full border border-border bg-background sm:block" />
    <div class="pointer-events-none absolute -right-2.5 top-1/2 hidden size-5 -translate-y-1/2 rounded-full border border-border bg-background sm:block" />

    <div class="relative space-y-3.5 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 space-y-2">
          <span class="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-primary shadow-sm shadow-primary/10">
            <BadgeCheck class="size-3" />
            {{ statusLabel }}
          </span>
          <h2 class="line-clamp-2 text-lg font-semibold tracking-[-0.04em] text-foreground">
            {{ ticket.event?.title || ticket.publicId }}
          </h2>
          <p class="flex items-center gap-1.5 truncate text-xs text-muted-foreground/80">
            <UserRound class="size-3 shrink-0" />
            <span class="truncate">{{ ticket.attendeeEmail }}</span>
          </p>
        </div>

        <div class="rounded-[0.95rem] border border-white/10 bg-black/35 px-2.5 py-2 text-right shadow-inner shadow-white/5 backdrop-blur">
          <p class="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            {{ $t('tickets.detail_issued') }}
          </p>
          <p class="mt-1 whitespace-nowrap font-mono text-[11px] text-foreground">
            {{ issuedAtLabel }}
          </p>
        </div>
      </div>

      <div class="border-t border-dashed pt-3.5">
        <div class="grid gap-2 text-sm">
          <div class="flex items-start gap-2.5 rounded-[1rem] border border-white/10 bg-white/[0.035] p-3 transition group-hover:border-primary/20 group-hover:bg-primary/[0.055]">
            <CalendarRange class="mt-0.5 size-3.5 shrink-0 text-primary" />
            <div class="min-w-0">
              <p class="text-[11px] text-muted-foreground">{{ $t('tickets.event_time') }}</p>
              <p class="truncate text-sm font-medium">
                {{ eventTimeLabel }}
              </p>
            </div>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <div class="flex items-start gap-2.5 rounded-[1rem] border border-white/10 bg-white/[0.035] p-3 transition group-hover:border-primary/20 group-hover:bg-primary/[0.055]">
              <MapPin class="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div class="min-w-0">
                <p class="text-[11px] text-muted-foreground">{{ $t('tickets.seat_label') }}</p>
                <p class="truncate text-sm font-medium">
                  {{ ticket.orderItem?.sectionLabel || $t('tickets.detail_general_admission') }} · {{ ticket.orderItem?.seatLabel || $t('tickets.ga') }}
                </p>
              </div>
            </div>

            <div class="flex items-start gap-2.5 rounded-[1rem] border border-white/10 bg-white/[0.035] p-3 transition group-hover:border-primary/20 group-hover:bg-primary/[0.055]">
              <Ticket class="mt-0.5 size-3.5 shrink-0 text-primary" />
              <div class="min-w-0">
                <p class="text-[11px] text-muted-foreground">{{ $t('tickets.ticket_label') }}</p>
                <p class="truncate font-mono text-xs font-medium text-foreground">
                  #{{ shortTicketId }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3.5 flex items-center justify-between gap-3 text-xs">
          <span class="text-muted-foreground">
            {{ $t('tickets.open_digital_pass') }}
          </span>
          <span class="inline-flex items-center gap-1 font-medium text-primary transition-transform duration-300 group-hover:translate-x-1">
            {{ $t('tickets.view_pass') }}
            <ArrowRight class="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
