<script setup lang="ts">
import { ArrowRight, CalendarDays, Clock3, Sparkles, Ticket } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDisplayDateLocale, getLocalizedTicketTypeName } from '@/lib/localizedEvents'
import type { PublicEventSessionSummary, PublicTicketTypeSummary } from '~~/types/events'

const { locale, t } = useI18n()
const localePath = useLocalePath()

const props = defineProps<{
  session: PublicEventSessionSummary
  ticketTypes: PublicTicketTypeSummary[]
  eventSlug: string
}>()

const bookingPath = computed(() => localePath(`/events/${props.eventSlug}/sessions/${props.session.publicId}/seats`))

const dateLocale = computed(() => getDisplayDateLocale(locale.value))

const sessionCardCopy = computed(() => {
  if (locale.value === 'vi') {
    return {
      soldOut: 'Hết vé',
      ticketsComingSoon: 'Vé sắp mở bán',
      salesOpenSoon: 'Sắp mở bán',
      salesEnded: 'Đã kết thúc bán',
      bookTickets: 'Đặt vé',
      unavailable: 'Không khả dụng',
      sessionSalesNotOpen: 'Suất diễn này chưa mở bán.',
      releasesAvailable: (count: number) => `${count} đợt bán có sẵn`,
      fromLabel: 'Từ',
      pricingLabel: 'Giá vé',
      comingSoon: 'Sắp có',
      ticketReleasesComingSoonDesc: 'Suất diễn này chưa mở bán. Hãy quay lại sớm để xem giá vé và tình trạng ghế.',
    }
  }

  return {
    soldOut: 'Sold out',
    ticketsComingSoon: 'Tickets coming soon',
    salesOpenSoon: 'Sales open soon',
    salesEnded: 'Sales ended',
    bookTickets: 'Book tickets',
    unavailable: 'Unavailable',
    sessionSalesNotOpen: 'Sales have not opened for this session.',
    releasesAvailable: (count: number) => `${count} release${count === 1 ? '' : 's'} available`,
    fromLabel: 'From',
    pricingLabel: 'Pricing',
    comingSoon: 'Coming soon',
    ticketReleasesComingSoonDesc: 'Sales have not opened for this session yet. Check back soon for pricing and seat availability.',
  }
})

const startsAtLabel = computed(() => new Date(props.session.startsAt).toLocaleDateString(dateLocale.value, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}))

const monthLabel = computed(() => new Date(props.session.startsAt).toLocaleDateString(dateLocale.value, {
  month: 'short',
}))

const dayLabel = computed(() => new Date(props.session.startsAt).toLocaleDateString(dateLocale.value, {
  day: '2-digit',
}))

const weekdayLabel = computed(() => new Date(props.session.startsAt).toLocaleDateString(dateLocale.value, {
  weekday: 'short',
}))

