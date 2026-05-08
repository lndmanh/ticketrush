<script setup lang="ts">
import { CalendarRange, LayoutGrid, MapPinned, Users } from '@lucide/vue'
import AdminFeaturedEventCard from '@/components/admin/events/AdminFeaturedEventCard.vue'

interface AdminDashboardEvent {
  id: number
  title: string
  status: string
  startsAt: string | Date
  salesStartAt: string | Date
  updatedAt?: string | Date | null
  venue?: {
    name: string
    city: string
  } | null
}

interface AdminDashboardVenue {
  id: number
  name: string
  city: string
  capacity?: number
  updatedAt?: string | Date | null
}

const { data: eventsResponse } = await useFetch('/api/admin/events')
const { data: venuesResponse } = await useFetch('/api/admin/venues')

const events = computed<AdminDashboardEvent[]>(() => eventsResponse.value?.success ? eventsResponse.value.data : [])
const venues = computed<AdminDashboardVenue[]>(() => venuesResponse.value?.success ? venuesResponse.value.data : [])

const draftEvents = computed(() => events.value.filter(event => event.status === 'draft'))
const publishedEvents = computed(() => events.value.filter(event => event.status !== 'draft'))

const upcomingEvents = computed(() => {
  const now = Date.now()

  return [...events.value]
    .filter((event) => {
      const startsAt = new Date(event.startsAt).getTime()
      return Number.isFinite(startsAt) && startsAt >= now
    })
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
})

const nextEvent = computed(() => upcomingEvents.value[0] ?? null)
const featuredEvent = computed(() => nextEvent.value ?? recentEvents.value[0] ?? null)

const recentEvents = computed(() => {
  return [...events.value]
    .sort((left, right) => {
      const leftUpdatedAt = new Date(left.updatedAt ?? left.startsAt).getTime()
      const rightUpdatedAt = new Date(right.updatedAt ?? right.startsAt).getTime()
      return rightUpdatedAt - leftUpdatedAt
    })
    .slice(0, 4)
})

const cityCoverage = computed(() => new Set(venues.value.map(venue => venue.city)).size)

const largestVenue = computed(() => {
  return [...venues.value].sort((left, right) => (right.capacity ?? 0) - (left.capacity ?? 0))[0] ?? null
})

