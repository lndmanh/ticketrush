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
import type { PaginatedApiResponse } from '~~/types/api'
import type { EventCatalogItem, EventCatalogQueryOptions } from '~~/types/events'

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
} = await useFetch<PaginatedApiResponse<EventCatalogItem[]>>('/api/events', {
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

const heroImage = computed(() => {
  return heroPreviewEvent.value?.coverImage || 'https://picsum.photos/seed/ticketrush-home/1200/900'
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
    class="flex flex-1 flex-col min-h-full space-y-6"
    :hide-header="true"
  >
    <section class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)] lg:items-center">
      <div class="space-y-8">
        <div class="space-y-6">
          <Badge
            variant="outline"
            class="w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
          >
            <Sparkles class="size-3.5" />
            {{ $t('home.badge') }}
          </Badge>

          <div class="space-y-5">
            <h1 class="display-title max-w-5xl text-balance">
              {{ $t('home.title') }}
            </h1>
            <p class="max-w-[44rem] text-base leading-8 text-muted-foreground md:text-lg">
              {{ $t('home.subtitle') }}
            </p>
          </div>
        </div>

        <form
          class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
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
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="homepage-event-search"
                v-model="searchInput"
                class="h-12 rounded-full pl-10"
                :placeholder="$t('home.search_placeholder')"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            class="h-12 rounded-full px-5"
          >
            {{ $t('home.search_button') }}
            <ArrowRight class="size-4" />
          </Button>
        </form>

        <div class="flex flex-col gap-3 sm:flex-row">
          <Button
            as-child
            size="lg"
            class="rounded-full px-6"
          >
            <NuxtLink to="/events">
              {{ $t('home.browse_all') }}
              <ArrowRight class="size-4" />
            </NuxtLink>
          </Button>
          <Button
            as-child
            variant="ghost"
            size="lg"
            class="rounded-full px-6 text-muted-foreground"
          >
            <NuxtLink to="/admin">
              {{ $t('home.organizer_cta') }}
            </NuxtLink>
          </Button>
        </div>
      </div>

      <div class="surface-shell overflow-hidden">
        <div class="surface-core relative min-h-[32rem] overflow-hidden p-0">
          <img
            :src="heroImage"
            :alt="heroPreviewEvent?.title || $t('home.hero_img_alt')"
            class="absolute inset-0 h-full w-full object-cover grayscale"
          >
          <div class="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9),rgba(0,0,0,0.5),rgba(0,0,0,0.14))]" />

          <div class="relative z-10 flex min-h-[32rem] flex-col justify-between gap-8 p-5 text-white md:p-6">
            <div class="flex items-start justify-between gap-4">
              <span class="section-eyebrow border-white/10 bg-white/8 text-white">
                {{ $t('home.upcoming_drop') }}
              </span>
              <span class="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/76 backdrop-blur-sm">
                {{ $t('home.buyer_preview') }}
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

    <section class="space-y-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow">
            {{ $t('home.featured_eyebrow') }}
          </span>
          <div class="space-y-3">
            <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
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
      <CardContent class="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
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
