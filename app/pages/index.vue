<script setup lang="ts">
import {
  ArrowRight,
  CalendarCheck2,
  CircleAlert,
  Clock3,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  UsersRound,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Motion } from 'motion-v'
import type { EventCatalogQueryOptions } from '~~/types/events'

const { t } = useI18n()

const FEATURED_EVENT_LIMIT = 3

const featuredEventsQuery: Pick<EventCatalogQueryOptions, 'page' | 'pageSize' | 'sort'> = {
  page: 1,
  pageSize: FEATURED_EVENT_LIMIT,
  sort: 'soonest',
}

const searchInput = ref('')
const {
  data: featuredEventsResponse,
  pending: featuredEventsPending,
  error: featuredEventsFetchError,
} = await useAPI(() => '/api/events', {
  query: featuredEventsQuery,
})

const featuredEvents = computed(() => {
  const response = featuredEventsResponse.value
  if (!response || !response.success) {
    return []
  }

  return response.data
})

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

const heroPreviewEvent = computed(() => featuredEvents.value[0] ?? null)

const featuredUniqueCities = computed(() => {
  const citySet = new Set(
    featuredEvents.value
      .map(event => event.venue?.city?.trim())
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
    title: t('home.quick_stat_sessions_desc'),
    hint: t('home.featured_eyebrow'),
  },
  {
    key: 'active-sessions',
    icon: Clock3,
    value: featuredSessionCount.value,
    title: t('home.quick_stat_live_title'),
    hint: t('home.quick_stat_live_desc'),
  },
  {
    key: 'active-cities',
    icon: UsersRound,
    value: featuredUniqueCities.value,
    title: t('home.quick_stat_safe_title'),
    hint: t('home.quick_stat_safe_desc'),
  },
])

const heroImage = computed(() => {
  return heroPreviewEvent.value?.coverImage || 'https://picsum.photos/seed/ticketrush-home/1200/900'
})