definePageMeta({
  title: 'Admin Dashboard',
  breadcrumb: 'Admin',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-4">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold text-foreground">
          Admin dashboard
        </h1>
        <p class="text-sm text-muted-foreground">
          Events, venues, and account activity in one place.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card class="overflow-hidden border-0 bg-linear-to-br from-foreground/92 via-foreground/86 to-foreground/76 text-background shadow-sm">
          <CardContent class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-background/70">
                Events
              </p>
              <CalendarRange class="size-4 text-background/80" />
            </div>
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-[-0.06em]">
                {{ events.length }}
              </p>
              <p class="text-sm leading-6 text-background/72">
                Tracked launches in the admin catalog.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card class="overflow-hidden border-0 bg-linear-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow-sm">
          <CardContent class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-white/70">
                Venues
              </p>
              <MapPinned class="size-4 text-white/80" />
            </div>
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-[-0.06em]">
                {{ venues.length }}
              </p>
              <p class="text-sm leading-6 text-white/80">
                Blueprint coverage across active rooms.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card class="overflow-hidden border-0 bg-linear-to-br from-cyan-400 via-sky-400 to-blue-500 text-white shadow-sm">
          <CardContent class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-white/70">
                Drafts
              </p>
              <LayoutGrid class="size-4 text-white/80" />
            </div>
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-[-0.06em]">
                {{ draftEvents.length }}
              </p>
              <p class="text-sm leading-6 text-white/80">
                Events still being prepared for launch.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card class="overflow-hidden border-0 bg-linear-to-br from-emerald-400 via-teal-400 to-cyan-400 text-white shadow-sm">
          <CardContent class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-white/70">
                Live
              </p>
              <Users class="size-4 text-white/80" />
            </div>
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-[-0.06em]">
                {{ publishedEvents.length }}
              </p>
              <p class="text-sm leading-6 text-white/80">
                Programs currently visible to buyers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="space-y-4">
      <AdminFeaturedEventCard
        v-if="featuredEvent"
        eyebrow="Next launch"
        :title="featuredEvent.title"
        :venue-name="featuredEvent.venue?.name || 'Venue pending'"
        :starts-at="featuredEvent.startsAt"
        :status="featuredEvent.status"
        :href="`/admin/events/${featuredEvent.id}`"
        open-label="Open event"
        :secondary-label="$t('admin.events.event_registry')"
        secondary-href="/admin/events"
        :leading-icon="CalendarRange"
      />

      <p
        v-else
        class="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground"
      >
        {{ $t('admin.no_upcoming_launches') }}
      </p>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between gap-3">
          <CardTitle>{{ $t('admin.recent_events') }}</CardTitle>
          <Button
            as-child
            size="sm"
            variant="outline"
          >
            <NuxtLink to="/admin/events">
              {{ $t('admin.events.view_all') }}
            </NuxtLink>
          </Button>
        </CardHeader>
        <CardContent class="space-y-3">
          <NuxtLink
            v-for="event in recentEvents"
            :key="event.id"
            :to="`/admin/events/${event.id}`"
            class="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/50"
          >
            <div class="relative shrink-0">
              <div class="h-12 w-9 rounded bg-muted flex items-center justify-center">
                <CalendarRange class="size-4 text-muted-foreground" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {{ $t('admin.recent_update') }}
              </p>
              <p class="truncate text-sm font-semibold leading-tight text-foreground">
                {{ event.title }}
              </p>
              <p class="truncate text-xs text-muted-foreground">
                {{ event.venue?.name || $t('admin.venue_pending') }} · {{ new Date(event.startsAt).toLocaleString() }}
              </p>
            </div>
            <div class="shrink-0 text-xs text-muted-foreground">
              {{ event.status.replaceAll('_', ' ') }}
            </div>
          </NuxtLink>

          <p
            v-if="recentEvents.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ $t('admin.no_recent_events') }}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between gap-3">
          <CardTitle>{{ $t('admin.venue_coverage') }}</CardTitle>
          <Button
            as-child
            size="sm"
            variant="outline"
          >
            <NuxtLink to="/admin/venues">
              {{ $t('admin.events.view_all') }}
            </NuxtLink>
          </Button>
        </CardHeader>
        <CardContent class="grid gap-3 md:grid-cols-2">
          <Card class="py-3 overflow-hidden border-0 bg-linear-to-br from-violet-400 via-fuchsia-400 to-rose-400 text-white shadow-sm">
            <CardContent class="flex h-full items-center justify-between gap-3 px-4">
              <div>
                <p class="text-[11px] uppercase tracking-[0.24em] text-white/70">
                  Cities
                </p>
                <p class="text-lg font-semibold">
                  {{ cityCoverage }}
                </p>
              </div>
              <MapPinned class="size-4 text-white/85" />
            </CardContent>
          </Card>
          <Card class="py-3 overflow-hidden border-0 bg-linear-to-br from-slate-900 via-slate-700 to-slate-500 text-white shadow-sm">
            <CardContent class="flex h-full items-center justify-between gap-3 px-4">
              <div>
                <p class="text-[11px] uppercase tracking-[0.24em] text-white/70">
                  Largest room
                </p>
                <p class="text-lg font-semibold">
                  {{ largestVenue?.capacity || 0 }}
                </p>
              </div>
              <LayoutGrid class="size-4 text-white/85" />
            </CardContent>
          </Card>
          <div class="md:col-span-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            {{ largestVenue ? `${largestVenue.name} in ${largestVenue.city} is currently the largest venue.` : 'Add venue blueprints to start tracking coverage.' }}
          </div>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
