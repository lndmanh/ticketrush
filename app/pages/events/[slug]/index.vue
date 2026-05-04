<script setup lang="ts">
import { CalendarRange, MapPin, Ticket, UserRound } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApiResponse } from '~~/types/api'
import type { EventDetailResponse } from '~~/types/events'

const route = useRoute()
const slug = computed(() => route.params.slug.toString())

const { data: detailResponse } = await useFetch<ApiResponse<EventDetailResponse>>(() => `/api/events/${slug.value}`)

const detail = computed(() => detailResponse.value?.success ? detailResponse.value.data : null)
const event = computed(() => detail.value?.event ?? null)
const venue = computed(() => detail.value?.venue?.venue ?? null)

const sortedSessions = computed(() => {
  return [...(detail.value?.sessions ?? [])].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })
})

const dateRangeLabel = computed(() => {
  if (sortedSessions.value.length === 0) {
    return 'Dates to be announced'
  }

  const firstSession = sortedSessions.value[0]
  const lastSession = sortedSessions.value[sortedSessions.value.length - 1]
  const firstDate = new Date(firstSession.startsAt)
  const lastDate = new Date(lastSession.startsAt)

  if (firstDate.toDateString() === lastDate.toDateString()) {
    return firstDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  return `${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
})

const venueLabel = computed(() => {
  if (!venue.value) {
    return 'Venue to be announced'
  }

  return `${venue.value.name}, ${venue.value.city}`
})

const releaseCount = computed(() => {
  return sortedSessions.value.reduce((total, session) => total + session.ticketTypes.length, 0)
})

definePageMeta({
  title: 'Event detail',
  breadcrumb: 'Event',
})
</script>

<template>
  <main
    v-if="detail && event"
    class="space-y-12 pb-16 pt-6 md:space-y-16 md:pb-24"
  >
    <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-stretch">
      <div class="surface-shell overflow-hidden">
        <div class="surface-core min-h-[34rem] overflow-hidden p-0">
          <div class="relative flex min-h-[34rem] flex-col justify-between overflow-hidden rounded-[calc(2rem-0.375rem)] bg-secondary p-5 md:p-8">
            <img
              :src="event.coverImage || `https://picsum.photos/seed/${event.slug}/1600/1100`"
              :alt="event.title"
              class="absolute inset-0 h-full w-full object-cover grayscale"
            >
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.9),rgba(0,0,0,0.48),rgba(0,0,0,0.12))]" />

            <div class="relative z-10 flex flex-wrap items-start justify-between gap-3">
              <span class="section-eyebrow border-white/10 bg-white/10 text-white">
                {{ event.status.replaceAll('_', ' ') }}
              </span>
              <span class="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] text-white/76 backdrop-blur-sm">
                {{ dateRangeLabel }}
              </span>
            </div>

            <div class="relative z-10 max-w-4xl space-y-5">
              <p class="text-sm uppercase tracking-[0.22em] text-white/58">
                {{ venueLabel }}
              </p>
              <h1 class="text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.08em] text-white md:text-7xl">
                {{ event.title }}
              </h1>
              <p class="max-w-[48rem] text-sm leading-7 text-white/76 md:text-base">
                {{ event.subtitle || event.description }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside class="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
        <TicketSummaryMetric
          label="Sessions"
          :value="sortedSessions.length"
          hint="Bookable dates"
        />
        <TicketSummaryMetric
          label="Releases"
          :value="releaseCount"
          hint="Ticket options"
        />
        <TicketSummaryMetric
          label="Venue"
          :value="venue?.city || 'TBA'"
          hint="Host city"
        />
      </aside>
    </section>

    <section class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
      <div class="space-y-4 xl:sticky xl:top-8">
        <span class="section-eyebrow">
          About
        </span>
        <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-5xl">
          Choose the date that fits your plans.
        </h2>
      </div>

      <div class="surface-shell">
        <div class="surface-core space-y-5">
          <p class="text-base leading-8 text-muted-foreground">
            {{ event.description }}
          </p>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-[1.5rem] bg-accent p-5">
              <CalendarRange class="size-5 text-muted-foreground" />
              <p class="mt-4 text-sm text-muted-foreground">
                Event dates
              </p>
              <p class="mt-1 font-medium text-foreground">
                {{ dateRangeLabel }}
              </p>
            </div>
            <div class="rounded-[1.5rem] bg-accent p-5">
              <Ticket class="size-5 text-muted-foreground" />
              <p class="mt-4 text-sm text-muted-foreground">
                Ticket releases
              </p>
              <p class="mt-1 font-medium text-foreground">
                {{ releaseCount }} across {{ sortedSessions.length }} session{{ sortedSessions.length === 1 ? '' : 's' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="space-y-6">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow">
            Sessions
          </span>
          <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-5xl">
            Select a session to book.
          </h2>
        </div>
        <p class="max-w-[30rem] text-sm leading-7 text-muted-foreground">
          Each session has its own start time, ticket releases, and seat map access.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <TicketEventSessionCard
          v-for="session in sortedSessions"
          :key="session.publicId"
          :session="session"
          :ticket-types="session.ticketTypes"
          :event-slug="event.slug"
        />
      </div>

      <Card v-if="sortedSessions.length === 0">
        <CardContent class="p-6 text-sm text-muted-foreground">
          Sessions will appear here once the organizer publishes the schedule.
        </CardContent>
      </Card>
    </section>

    <section class="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <div class="flex items-start gap-3">
            <div class="flex size-10 items-center justify-center rounded-full border bg-muted/40">
              <MapPin class="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Venue</CardTitle>
              <p class="text-sm text-muted-foreground">
                Where the event takes place.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-3 text-sm leading-7 text-muted-foreground">
          <p class="font-medium text-foreground">
            {{ venue?.name || 'Venue to be announced' }}
          </p>
          <p v-if="venue">
            {{ venue.address }}, {{ venue.city }}, {{ venue.country }}
          </p>
          <p v-if="venue?.description">
            {{ venue.description }}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div class="flex items-start gap-3">
            <div class="flex size-10 items-center justify-center rounded-full border bg-muted/40">
              <UserRound class="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Organizer note</CardTitle>
              <p class="text-sm text-muted-foreground">
                Review session details before choosing seats.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent class="text-sm leading-7 text-muted-foreground">
          Ticket availability and seating are managed per session. Select a date above to continue with the correct schedule.
        </CardContent>
      </Card>
    </section>
  </main>
</template>
