<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { CalendarClock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock3, List, MapPin, Ticket, ArrowRight } from '@lucide/vue'
import { Motion } from 'motion-v'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { cn, formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { getEventFallbackImage } from '@/utils/fallbackImages'
import { apiRoutes } from '#shared/apiRoutes'
import { EventCatalogSort, EventStatus } from '#shared/commonEnums'
import type { PaginatedApiResponse } from '~~/types/api'
import type { EventCatalogItem, EventDetailResponse, PublicEventSessionSummary, PublicSessionSectionPriceSummary } from '~~/types/events'

const route = useRoute()
const slug = computed(() => {
  const value = route.params.slug
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? ''
  return ''
})
const { locale, t } = useI18n()
const sessionsListRef = ref<HTMLElement | null>(null)
type SessionViewMode = 'list' | 'calendar'

const sessionViewMode = ref<SessionViewMode>('list')
const selectedDate = ref(getIsoDate(new Date()))
const RECOMMENDED_EVENT_FETCH_LIMIT = 8
const RECOMMENDED_EVENT_DISPLAY_LIMIT = 6
const recommendedCarouselRef = ref<HTMLElement | null>(null)
const canScrollRecommendationsLeft = ref(false)
const canScrollRecommendationsRight = ref(false)

const { data: detailResponse } = await useAPI<ApiResponse<EventDetailResponse>>(() => apiRoutes.event(slug.value), {
  query: computed(() => ({ locale: locale.value })),
})

const recommendedEventsQuery = computed(() => ({
  locale: locale.value,
  page: 1,
  pageSize: RECOMMENDED_EVENT_FETCH_LIMIT,
  sort: EventCatalogSort.Soonest,
}))

const { data: recommendedEventsResponse } = await useAPI<PaginatedApiResponse<EventCatalogItem[]>>(() => '/api/events', {
  query: recommendedEventsQuery,
})

const detail = computed(() => detailResponse.value?.success ? detailResponse.value.data : null)
const event = computed(() => detail.value?.event ?? null)
const venue = computed(() => detail.value?.venue?.venue ?? null)
const recommendationSeed = computed(() => event.value?.slug ?? slug.value)
const recommendedEvents = computed(() => {
  const response = recommendedEventsResponse.value

  if (!response || !response.success) {
    return []
  }

  return shuffleRecommendedEvents(
    response.data.filter(recommendedEvent => recommendedEvent.slug !== event.value?.slug),
    recommendationSeed.value,
  ).slice(0, RECOMMENDED_EVENT_DISPLAY_LIMIT)
})

const sortedSessions = computed(() => {
  return [...(detail.value?.sessions ?? [])].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })
})

const dateLocale = computed(() => getDisplayDateLocale(locale.value))

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

const selectedDateValue = computed<DateValue | undefined>({
  get() {
    return parseIsoDate(selectedDate.value) ?? today(getLocalTimeZone())
  },
  set(value) {
    if (value) {
      selectedDate.value = value.toString()
    }
  },
})

watch(sortedSessions, (sessions) => {
  if (sessions.length === 0) {
    selectedDate.value = getIsoDate(new Date())
    return
  }

  const hasSelectedDate = sessions.some(session => getIsoDate(new Date(session.startsAt)) === selectedDate.value)

  if (!hasSelectedDate) {
    selectedDate.value = getIsoDate(new Date(sessions[0].startsAt))
  }
}, { immediate: true })

const primarySession = computed(() => sortedSessions.value[0] ?? null)

