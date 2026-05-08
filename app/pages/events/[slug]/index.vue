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
    class="relative space-y-10 overflow-hidden pb-16 pt-6 md:space-y-14 md:pb-24"
  >
    <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_18%_12%,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_88%_4%,hsl(var(--muted-foreground)/0.14),transparent_30%)]" />

    <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
      <div class="surface-shell overflow-hidden">
        <div class="surface-core relative min-h-[26rem] overflow-hidden p-0">
          <img
            :src="event.coverImage || `https://picsum.photos/seed/${event.slug}/1600/1100`"
            :alt="event.title"
            class="absolute inset-0 h-full w-full object-cover grayscale"
          >
          <div class="absolute inset-0 bg-[linear-gradient(160deg,rgba(0,0,0,0.08),rgba(0,0,0,0.62)_48%,rgba(0,0,0,0.94))]" />
          <div class="absolute left-0 top-0 h-full w-1 bg-primary" />
          <div class="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8">
            <div class="mb-4 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                class="border-white/10 bg-white/8 text-white backdrop-blur-md"
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
            <h1 class="text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.07em] text-white md:text-6xl">
              {{ event.title }}
            </h1>
            <p class="mt-4 max-w-2xl text-sm leading-6 text-white/76 md:text-base md:leading-7">
              {{ event.subtitle || event.description }}
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <Card class="h-full border-muted/70 bg-card/70 shadow-none backdrop-blur">
          <CardHeader>
            <CardTitle class="tracking-[-0.04em]">
              {{ $t('event_detail.card_title') }}
            </CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="flex items-start gap-4 rounded-[1.25rem] border bg-background/70 p-4">
              <CalendarRange class="mt-0.5 size-4 text-primary" />
              <div>
                <p class="text-sm font-medium leading-none">
                  {{ $t('event_detail.date_range_label') }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ dateRangeLabel }}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4 rounded-[1.25rem] border bg-background/70 p-4">
              <MapPin class="mt-0.5 size-4 text-primary" />
              <div>
                <p class="text-sm font-medium leading-none">
                  {{ $t('event_detail.location_label') }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ venue?.name || 'TBA' }}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4 rounded-[1.25rem] border bg-background/70 p-4">
              <Ticket class="mt-0.5 size-4 text-primary" />
              <div>
                <p class="text-sm font-medium leading-none">
                  {{ $t('event_detail.ticket_releases_label') }}
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
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow">
            {{ $t('common.sessions') }}
          </span>
          <div class="space-y-2">
            <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
              {{ $t('event_detail.select_session_title') }}
            </h2>
            <p class="max-w-[42rem] text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
              {{ $t('event_detail.select_session_desc') }}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          class="w-fit rounded-full"
        >
          {{ releaseCount }} {{ $t('event_detail.ticket_releases_label') }}
        </Badge>
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
          {{ $t('event_detail.sessions_empty') }}
        </CardContent>
      </Card>
    </section>
  </main>
</template>
