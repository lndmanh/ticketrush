<script setup lang="ts">
import {
  ArrowRight,
  CalendarCheck2,
  CircleAlert,
  Search,
  ShieldCheck,
  Sparkles,
} from '@lucide/vue'
import type { EventCatalogQueryOptions } from '~~/types/events'

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
} = await useFetch('/api/events', {
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
    return 'Featured events are temporarily unavailable. Browse the full catalog to keep exploring.'
  }

  const response = featuredEventsResponse.value
  if (!response || response.success) {
    return ''
  }

  return 'Featured events are temporarily unavailable. Browse the full catalog to keep exploring.'
})

const featuredEventsEmptyMessage = computed(() => {
  if (featuredEventsPending.value) {
    return 'Curating the next drops for you.'
  }

  return 'New events are being prepared. Browse the full catalog for the latest releases.'
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
            Live events, ready to book
          </Badge>

          <div class="space-y-5">
            <h1 class="display-title max-w-5xl text-balance">
              Find the show, choose the session, keep your seat.
            </h1>
            <p class="max-w-[44rem] text-base leading-8 text-muted-foreground md:text-lg">
              Browse upcoming drops, compare dates, and move into checkout with protected seat holds and mobile tickets built for busy nights.
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
              Search events
            </Label>
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="homepage-event-search"
                v-model="searchInput"
                class="h-12 rounded-full pl-10"
                placeholder="Search by event, venue, or city"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            class="h-12 rounded-full px-5"
          >
            Search events
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
              Browse all events
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
              Organizer console
            </NuxtLink>
          </Button>
        </div>
      </div>

      <div class="surface-shell overflow-hidden">
        <div class="surface-core relative min-h-[32rem] overflow-hidden p-0">
          <img
            :src="heroImage"
            :alt="heroPreviewEvent?.title || 'Audience waiting for a live event'"
            class="absolute inset-0 h-full w-full object-cover grayscale"
          >
          <div class="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9),rgba(0,0,0,0.5),rgba(0,0,0,0.14))]" />

          <div class="relative z-10 flex min-h-[32rem] flex-col justify-between gap-8 p-5 text-white md:p-6">
            <div class="flex items-start justify-between gap-4">
              <span class="section-eyebrow border-white/10 bg-white/8 text-white">
                Upcoming drop
              </span>
              <span class="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/76 backdrop-blur-sm">
                Buyer preview
              </span>
            </div>

            <div class="space-y-5">
              <div class="max-w-2xl space-y-3">
                <p class="text-sm font-medium uppercase tracking-[0.24em] text-white/64">
                  {{ heroPreviewEvent?.venue?.city || 'Live soon' }}
                </p>
                <h2 class="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.07em] md:text-5xl">
                  {{ heroPreviewEvent?.title || 'Your next night out starts here.' }}
                </h2>
                <p class="max-w-[34rem] text-sm leading-6 text-white/76 md:text-base md:leading-7">
                  {{ heroPreviewEvent?.subtitle || 'Search the catalog, pick a session, and keep your seats protected while you check out.' }}
                </p>
              </div>

              <div class="rounded-[1.75rem] border border-white/10 bg-black/35 p-4 backdrop-blur-sm">
                <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div class="space-y-1">
                    <p class="text-[11px] uppercase tracking-[0.18em] text-white/64">
                      Venue
                    </p>
                    <p class="text-sm leading-6 text-white/86 md:text-base">
                      {{ heroPreviewEvent?.venue?.name || 'Browse the catalog for live venues' }}
                    </p>
                  </div>

                  <Button
                    as-child
                    variant="secondary"
                    class="rounded-full"
                  >
                    <NuxtLink :to="heroPreviewEvent ? `/events/${heroPreviewEvent.slug}` : '/events'">
                      {{ heroPreviewEvent ? 'View event' : 'Browse events' }}
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
            Featured releases
          </span>
          <div class="space-y-3">
            <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
              Upcoming events worth checking first.
            </h2>
            <p class="max-w-[42rem] text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
              A small preview of the soonest live events. Use the catalog when you want filters, sorting, cities, and pagination.
            </p>
          </div>
        </div>

        <Button
          as-child
          variant="ghost"
          class="rounded-full"
        >
          <NuxtLink to="/events">
            View all events
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
          <EmptyTitle>Featured events are warming up</EmptyTitle>
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
            Browse the full catalog
          </NuxtLink>
        </Button>
      </Empty>
    </section>
  </AppLayout>
</template>
