<script setup lang="ts">
import { CalendarRange, MapPin, Ticket } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
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
    <section class="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <Card class="overflow-hidden py-0">
        <div class="relative min-h-[20rem] overflow-hidden bg-secondary">
          <img
            :src="event.coverImage || `https://picsum.photos/seed/${event.slug}/1600/1100`"
            :alt="event.title"
            class="absolute inset-0 h-full w-full object-cover"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div class="mb-4 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                class="bg-white/20 text-white hover:bg-white/30 border-none backdrop-blur-md"
              >
                {{ event.status.replaceAll('_', ' ') }}
              </Badge>
              <Badge
                variant="outline"
                class="border-white/30 bg-black/40 text-white backdrop-blur-md"
              >
                {{ venueLabel }}
              </Badge>
            </div>
            <h1 class="text-3xl font-bold tracking-tight text-white md:text-5xl">
              {{ event.title }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
              {{ event.subtitle || event.description }}
            </p>
          </div>
        </div>
      </Card>

      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="flex items-start gap-4">
              <CalendarRange class="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium leading-none">
                  Date Range
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ dateRangeLabel }}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <MapPin class="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium leading-none">
                  Location
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ venue?.name || 'TBA' }}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <Ticket class="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-medium leading-none">
                  Ticket Releases
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ releaseCount }} across {{ sortedSessions.length }} session{{ sortedSessions.length === 1 ? '' : 's' }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="space-y-6">
      <div class="flex flex-col gap-2">
        <h2 class="text-2xl font-semibold tracking-tight">
          Select a Session
        </h2>
        <p class="text-sm text-muted-foreground">
          Choose a date and time to view available seats and book tickets.
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
        <CardContent class="p-8 text-center text-sm text-muted-foreground">
          Sessions will appear here once the organizer publishes the schedule.
        </CardContent>
      </Card>
    </section>
  </main>
</template>
