<script setup lang="ts">
import {
  ArrowRight,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  MapPin,
  Ticket,
  UsersRound,
} from '@lucide/vue'
import { Motion, motion } from 'motion-v'
import type { PaginatedApiResponse } from '~~/types/api'
import type { EventCatalogItem, EventCatalogQueryOptions } from '~~/types/events'
import { EventCatalogSort } from '#shared/commonEnums'
import { getVietnamProvinceName } from '#shared/constants/vietnamProvinces'

const { t, locale } = useI18n()

const FEATURED_EVENT_LIMIT = 8
const STADIUM_IMAGE = 'https://images.pexels.com/photos/31007653/pexels-photo-31007653.jpeg'

const featuredEventsQuery = computed<Pick<EventCatalogQueryOptions, 'locale' | 'page' | 'pageSize' | 'sort'>>(() => ({
  locale: locale.value,
  page: 1,
  pageSize: FEATURED_EVENT_LIMIT,
  sort: EventCatalogSort.Soonest,
}))

const featuredSectionRef = ref<HTMLElement | null>(null)
const carouselRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const {
  data: featuredEventsResponse,
  pending: featuredEventsPending,
  error: featuredEventsFetchError,
} = await useAPI<PaginatedApiResponse<EventCatalogItem[]>>(() => '/api/events', {
  query: featuredEventsQuery,
})

const featuredEvents = computed(() => {
  const response = featuredEventsResponse.value
  if (!response || !response.success) {
    return []
  }

  return response.data
})

const heroPreviewEvent = computed(() => featuredEvents.value[0] ?? null)
const upcomingEvents = computed(() => featuredEvents.value.slice(1))

const featuredEventsError = computed(() => {
  if (featuredEventsFetchError.value) {
    return t('home.featured_error')
  }

  const response = featuredEventsResponse.value
  if (!response || response.success) {
    return ''
  }

  return t('home.featured_error')
})

const featuredEventsEmptyMessage = computed(() => {
  if (featuredEventsPending.value) {
    return t('home.featured_curating')
  }

  return t('home.featured_empty')
})

const featuredUniqueCities = computed(() => {
  const citySet = new Set(
    featuredEvents.value
      .map(event => getVietnamProvinceName(event.venue?.city, locale.value))
      .filter((city): city is string => Boolean(city)),
  )

  return citySet.size
})

const featuredSessionCount = computed(() => {
  return featuredEvents.value.reduce((count, event) => count + (event.sessions?.length ?? 0), 0)
})

const quickStatItems = computed(() => [
  {
    key: 'featured-drops',
    icon: Ticket,
    value: featuredEvents.value.length,
    title: t('home.quick_stat_featured_title'),
  },
  {
    key: 'active-sessions',
    icon: Clock3,
    value: featuredSessionCount.value,
    title: t('home.quick_stat_sessions_title'),
  },
  {
    key: 'active-cities',
    icon: UsersRound,
    value: featuredUniqueCities.value,
    title: t('home.quick_stat_cities_title'),
  },
])

const heroBackgroundImage = computed(() => {
  return STADIUM_IMAGE
})

const heroDropDate = computed(() => {
  return formatEventDate(heroPreviewEvent.value?.salesStartAt || heroPreviewEvent.value?.startsAt)
})