const heroDropDate = computed(() => {
  const date = heroPreviewEvent.value?.salesStartAt || heroPreviewEvent.value?.startsAt
  if (!date) {
    return t('home.live_soon')
  }

  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

async function searchEvents() {
  const trimmedSearch = searchInput.value.trim()

  await navigateTo({
    path: '/events',
    query: trimmedSearch ? { q: trimmedSearch } : {},
  })
}
</script>

<template>
  <AppLayout
    class="relative flex min-h-full flex-1 flex-col overflow-hidden"
    :hide-header="true"
  >
    <!-- Enhanced hero background with multiple layers -->
    <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52rem] overflow-hidden">
      <!-- Primary radial glow -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_-10%,oklch(0.47_0.27_277_/_0.20),transparent_60%),radial-gradient(ellipse_60%_50%_at_85%_5%,oklch(0.64_0.22_290_/_0.14),transparent_50%),radial-gradient(ellipse_40%_40%_at_50%_100%,oklch(0.47_0.27_277_/_0.08),transparent_60%)]" />
      <!-- Noise texture overlay for depth -->
      <div class="absolute inset-0 opacity-[0.015] [background-image:url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E&quot;)]" />
    </div>

    <section class="grid gap-8 pb-10 pt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(23rem,0.74fr)] lg:items-stretch lg:pb-14">
      <div class="surface-shell overflow-hidden">
        <div class="surface-core relative flex min-h-[34rem] flex-col justify-between overflow-hidden px-5 py-6 md:px-8 md:py-8">
          <div class="pointer-events-none absolute -right-28 -top-28 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div class="pointer-events-none absolute bottom-10 left-10 h-px w-1/2 bg-linear-to-r from-primary/60 to-transparent" />

          <div class="relative space-y-8">
            <Motion
              tag="div"
              :initial="{ opacity: 0, y: -12 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, ease: 'easeOut' }"
            >
              <Badge
                variant="outline"
                class="w-fit rounded-full border-primary/30 bg-primary/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-primary shadow-sm"
              >
                <Sparkles class="size-3.5" />
                {{ $t('home.badge') }}
              </Badge>
            </Motion>

            <div class="space-y-5">
              <Motion
                tag="h1"
                class="display-title max-w-5xl text-balance md:text-7xl"
                :initial="{ opacity: 0, y: 24 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }"
              >
                <span class="gradient-text">{{ $t('home.title') }}</span>
              </Motion>
              <Motion
                tag="p"
                class="max-w-[48rem] text-base leading-8 text-muted-foreground md:text-lg"
                :initial="{ opacity: 0, y: 16 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.5, delay: 0.22, ease: 'easeOut' }"
              >
                {{ $t('home.subtitle') }}
              </Motion>
            </div>

            <Motion
              tag="form"
              class="grid gap-3 rounded-[2rem] border border-border/70 bg-background/80 p-2 shadow-sm backdrop-blur md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              :initial="{ opacity: 0, y: 16 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.34, ease: 'easeOut' }"
              @submit.prevent="searchEvents"
            >
              <div class="space-y-2">
                <Label
                  for="homepage-event-search"
                  class="sr-only"
                >
                  {{ $t('home.search_label') }}
                </Label>
                <div class="relative">
                  <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="homepage-event-search"
                    v-model="searchInput"
                    class="h-12 rounded-full border-0 bg-transparent pl-11 text-base shadow-none focus-visible:ring-0"
                    :placeholder="$t('home.search_placeholder')"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                class="h-12 rounded-full px-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                {{ $t('home.search_button') }}
                <ArrowRight class="size-4" />
              </Button>
            </Motion>

            <Motion
              tag="div"
              class="flex flex-col gap-3 sm:flex-row"
              :initial="{ opacity: 0, y: 12 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.46, ease: 'easeOut' }"
            >
              <Button
                as-child
                variant="secondary"
                class="rounded-full px-5 transition-all duration-300 hover:-translate-y-0.5"
              >
                <NuxtLink to="/events">
                  {{ $t('home.browse_all') }}
                  <ArrowRight class="size-4" />
                </NuxtLink>
              </Button>
              <Button
                as-child
                variant="ghost"
                class="rounded-full px-5 text-muted-foreground hover:text-foreground"
              >
                <NuxtLink to="/admin">
                  {{ $t('home.organizer_cta') }}
                </NuxtLink>
              </Button>
            </Motion>
          </div>

          <div class="relative mt-8 grid gap-3 sm:grid-cols-3">
            <Motion
              v-for="(item, idx) in quickStatItems"
              :key="item.key"
              tag="div"
              class="rounded-[1.5rem] border bg-background/80 p-4 backdrop-blur transition-all hover:-translate-y-1 hover:bg-background/95 hover:shadow-md hover:shadow-primary/10 hover:border-primary/20"
              :initial="{ opacity: 0, y: 20 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.55 + idx * 0.1, ease: 'easeOut' }"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <div class="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                  <component
                    :is="item.icon"
                    class="size-4 text-primary"
                  />
                </div>
                <span class="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 font-mono text-[13px] font-bold text-primary">
                  {{ item.value || 0 }}
                </span>
              </div>
              <p class="text-sm font-semibold leading-5 tracking-[-0.02em] text-foreground">
                {{ item.title }}
              </p>
              <p class="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {{ item.hint }}
              </p>
            </Motion>
          </div>
        </div>
      </div>

      <div class="surface-shell overflow-hidden">
        <div class="surface-core relative min-h-[34rem] overflow-hidden p-0">
          <img
            :src="heroImage"
            :alt="heroPreviewEvent?.title || $t('home.hero_img_alt')"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
          >
          <!-- Richer gradient overlay with color tint -->
          <div class="absolute inset-0 bg-[linear-gradient(160deg,oklch(0.47_0.27_277_/_0.08),rgba(0,0,0,0.55)_40%,rgba(0,0,0,0.92))]" />
          <div class="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary via-primary/70 to-transparent" />

          <div class="relative z-10 flex min-h-[34rem] flex-col justify-between gap-8 p-5 text-white md:p-6">
            <div class="flex items-start justify-between gap-4">
              <span class="section-eyebrow border-white/10 bg-white/8 text-white">
                {{ $t('home.upcoming_drop') }}
              </span>
              <span class="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/76 backdrop-blur-sm">
                {{ heroDropDate }}
              </span>
            </div>

            <div class="space-y-5">
              <div class="max-w-2xl space-y-3">
                <p class="text-sm font-medium uppercase tracking-[0.24em] text-white/64">
                  {{ heroPreviewEvent?.venue?.city || $t('home.live_soon') }}
                </p>
                <h2 class="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.07em] md:text-5xl">
                  {{ heroPreviewEvent?.title || $t('home.hero_fallback_title') }}
                </h2>
                <p class="max-w-[34rem] text-sm leading-6 text-white/76 md:text-base md:leading-7">
                  {{ heroPreviewEvent?.subtitle || $t('home.hero_fallback_subtitle') }}
                </p>
              </div>

              <div class="rounded-[1.75rem] border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
                <div class="mb-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/64">
                  <span class="rounded-full border border-white/10 bg-white/8 px-3 py-1">
                    {{ heroPreviewEvent?.status?.replaceAll('_', ' ') || $t('home.buyer_preview') }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/8 px-3 py-1">
                    {{ $t('home.quick_stat_live_title') }}
                  </span>
                </div>
                <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div class="space-y-1">
                    <p class="text-[11px] uppercase tracking-[0.18em] text-white/64">
                      {{ $t('common.venue') }}
                    </p>
                    <p class="text-sm leading-6 text-white/86 md:text-base">
                      {{ heroPreviewEvent?.venue?.name || $t('home.browse_catalog_venues') }}
                    </p>
                  </div>

                  <Button
                    as-child
                    variant="secondary"
                    class="rounded-full"
                  >
                    <NuxtLink :to="heroPreviewEvent ? `/events/${heroPreviewEvent.slug}` : '/events'">
                      {{ heroPreviewEvent ? $t('home.view_event') : $t('home.browse_events_btn') }}
                    </NuxtLink>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid gap-3 pb-10 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="(item, idx) in [
          { icon: ShieldCheck, titleKey: 'home.trust_holds_title', descKey: 'home.trust_holds_desc' },
          { icon: Clock3, titleKey: 'home.trust_countdown_title', descKey: 'home.trust_countdown_desc' },
          { icon: UsersRound, titleKey: 'home.trust_attendees_title', descKey: 'home.trust_attendees_desc' },
          { icon: Ticket, titleKey: 'home.trust_reserved_title', descKey: 'home.trust_reserved_desc' },
        ]"
        :key="idx"
        class="group flex min-h-28 gap-4 rounded-[1.75rem] border bg-card/70 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/95 hover:border-primary/20 hover:shadow-sm"
      >
        <div class="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-background text-primary shadow-sm transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/8 group-hover:shadow-primary/10">
          <component
            :is="item.icon"
            class="size-4 transition-transform duration-300 group-hover:scale-110"
          />
        </div>
        <div class="min-w-0 space-y-1.5">
          <p class="text-base font-semibold tracking-[-0.03em]">
            {{ $t(item.titleKey) }}
          </p>
          <p class="text-sm leading-6 text-muted-foreground">
            {{ $t(item.descKey) }}
          </p>
        </div>
      </div>
    </section>

    <section class="space-y-6 pb-8">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow">
            {{ $t('home.featured_eyebrow') }}
          </span>
          <div class="space-y-3">
            <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-5xl">
              {{ $t('home.featured_title') }}
            </h2>
            <p class="max-w-[42rem] text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
              {{ $t('home.featured_subtitle') }}
            </p>
          </div>
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
      </div>

      <Card
        v-if="featuredEventsError"
        class="border-destructive/30 bg-destructive/5 shadow-none"
      >
        <CardContent class="flex gap-3 p-5 text-sm text-destructive">
          <CircleAlert class="mt-0.5 size-4 shrink-0" />
          <p>{{ featuredEventsError }}</p>
        </CardContent>
      </Card>

      <section
        v-if="featuredEvents.length > 0"
        class="soft-grid lg:grid-cols-3"
      >
        <TicketEventCard
          v-for="event in featuredEvents"
          :key="event.id"
          :event="event"
        />
      </section>

      <Empty
        v-else-if="!featuredEventsError"
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
    </section>

    <Card class="overflow-hidden border-muted/70 bg-card/60 shadow-none backdrop-blur">
      <CardContent class="relative grid gap-6 overflow-hidden p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
        <div class="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-primary/10 blur-3xl" />
        <div class="flex gap-4">
          <div class="hidden size-12 items-center justify-center rounded-full border bg-secondary text-muted-foreground sm:flex">
            <ShieldCheck class="size-5" />
          </div>
          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {{ $t('home.organizer_eyebrow') }}
            </p>
            <h2 class="text-2xl font-semibold tracking-[-0.05em] md:text-3xl">
              {{ $t('home.organizer_title') }}
            </h2>
            <p class="max-w-[42rem] text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
              {{ $t('home.organizer_subtitle') }}
            </p>
          </div>
        </div>

        <Button
          as-child
          variant="outline"
          class="rounded-full"
        >
          <NuxtLink to="/admin">
            {{ $t('home.organizer_open_console') }}
          </NuxtLink>
        </Button>
      </CardContent>
    </Card>
  </AppLayout>
</template>
