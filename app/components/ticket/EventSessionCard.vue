<script setup lang="ts">
import { CalendarDays, Clock3, Ticket } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PublicEventSessionSummary, PublicTicketTypeSummary } from '~~/types/events'

const props = defineProps<{
  session: PublicEventSessionSummary
  ticketTypes: PublicTicketTypeSummary[]
  eventSlug: string
}>()

const bookingPath = computed(() => `/events/${props.eventSlug}/sessions/${props.session.publicId}/seats`)

const startsAtLabel = computed(() => new Date(props.session.startsAt).toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}))

const timeRangeLabel = computed(() => {
  const startsAt = new Date(props.session.startsAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (!props.session.endsAt) {
    return startsAt
  }

  const endsAt = new Date(props.session.endsAt).toLocaleTimeString('en-US', {
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
})

const bookingLabel = computed(() => {
  if (props.session.status === 'sold_out') {
    return 'Sold out'
  }

  if (new Date(props.session.salesStartAt).getTime() > Date.now()) {
    return 'Sales open soon'
  }

  if (new Date(props.session.salesEndAt).getTime() < Date.now()) {
    return 'Sales ended'
  }

  return isBookable.value ? 'Book tickets' : 'Unavailable'
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
  return `${Intl.NumberFormat('en-US').format(value / 100)} ${currency}`
}
</script>

<template>
  <Card class="group overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5">
    <CardHeader class="space-y-4 pb-4">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow w-fit">
            {{ session.status.replaceAll('_', ' ') }}
          </span>
          <div>
            <CardTitle class="text-2xl tracking-[-0.04em]">
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

        <div class="rounded-[1.25rem] bg-accent px-4 py-3 text-left sm:text-right">
          <p class="text-xs text-muted-foreground">
            From
          </p>
          <p class="mt-1 font-mono text-sm font-semibold text-foreground">
            {{ lowestTicket ? formatCurrency(lowestTicket.priceCents, lowestTicket.currency) : 'TBA' }}
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
                {{ ticketType.name }}
              </p>
              <p class="mt-1 font-mono text-xs text-muted-foreground">
                {{ formatCurrency(ticketType.priceCents, ticketType.currency) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="ticketTypes.length === 0"
          class="rounded-[1.25rem] border border-dashed border-border p-4 text-sm text-muted-foreground sm:col-span-2"
        >
          Ticket releases will appear once sales are configured.
        </div>
      </div>

      <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Ticket class="size-4" />
          {{ ticketTypes.length }} release{{ ticketTypes.length === 1 ? '' : 's' }} available
        </p>

        <Button
          v-if="isBookable"
          as-child
          class="rounded-full"
        >
          <NuxtLink :to="bookingPath">
            Book tickets
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