function formatEventDate(date: string | Date | null | undefined) {
  if (!date) {
    return t('home.live_soon')
  }

  return new Date(date).toLocaleString(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function scrollToFeatured() {
  featuredSectionRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function scrollUpcomingEvents(direction: 'left' | 'right') {
  const carousel = carouselRef.value
  if (!carousel) {
    return
  }

  carousel.scrollBy({
    left: direction === 'left' ? -360 : 360,
    behavior: 'smooth',
  })

  window.setTimeout(updateCarouselState, 320)
}

function updateCarouselState() {
  const carousel = carouselRef.value
  if (!carousel) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  canScrollLeft.value = carousel.scrollLeft > 4
  canScrollRight.value = carousel.scrollLeft + carousel.clientWidth < carousel.scrollWidth - 4
}

onMounted(() => updateCarouselState())

watch(upcomingEvents, async () => {
  await nextTick()
  updateCarouselState()
})

definePageMeta({
  defaultLayoutContained: false,
})
</script>

<template>
  <AppLayout
    class="relative min-h-full overflow-hidden"
    :hide-header="true"
  >
    <SmoothScroll>
      <section class="relative -mx-4 -mt-4 min-h-[100dvh] overflow-hidden bg-zinc-950 text-white md:-mx-6 md:-mt-6 lg:-mx-10">
        <motion.div
          :initial="{ scale: 1.08 }"
          :animate="{ scale: 1.02 }"
          :transition="{ duration: 8, ease: 'easeOut' }"
          class="absolute inset-0"
        >
          <NuxtImg
            :src="heroBackgroundImage"
            alt=""
            class="absolute inset-0 h-full w-full object-cover opacity-85 motion-safe:animate-[stadium-drift_18s_ease-in-out_infinite_alternate]"
            loading="eager"
            preload
          />
        </motion.div>
        <motion.div
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="{ duration: 1.8 }"
          class="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-blue-950/52 to-sky-950/18 md:from-slate-950/72 md:via-blue-950/38 md:to-transparent"
        />
        <div class="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div class="pointer-events-none absolute left-[12%] top-[18%] h-64 w-64 rounded-full bg-sky-400/12 blur-3xl" />

        <div class="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-end px-4 pb-28 pt-28 sm:px-6 lg:px-8 lg:pb-32">
          <Motion
            as="div"
            :initial="{ opacity: 0, y: 26 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.72, ease: 'easeOut' }"
            class="max-w-4xl space-y-8"
          >
            <div class="space-y-5">
              <h1 class="max-w-5xl text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.075em] text-white sm:text-6xl lg:text-8xl">
                {{ $t('home.title') }}
              </h1>
              <p class="max-w-2xl font-semibold text-base text-white md:text-lg">
                {{ $t('home.subtitle') }}
              </p>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <Button
                as-child
                size="lg"
                class="rounded-full bg-primary px-6 text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:translate-y-0"
              >
                <NuxtLink to="/events">
                  {{ $t('home.browse_all') }}
                  <ArrowRight class="size-4" />
                </NuxtLink>
              </Button>
              <Button
                as-child
                variant="outline"
                size="lg"
                class="rounded-full border-white/18 bg-white/8 px-6 text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/14 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:translate-y-0"
              >
                <NuxtLink to="/admin">
                  {{ $t('home.organizer_cta') }}
                </NuxtLink>
              </Button>
            </div>
          </Motion>

          <motion.div
            :initial="{ opacity: 0, y: 18 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ type: 'spring', stiffness: 100, damping: 20, delay: 1.4 }"
            class="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
          >
            <motion.button
              type="button"
              :while-hover="{ y: 4, scale: 1.15 }"
              :transition="{ type: 'spring', stiffness: 300 }"
              class="cursor-pointer text-primary/40 transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              @click="scrollToFeatured"
            >
              <ChevronDown class="h-5 w-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      <section
        ref="featuredSectionRef"
        class="relative -mx-4 bg-background px-4 py-16 md:-mx-6 md:px-6 md:py-24 lg:-mx-10 lg:px-10"
      >
        <div class="mx-auto max-w-7xl space-y-10">
          <Motion
            as="div"
            :initial="{ opacity: 0, y: 24 }"
            :while-in-view="{ opacity: 1, y: 0 }"
            :viewport="{ once: true, margin: '-120px' }"
            :transition="{ duration: 0.62, ease: 'easeOut' }"
            class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
          >
            <div class="space-y-3">
              <h2 class="text-balance text-4xl font-semibold leading-none tracking-[-0.06em]">
                {{ $t('home.featured_title') }}
              </h2>
            </div>

            <Button
              as-child
              variant="ghost"
              class="rounded-full"
            >
              <NuxtLink to="/events">
                {{ $t('home.view_all_events') }}
                <ArrowRight class="size-4" />
              </NuxtLink>
            </Button>
          </Motion>

          <Card
            v-if="featuredEventsError"
            class="border-destructive/30 bg-destructive/5 shadow-none"
          >
            <CardContent class="flex gap-3 p-5 text-sm text-destructive">
              <CircleAlert class="mt-0.5 size-4 shrink-0" />
              <p>{{ featuredEventsError }}</p>
            </CardContent>
          </Card>

          <div
            v-else-if="featuredEventsPending"
            class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]"
          >
            <div class="min-h-[30rem] animate-pulse rounded-[2.5rem] bg-muted/60" />
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div class="min-h-60 animate-pulse rounded-[2rem] bg-muted/50" />
              <div class="min-h-60 animate-pulse rounded-[2rem] bg-muted/50" />
            </div>
          </div>

          <template v-else-if="heroPreviewEvent">
            <Motion
              as="article"
              :initial="{ opacity: 0, y: 28 }"
              :while-in-view="{ opacity: 1, y: 0 }"
              :viewport="{ once: true, margin: '-120px' }"
              :transition="{ duration: 0.68, ease: 'easeOut' }"
              class="grid overflow-hidden rounded-[2.5rem] border bg-card shadow-[0_28px_80px_-42px_rgba(24,24,27,0.42)] lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.78fr)]"
            >
              <div class="relative min-h-[28rem] overflow-hidden lg:min-h-[36rem]">
                <img
                  :src="heroPreviewEvent.coverImage || STADIUM_IMAGE"
                  :alt="heroPreviewEvent.title"
                  class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                >
                <div class="absolute inset-0 bg-gradient-to-t from-zinc-950/76 via-zinc-950/18 to-transparent" />
                <div class="absolute bottom-5 left-5 right-5 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
                  <span class="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur-xl">
                    {{ $t('home.big_event') }}
                  </span>
                  <span class="rounded-full border border-white/14 bg-zinc-950/34 px-3 py-1.5 backdrop-blur-xl">
                    {{ heroDropDate }}
                  </span>
                </div>
              </div>

              <div class="flex flex-col justify-between gap-10 p-6 md:p-8 lg:p-10">
                <div class="space-y-6">
                  <div class="space-y-3">
                    <p class="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      <MapPin class="size-4" />
                      {{ getVietnamProvinceName(heroPreviewEvent.venue?.city, locale) || $t('home.live_soon') }}
                    </p>
                    <h3 class="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.06em] md:text-5xl">
                      {{ heroPreviewEvent.title }}
                    </h3>
                    <p class="text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                      {{ heroPreviewEvent.subtitle || $t('home.default_event_subtitle') }}
                    </p>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <div
                      v-for="item in quickStatItems"
                      :key="item.key"
                      class="rounded-[1.5rem] border bg-background/70 p-4"
                    >
                      <div class="mb-3 flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <component
                          :is="item.icon"
                          class="size-4"
                        />
                      </div>
                      <p class="font-mono text-2xl font-semibold tracking-[-0.06em]">
                        {{ item.value || 0 }}
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        {{ item.title }}
                      </p>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-3 sm:flex-row">
                  <Button
                    as-child
                    size="lg"
                    class="rounded-full"
                  >
                    <NuxtLink :to="`/events/${heroPreviewEvent.slug}`">
                      {{ $t('home.view_event') }}
                      <ArrowRight class="size-4" />
                    </NuxtLink>
                  </Button>
                  <Button
                    as-child
                    variant="outline"
                    size="lg"
                    class="rounded-full"
                  >
                    <NuxtLink to="/events">
                      {{ $t('home.browse_events_btn') }}
                    </NuxtLink>
                  </Button>
                </div>
              </div>
            </Motion>

            <section class="space-y-5">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="section-eyebrow">
                    {{ $t('home.upcoming_carousel_eyebrow') }}
                  </p>
                  <h3 class="mt-2 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">
                    {{ $t('home.upcoming_carousel_title') }}
                  </h3>
                </div>

                <div class="hidden items-center gap-2 sm:flex">
                  <Button
                    variant="outline"
                    size="icon"
                    class="rounded-full"
                    :disabled="!canScrollLeft"
                    :aria-label="$t('home.carousel_previous')"
                    @click="scrollUpcomingEvents('left')"
                  >
                    <ChevronLeft class="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    class="rounded-full"
                    :disabled="!canScrollRight"
                    :aria-label="$t('home.carousel_next')"
                    @click="scrollUpcomingEvents('right')"
                  >
                    <ChevronRight class="size-4" />
                  </Button>
                </div>
              </div>

              <div
                v-if="upcomingEvents.length > 0"
                ref="carouselRef"
                class="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
                data-lenis-prevent
                @scroll="updateCarouselState"
              >
                <Motion
                  v-for="(event, index) in upcomingEvents"
                  :key="event.id"
                  as="div"
                  :initial="{ opacity: 0, y: 22 }"
                  :while-in-view="{ opacity: 1, y: 0 }"
                  :viewport="{ once: true, margin: '-80px' }"
                  :transition="{ duration: 0.48, delay: index * 0.06, ease: 'easeOut' }"
                  class="w-[82vw] shrink-0 snap-start sm:w-[25rem]"
                >
                  <TicketEventCard :event="event" />
                </Motion>
              </div>

              <Card
                v-else
                class="rounded-[2rem] border-dashed bg-card/50 shadow-none"
              >
                <CardContent class="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                  <CalendarCheck2 class="size-5 shrink-0" />
                  <p>{{ $t('home.upcoming_carousel_empty') }}</p>
                </CardContent>
              </Card>
            </section>
          </template>

          <Empty
            v-else
            class="rounded-[2rem] border bg-card/60 py-14"
          >
            <EmptyHeader>
              <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border bg-muted/40">
                <CalendarCheck2 class="size-5 text-muted-foreground" />
              </div>
              <EmptyTitle>{{ $t('home.featured_warming_up') }}</EmptyTitle>
              <EmptyDescription>
                {{ featuredEventsEmptyMessage }}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              as-child
              variant="outline"
              class="mt-5 rounded-full"
            >
              <NuxtLink to="/events">
                {{ $t('home.browse_full_catalog') }}
              </NuxtLink>
            </Button>
          </Empty>
        </div>
      </section>
    </SmoothScroll>
  </AppLayout>
</template>

<style scoped>
@keyframes stadium-drift {
  from {
    transform: scale(1.05) translate3d(0, 0, 0);
  }

  to {
    transform: scale(1.11) translate3d(-1.4rem, -0.8rem, 0);
  }
}
</style>