const timeRangeLabel = computed(() => {
  const startsAt = new Date(props.session.startsAt).toLocaleTimeString(dateLocale.value, {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (!props.session.endsAt) {
    return startsAt
  }

  const endsAt = new Date(props.session.endsAt).toLocaleTimeString(dateLocale.value, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${startsAt} – ${endsAt}`
})

const isBookable = computed(() => {
  const now = Date.now()
  const salesStartAt = new Date(props.session.salesStartAt).getTime()
  const salesEndAt = new Date(props.session.salesEndAt).getTime()

  return (props.session.status === 'published' || props.session.status === 'on_sale')
    && salesStartAt <= now
    && salesEndAt >= now
    && props.ticketTypes.length > 0
})

const bookingLabel = computed(() => {
  if (props.session.status === 'sold_out') {
    return sessionCardCopy.value.soldOut
  }

  if (props.ticketTypes.length === 0) {
    return sessionCardCopy.value.ticketsComingSoon
  }

  if (new Date(props.session.salesStartAt).getTime() > Date.now()) {
    return sessionCardCopy.value.salesOpenSoon
  }

  if (new Date(props.session.salesEndAt).getTime() < Date.now()) {
    return sessionCardCopy.value.salesEnded
  }

  return isBookable.value ? sessionCardCopy.value.bookTickets : sessionCardCopy.value.unavailable
})

const statusLabel = computed(() => {
  const key = `event_card.status_${props.session.status}`
  const translated = t(key)
  return translated === key ? props.session.status.replaceAll('_', ' ') : translated
})

const availabilityLabel = computed(() => {
  if (props.ticketTypes.length === 0) {
    return sessionCardCopy.value.sessionSalesNotOpen
  }

  return sessionCardCopy.value.releasesAvailable(props.ticketTypes.length)
})

const lowestTicket = computed(() => {
  let lowest: PublicTicketTypeSummary | null = null

  for (const ticketType of props.ticketTypes) {
    if (!lowest || ticketType.priceCents < lowest.priceCents) {
      lowest = ticketType
    }
  }

  return lowest
})

function formatCurrency(value: number, currency: string) {
  return `${Intl.NumberFormat(dateLocale.value).format(value / 100)} ${currency}`
}
</script>

<template>
  <Card class="group overflow-hidden border-border/70 bg-card/82 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10">
    <CardHeader class="relative space-y-4 pb-4">
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex gap-4">
          <div class="hidden min-w-20 rounded-[1.25rem] border border-primary/20 bg-primary/10 p-3 text-center shadow-sm sm:block">
            <p class="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              {{ monthLabel }}
            </p>
            <p class="mt-1 text-3xl font-semibold tabular-nums tracking-[-0.08em] text-foreground">
              {{ dayLabel }}
            </p>
            <p class="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {{ weekdayLabel }}
            </p>
          </div>

          <div class="space-y-3">
            <span class="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
              <Sparkles class="size-3" />
              {{ statusLabel }}
            </span>
            <div>
              <CardTitle class="text-2xl tracking-[-0.05em] md:text-3xl">
                {{ session.label }}
              </CardTitle>
              <div class="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span class="inline-flex items-center gap-2">
                  <CalendarDays class="size-4" />
                  {{ startsAtLabel }}
                </span>
                <span class="inline-flex items-center gap-2">
                  <Clock3 class="size-4" />
                  {{ timeRangeLabel }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-[1.25rem] border border-border/70 bg-accent/80 px-4 py-3 text-left shadow-sm sm:text-right">
          <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {{ lowestTicket ? sessionCardCopy.fromLabel : sessionCardCopy.pricingLabel }}
          </p>
          <p class="mt-1 text-sm font-semibold text-foreground">
            {{ lowestTicket ? formatCurrency(lowestTicket.priceCents, lowestTicket.currency) : sessionCardCopy.comingSoon }}
          </p>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="ticketType in ticketTypes.slice(0, 4)"
          :key="ticketType.id"
          class="rounded-[1.25rem] border border-border bg-secondary/25 p-4"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-1 size-2.5 rounded-full"
              :style="{ backgroundColor: ticketType.color }"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">
                {{ getLocalizedTicketTypeName(ticketType.name, locale) }}
              </p>
              <p class="mt-1 font-mono text-xs text-muted-foreground">
                {{ formatCurrency(ticketType.priceCents, ticketType.currency) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="ticketTypes.length === 0"
          class="rounded-[1.25rem] border border-dashed border-primary/25 bg-primary/5 p-5 text-sm text-muted-foreground sm:col-span-2"
        >
          <p class="font-medium text-foreground">
            {{ sessionCardCopy.ticketsComingSoon }}
          </p>
          <p class="mt-1 leading-6">
            {{ sessionCardCopy.ticketReleasesComingSoonDesc }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Ticket class="size-4" />
          {{ availabilityLabel }}
        </p>

        <Button
          v-if="isBookable"
          as-child
          class="rounded-full"
        >
          <NuxtLink :to="bookingPath">
            {{ sessionCardCopy.bookTickets }}
            <ArrowRight class="ml-2 size-4" />
          </NuxtLink>
        </Button>
        <Button
          v-else
          class="rounded-full"
          disabled
        >
          {{ bookingLabel }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
