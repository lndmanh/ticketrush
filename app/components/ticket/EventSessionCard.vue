<script setup lang="ts">
import { ArrowRight, Clock3, LucideSparkles, Ticket } from '@lucide/vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import type { PublicEventSessionSummary, PublicSessionSectionPriceSummary } from '~~/types/events'
import { EventStatus } from '#shared/commonEnums'

const { locale, t } = useI18n()

const props = defineProps<{
  session: PublicEventSessionSummary
  sectionPrices: PublicSessionSectionPriceSummary[]
  eventSlug: string
}>()

const bookingPath = computed(() => `/events/${props.eventSlug}/sessions/${props.session.publicId}/seats`)
const dateLocale = computed(() => getDisplayDateLocale(locale.value))

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

  return (props.session.status === EventStatus.Published || props.session.status === EventStatus.OnSale)
    && salesStartAt <= now
    && salesEndAt >= now
    && props.sectionPrices.length > 0
})

const statusLabel = computed(() => {
  const key = `event_card.status_${props.session.status}`
  const translated = t(key)
  return translated === key ? props.session.status.replaceAll('_', ' ') : translated
})

const availabilityLabel = computed(() => {
  if (props.sectionPrices.length === 0) {
    return t('event_card.section_sales_not_open')
  }

  return t('event_card.sections_available', { count: props.sectionPrices.length })
})

const lowestTicket = computed(() => {
  let lowest: PublicSessionSectionPriceSummary | null = null

  for (const sectionPrice of props.sectionPrices) {
    if (!lowest || sectionPrice.priceCents < lowest.priceCents) {
      lowest = sectionPrice
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
              <LucideSparkles class="size-3" />
              {{ statusLabel }}
            </span>
            <div>
              <CardTitle class="text-2xl tracking-[-0.05em] md:text-3xl">
                {{ session.label }}
              </CardTitle>
              <div class="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
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
            {{ lowestTicket ? t('event_card.from_label') : t('event_card.pricing_label') }}
          </p>
          <p class="mt-1 text-sm font-semibold text-foreground">
            {{ lowestTicket ? formatCurrency(lowestTicket.priceCents, lowestTicket.currency) : t('event_card.section_pricing_coming_soon') }}
          </p>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="sectionPrice in sectionPrices.slice(0, 4)"
          :key="sectionPrice.venueSectionId"
          class="rounded-[1.25rem] border border-border bg-secondary/25 p-4"
        >
          <div class="flex items-start gap-3">
            <span
              class="mt-1 size-2.5 rounded-full"
              :style="{ backgroundColor: sectionPrice.sectionColorSnapshot }"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-foreground">
                {{ sectionPrice.sectionNameSnapshot }}
              </p>
              <p class="mt-1 font-mono text-xs text-muted-foreground">
                {{ formatCurrency(sectionPrice.priceCents, sectionPrice.currency) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="sectionPrices.length === 0"
          class="rounded-[1.25rem] border border-dashed border-primary/25 bg-primary/5 p-5 text-sm text-muted-foreground sm:col-span-2"
        >
          <p class="font-medium text-foreground">
            {{ t('event_card.section_pricing_coming_soon') }}
          </p>
          <p class="mt-1 leading-6">
            {{ t('event_card.section_pricing_coming_soon_desc') }}
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
            {{ t('event_card.book_tickets') }}
            <ArrowRight class="size-4" />
          </NuxtLink>
        </Button>
        <Button
          v-else
          class="rounded-full"
          disabled
        >
          {{ t('event_card.unavailable') }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