const primarySessionTimeLabel = computed(() => {
  const session = primarySession.value

  if (!session) {
    return 'Time to be announced'
  }

  const displayLocale = getDisplayDateLocale(locale.value)
  const startsAt = formatTime(session.startsAt, displayLocale, {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (!session.endsAt) {
    return startsAt
  }

  const endsAt = formatTime(session.endsAt, displayLocale, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${startsAt} – ${endsAt}`
})

const startingPrice = computed(() => {
  const firstSession = primarySession.value

  if (!firstSession) {
    return null
  }

  const firstSectionPrice = firstSession.sectionPrices[0]

  if (!firstSectionPrice) {
    return null
  }

  return firstSession.sectionPrices.reduce((lowest, sectionPrice) => {
    return sectionPrice.priceCents < lowest.priceCents ? sectionPrice : lowest
  }, firstSectionPrice)
})

const startingPriceLabel = computed(() => {
  const price = startingPrice.value

  if (!price) {
    return 'Pricing to be announced'
  }

  return formatCurrency(price.priceCents, price.currency, getDisplayDateLocale(locale.value))
})

const dateRangeLabel = computed(() => {
  if (sortedSessions.value.length === 0) {
    return 'Dates to be announced'
  }

  const firstSession = sortedSessions.value[0]
  const lastSession = sortedSessions.value[sortedSessions.value.length - 1]
  const firstDate = new Date(firstSession.startsAt)
  const lastDate = new Date(lastSession.startsAt)
  const displayLocale = getDisplayDateLocale(locale.value)

  if (firstDate.toDateString() === lastDate.toDateString()) {
    return formatDate(firstDate, displayLocale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  return `${formatDate(firstDate, displayLocale, { month: 'short', day: 'numeric' })} – ${formatDate(lastDate, displayLocale, { month: 'short', day: 'numeric' })}`
})

const venueLabel = computed(() => {
  if (!venue.value) {
    return 'Venue to be announced'
  }

  return `${venue.value.name}, ${venue.value.city}`
})

function getIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month) || !Number.isSafeInteger(day)) {
    return null
  }

  return new CalendarDate(year, month, day)
}

function getSessionCount(day: DateValue) {
  return sessionCountsByDate.value[day.toString()] ?? 0
}

function getDayNumber(day: DateValue) {
  return new Date(`${day.toString()}T00:00:00`).getDate()
}

function formatSelectedDate(value: string) {
  return formatDate(`${value}T00:00:00`, dateLocale.value, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function getSessionTimeRangeLabel(session: PublicEventSessionSummary) {
  const startsAt = formatTime(session.startsAt, dateLocale.value, {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (!session.endsAt) {
    return startsAt
  }

  const endsAt = formatTime(session.endsAt, dateLocale.value, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${startsAt} – ${endsAt}`
}

function getLowestSectionPrice(sectionPrices: PublicSessionSectionPriceSummary[]) {
  const firstSectionPrice = sectionPrices[0]

  if (!firstSectionPrice) {
    return null
  }

  return sectionPrices.reduce((lowest, sectionPrice) => {
    return sectionPrice.priceCents < lowest.priceCents ? sectionPrice : lowest
  }, firstSectionPrice)
}

function getStringSeed(value: string) {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0)
}

function shuffleRecommendedEvents(events: EventCatalogItem[], seedValue: string) {
  const shuffled = [...events]
  let seed = getStringSeed(seedValue)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 9301 + 49297) % 233280
    const swapIndex = seed % (index + 1)
    const current = shuffled[index]
    const swap = shuffled[swapIndex]

    if (current && swap) {
      shuffled[index] = swap
      shuffled[swapIndex] = current
    }
  }

  return shuffled
}

function scrollRecommendedEvents(direction: 'left' | 'right') {
  const carousel = recommendedCarouselRef.value

  if (!carousel) {
    return
  }

  carousel.scrollBy({
    left: direction === 'left' ? -360 : 360,
    behavior: 'smooth',
  })

  window.setTimeout(updateRecommendedCarouselState, 320)
}

function updateRecommendedCarouselState() {
  const carousel = recommendedCarouselRef.value

  if (!carousel) {
    canScrollRecommendationsLeft.value = false
    canScrollRecommendationsRight.value = false
    return
  }

  canScrollRecommendationsLeft.value = carousel.scrollLeft > 4
  canScrollRecommendationsRight.value = carousel.scrollLeft + carousel.clientWidth < carousel.scrollWidth - 4
}

function getSessionPriceLabel(session: PublicEventSessionSummary) {
  const lowestPrice = getLowestSectionPrice(session.sectionPrices)

  if (!lowestPrice) {
    return t('event_card.section_pricing_coming_soon')
  }

  return formatCurrency(lowestPrice.priceCents, lowestPrice.currency, dateLocale.value)
}

function isSessionBookable(session: PublicEventSessionSummary) {
  const now = Date.now()
  const salesStartAt = new Date(session.salesStartAt).getTime()
  const salesEndAt = new Date(session.salesEndAt).getTime()

  return (session.status === EventStatus.Published || session.status === EventStatus.OnSale)
    && salesStartAt <= now
    && salesEndAt >= now
    && session.sectionPrices.length > 0
}

function getSessionStatusLabel(session: PublicEventSessionSummary) {
  const key = `event_card.status_${session.status}`
  const translated = t(key)
  return translated === key ? session.status.replaceAll('_', ' ') : translated
}

function getSessionBookingPath(session: PublicEventSessionSummary) {
  if (!event.value) {
    return '#'
  }

  return `/events/${event.value.slug}/sessions/${session.publicId}/seats`
}

function scrollToSessions() {
  sessionsListRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

onMounted(() => updateRecommendedCarouselState())

watch(recommendedEvents, async () => {
  await nextTick()
  updateRecommendedCarouselState()
})

if (!event.value) {
  await navigateTo('/404', { replace: true })
}

definePageMeta({
  title: 'Event detail',
  breadcrumb: 'Event',
})
</script>

<template>
  <main
    v-if="event"
    class-name="relative gap-8 overflow-hidden px-4 py-16 md:-mx-6 md:px-6 md:py-24 lg:-mx-10 lg:px-10"
  >
    <!-- Start of Event Info -->
    <section class="relative overflow-hidden rounded-[2rem] bg-card shadow-2xl shadow-black/20">
      <div class="pointer-events-none absolute bottom-0 left-[37.5%] top-0 z-10 hidden border-l border-dashed border-white/20 lg:block" />
      <div class="pointer-events-none absolute left-[37.5%] top-0 z-20 hidden size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background lg:block" />
      <div class="pointer-events-none absolute bottom-0 left-[37.5%] z-20 hidden size-14 -translate-x-1/2 translate-y-1/2 rounded-full bg-background lg:block" />

      <div class="grid lg:grid-cols-[3fr_5fr]">
        <div class="order-2 flex flex-col gap-8 bg-card/95 p-6 md:p-8 lg:order-1 lg:min-h-[28rem] lg:justify-between lg:p-10">
          <div class="space-y-6">
            <Badge
              variant="outline"
              class="w-fit border-primary/20 bg-primary/10 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"
            >
              {{ event.status.replaceAll('_', ' ') }}
            </Badge>

            <div class="space-y-4">
              <h1 class="text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.06em] text-foreground md:text-5xl">
                {{ event.title }}
              </h1>
              <p
                v-if="event.subtitle || event.description"
                class="text-sm leading-6 text-muted-foreground md:text-base md:leading-7"
              >
                {{ event.subtitle || event.description }}
              </p>
            </div>

            <div class="grid gap-4 text-sm">
              <div class="flex items-start gap-3">
                <CalendarRange
                  aria-hidden="true"
                  class="mt-0.5 size-4 text-primary"
                />
                <div class="space-y-2">
                  <p class="font-semibold leading-none text-foreground">
                    {{ primarySessionTimeLabel }}, {{ dateRangeLabel }}
                  </p>
                  <span
                    v-if="sortedSessions.length > 1"
                    class="inline-flex w-fit items-center rounded-md border border-border/70 px-2 py-1 text-xs font-medium text-muted-foreground"
                  >
                    + {{ sortedSessions.length - 1 }} more date{{ sortedSessions.length - 1 === 1 ? '' : 's' }}
                  </span>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <MapPin
                  aria-hidden="true"
                  class="mt-0.5 size-4 text-primary"
                />
                <div class="space-y-1">
                  <p class="font-semibold leading-none text-foreground">
                    {{ venue?.name || 'Venue to be announced' }}
                  </p>
                  <p class="text-muted-foreground">
                    {{ venue?.address || venueLabel }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-border/70 pt-5">
            <p class="text-sm font-semibold text-foreground whitespace-nowrap">
              Price starts from <span class="text-3xl ml-2 font-bold tracking-[-0.04em] text-primary inline-flex items-center gap-2">{{ startingPriceLabel }}
                <Motion
                  as="div"
                  :initial="{ x: 0 }"
                  :animate="{ x: 4 }"
                  :transition="{ duration: 0.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }"
                ><ArrowRight
                  aria-hidden="true"
                  class="size-5 text-primary"
                /></Motion>
              </span>
            </p>
            <Button
              class="mt-5 w-full"
              size="lg"
              type="button"
              @click="scrollToSessions"
            >
              <Ticket
                aria-hidden="true"
                class="size-4"
              />
              Mua vé ngay
            </Button>
          </div>
        </div>

        <div class="order-1 h-72 overflow-hidden md:h-96 lg:order-2 lg:h-auto lg:min-h-[28rem]">
          <img
            :src="event.coverImage || getEventFallbackImage(event.slug)"
            :alt="event.title"
            class="size-full object-cover"
          >
        </div>
      </div>
    </section>
    <!-- End of Event Info -->

    <section
      ref="sessionsListRef"
      class="scroll-mt-6 space-y-6 pt-6"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow">
            {{ $t('common.sessions') }}
          </span>
        </div>

        <div
          role="group"
          :aria-label="$t('event_detail.session_view')"
          class="inline-flex w-fit rounded-full border border-border/70 bg-card/80 p-1 shadow-sm"
        >
          <Button
            type="button"
            size="sm"
            :variant="sessionViewMode === 'list' ? 'default' : 'ghost'"
            class="rounded-full"
            :aria-pressed="sessionViewMode === 'list'"
            @click="sessionViewMode = 'list'"
          >
            <List
              aria-hidden="true"
              class="size-4"
            />
            {{ $t('event_detail.list_view') }}
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="sessionViewMode === 'calendar' ? 'default' : 'ghost'"
            class="rounded-full"
            :aria-pressed="sessionViewMode === 'calendar'"
            @click="sessionViewMode = 'calendar'"
          >
            <CalendarDays
              aria-hidden="true"
              class="size-4"
            />
            {{ $t('event_detail.calendar_view') }}
          </Button>
        </div>
      </div>

      <div
        v-if="sessionViewMode === 'list'"
        class="grid gap-4 lg:grid-cols-2"
      >
        <TicketEventSessionCard
          v-for="session in sortedSessions"
          :key="session.publicId"
          :session="session"
          :section-prices="session.sectionPrices"
          :event-slug="event.slug"
        />
      </div>

      <Card
        v-else
        class="overflow-hidden border-border/70 bg-card/90 shadow-sm"
      >
        <CardHeader class="space-y-2 border-b pb-4">
          <div>
            <CardTitle class="text-base">
              {{ $t('event_detail.session_calendar') }}
            </CardTitle>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ $t('event_detail.session_calendar_desc') }}
            </p>
          </div>
        </CardHeader>

        <CardContent class="space-y-5 pt-5">
          <CalendarRoot
            v-slot="{ grid, weekDays }"
            v-model="selectedDateValue"
            :week-starts-on="1"
            fixed-weeks
            prevent-deselect
            :locale="dateLocale"
            class="w-full"
          >
            <CalendarHeader class="mb-4 flex items-center justify-between gap-3">
              <CalendarPrev
                class="inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :aria-label="$t('event_detail.previous_month')"
              >
                <ChevronLeft
                  aria-hidden="true"
                  class="size-4"
                />
              </CalendarPrev>
              <CalendarHeading class="text-sm font-semibold text-foreground" />
              <CalendarNext
                class="inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                :aria-label="$t('event_detail.next_month')"
              >
                <ChevronRight
                  aria-hidden="true"
                  class="size-4"
                />
              </CalendarNext>
            </CalendarHeader>

            <CalendarGrid
              v-for="month in grid"
              :key="month.value.toString()"
              class="w-full border-separate border-spacing-y-1"
            >
              <CalendarGridHead>
                <CalendarGridRow class="grid grid-cols-7 gap-1">
                  <CalendarHeadCell
                    v-for="day in weekDays"
                    :key="day"
                    class="py-2 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {{ day }}
                  </CalendarHeadCell>
                </CalendarGridRow>
              </CalendarGridHead>
              <CalendarGridBody>
                <CalendarGridRow
                  v-for="(weekDates, index) in month.rows"
                  :key="`${month.value.toString()}-${index}`"
                  class="grid grid-cols-7 gap-1"
                >
                  <CalendarCell
                    v-for="day in weekDates"
                    :key="day.toString()"
                    :date="day"
                  >
                    <CalendarCellTrigger
                      v-slot="{ selected, today: isToday, outsideView }"
                      :day="day"
                      :month="month.value"
                      :class="cn(
                        'relative flex aspect-square min-h-10 w-full flex-col items-center justify-center rounded-xl text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        outsideView ? 'text-muted-foreground/35' : 'text-foreground hover:bg-muted',
                        isToday && !selected ? 'bg-primary/10 text-primary' : '',
                        selected ? 'bg-primary text-primary-foreground shadow-sm' : '',
                      )"
                    >
                      <span class="leading-none">{{ getDayNumber(day) }}</span>
                      <span
                        v-if="getSessionCount(day) > 0"
                        class="sr-only"
                      >
                        {{ $t('event_detail.sessions_on_date', { count: getSessionCount(day), date: formatSelectedDate(day.toString()) }) }}
                      </span>
                      <span
                        v-if="getSessionCount(day) > 0"
                        :class="cn(
                          'mt-1 h-1.5 min-w-1.5 rounded-full px-1 text-[9px] leading-[0.375rem]',
                          selected ? 'bg-primary-foreground/80 text-primary' : 'bg-primary/75 text-primary-foreground',
                        )"
                      >
                        {{ getSessionCount(day) > 1 ? getSessionCount(day) : '' }}
                      </span>
                    </CalendarCellTrigger>
                  </CalendarCell>
                </CalendarGridRow>
              </CalendarGridBody>
            </CalendarGrid>
          </CalendarRoot>

          <div class="border-t pt-5">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold tracking-[-0.02em] text-foreground">
                  {{ $t('event_detail.daily_sessions') }}
                </h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ formatSelectedDate(selectedDate) }}
                </p>
              </div>
              <Badge
                variant="outline"
                class="rounded-full"
              >
                {{ $t('event_detail.session_count', { count: selectedDaySessions.length }) }}
              </Badge>
            </div>

            <div class="space-y-3">
              <div
                v-for="session in selectedDaySessions"
                :key="session.publicId"
                class="rounded-2xl border bg-muted/25 p-4 transition-colors hover:border-primary/30 hover:bg-muted/40"
              >
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div class="min-w-0 space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-medium text-foreground">
                        {{ session.label }}
                      </p>
                      <Badge
                        variant="outline"
                        class="rounded-full"
                      >
                        {{ getSessionStatusLabel(session) }}
                      </Badge>
                    </div>
                    <div class="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span class="inline-flex items-center gap-2">
                        <Clock3
                          aria-hidden="true"
                          class="size-4"
                        />
                        {{ getSessionTimeRangeLabel(session) }}
                      </span>
                      <span class="inline-flex items-center gap-2">
                        <Ticket
                          aria-hidden="true"
                          class="size-4"
                        />
                        {{ getSessionPriceLabel(session) }}
                      </span>
                    </div>
                  </div>

                  <Button
                    v-if="isSessionBookable(session)"
                    as-child
                    class="w-full rounded-full md:w-auto"
                  >
                    <NuxtLink :to="getSessionBookingPath(session)">
                      {{ $t('event_card.book_tickets') }}
                    </NuxtLink>
                  </Button>
                  <Button
                    v-else
                    class="w-full rounded-full md:w-auto"
                    disabled
                  >
                    {{ $t('event_card.unavailable') }}
                  </Button>
                </div>
              </div>

              <Empty
                v-if="selectedDaySessions.length === 0"
                class="border bg-muted/20 py-10"
              >
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarClock
                      aria-hidden="true"
                      class="size-5"
                    />
                  </EmptyMedia>
                  <EmptyTitle>{{ $t('event_detail.no_sessions_day') }}</EmptyTitle>
                  <EmptyDescription>
                    {{ $t('event_detail.no_sessions_day_desc') }}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="sessionViewMode === 'list' && sortedSessions.length === 0">
        <CardContent class="p-8 text-center text-sm text-muted-foreground">
          {{ $t('event_detail.sessions_empty') }}
        </CardContent>
      </Card>
    </section>

    <section
      v-if="recommendedEvents.length > 0"
      class="space-y-5 pt-6"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-3">
          <p class="section-eyebrow">
            {{ $t('event_detail.recommended_eyebrow') }}
          </p>
          <div class="space-y-2">
            <h2 class="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground md:text-4xl">
              {{ $t('event_detail.recommended_title') }}
            </h2>
            <p class="max-w-2xl text-sm text-muted-foreground md:text-base">
              {{ $t('event_detail.recommended_desc') }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              size="icon"
              class="rounded-full"
              :disabled="!canScrollRecommendationsLeft"
              :aria-label="$t('event_detail.recommended_previous')"
              @click="scrollRecommendedEvents('left')"
            >
              <ChevronLeft
                aria-hidden="true"
                class="size-4"
              />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              class="rounded-full"
              :disabled="!canScrollRecommendationsRight"
              :aria-label="$t('event_detail.recommended_next')"
              @click="scrollRecommendedEvents('right')"
            >
              <ChevronRight
                aria-hidden="true"
                class="size-4"
              />
            </Button>
          </div>

          <Button
            as-child
            variant="ghost"
            class="rounded-full"
          >
            <NuxtLink to="/events">
              {{ $t('event_detail.check_more') }}
              <ArrowRight
                aria-hidden="true"
                class="size-4"
              />
            </NuxtLink>
          </Button>
        </div>
      </div>

      <div
        ref="recommendedCarouselRef"
        class="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        data-lenis-prevent
        @scroll="updateRecommendedCarouselState"
      >
        <div
          v-for="recommendedEvent in recommendedEvents"
          :key="recommendedEvent.id"
          class="w-[82vw] shrink-0 snap-start sm:w-[25rem]"
        >
          <TicketEventCard :event="recommendedEvent" />
        </div>
      </div>
    </section>
  </main>
</template>
