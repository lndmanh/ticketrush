<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold text-foreground">
          Events
        </h2>
        <p class="text-sm text-muted-foreground">
          Track drafts, publish state, and launch activity.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button as-child>
          <NuxtLink to="/admin/events/create">
            <Rocket class="h-4 w-4" />
            Create event
          </NuxtLink>
        </Button>
        <Button
          v-if="firstDraftEventId !== null"
          variant="outline"
          @click="openEvent(firstDraftEventId)"
        >
          Open latest draft
        </Button>
      </div>
    </section>

    <section class="space-y-4">
      <div class="grid gap-4 md:grid-cols-3">
        <Card class="overflow-hidden border-0 bg-linear-to-br from-foreground/92 via-foreground/86 to-foreground/76 text-background shadow-sm">
          <CardContent class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-background/70">
                Tracked
              </p>
              <span class="rounded-full bg-background/12 px-2.5 py-1 text-xs font-medium text-background/90">
                Registry
              </span>
            </div>
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-[-0.06em]">
                {{ rows.length }}
              </p>
              <p class="text-sm leading-6 text-background/72">
                Events currently in the admin catalog.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card class="overflow-hidden border-0 bg-linear-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow-sm">
          <CardContent class="flex h-full flex-col justify-between gap-5">
            <div class="flex items-center justify-between gap-3">
              <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-white/70">
                Drafts
              </p>
              <span class="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
                In progress
              </span>
            </div>
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-[-0.06em]">
                {{ draftRows.length }}
              </p>
              <p class="text-sm leading-6 text-white/80">
                Events still being shaped before launch.
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
              <span class="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
                Selling now
              </span>
            </div>
            <div class="space-y-2">
              <p class="text-4xl font-semibold tracking-[-0.06em]">
                {{ liveRows.length }}
              </p>
              <p class="text-sm leading-6 text-white/80">
                Public events that are available to buyers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminFeaturedEventCard
        v-if="featuredPriorityEvent"
        eyebrow="Priority event"
        :title="featuredPriorityEvent.title"
        :venue-name="featuredPriorityEvent.venueName"
        :starts-at="featuredPriorityEvent.startsAt"
        :status="featuredPriorityEvent.status"
        :href="`/admin/events/${featuredPriorityEvent.id}`"
        open-label="Open event"
        :leading-icon="Rocket"
      >
        <template #actions>
          <Button
            v-if="featuredPriorityEvent.status === 'draft'"
            size="icon-sm"
            variant="outline"
            title="Publish event"
            @click="publishEvent(featuredPriorityEvent.id)"
          >
            <Rocket class="size-4" />
          </Button>
          <Button
            v-else
            size="icon-sm"
            variant="outline"
            title="Move event back to draft"
            @click="unpublishEvent(featuredPriorityEvent.id)"
          >
            <ArchiveIcon class="size-4" />
          </Button>
        </template>
      </AdminFeaturedEventCard>

      <p
        v-else
        class="rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground"
      >
        No events to review.
      </p>
    </section>

    <DataTable
      :columns="columns"
      :data="rows"
      :loading="loading"
      toolbar-label="Event registry"
      toolbar-description="Search launches and update their status."
      search-placeholder="Search events, venues, or statuses"
      empty-title="No events match the current view."
      empty-description="Adjust the search or create a new event."
      @update:data="fetchEvents"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import type { Event, Venue } from '#shared/db'
import type { ApiResponse } from '~~/server/utils/apiResponse'
import { ArchiveIcon, Rocket } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import DataTable from '@/components/DataTable.vue'
import AdminFeaturedEventCard from './AdminFeaturedEventCard.vue'
import type { EventTableRow } from './columns'
import { createColumns } from './columns'

function extractErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data
    if (typeof data === 'object' && data !== null) {
      if ('statusMessage' in data && typeof data.statusMessage === 'string') {
        return data.statusMessage
      }
      if ('message' in data && typeof data.message === 'string') {
        return data.message
      }
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

const events = ref<Event[]>([])
const venues = ref<Venue[]>([])
const loading = ref(false)

const rows = computed<EventTableRow[]>(() => {
  const venueById = new Map(venues.value.map(venue => [venue.id, venue.name]))

  return events.value.map(event => ({
    id: event.id,
    title: event.title,
    subtitle: event.subtitle,
    status: event.status,
    venueId: event.venueId,
    venueName: venueById.get(event.venueId) ?? 'Unknown venue',
    startsAt: new Date(event.startsAt),
    salesStartAt: new Date(event.salesStartAt),
    updatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
  }))
})

const draftRows = computed(() => rows.value.filter(row => row.status === 'draft'))
const liveRows = computed(() => rows.value.filter(row => row.status !== 'draft'))

const priorityRows = computed(() => {
  return [...rows.value]
    .sort((left, right) => {
      if (left.status === 'draft' && right.status !== 'draft') {
        return -1
      }

      if (left.status !== 'draft' && right.status === 'draft') {
        return 1
      }

      return left.startsAt.getTime() - right.startsAt.getTime()
    })
    .slice(0, 4)
})

const featuredPriorityEvent = computed(() => priorityRows.value[0] ?? null)

const firstDraftEventId = computed(() => draftRows.value[0]?.id ?? null)

async function fetchEvents() {
  try {
    loading.value = true
    const [eventsResponse, venuesResponse] = await Promise.all([
      $fetch<ApiResponse<Event[]>>('/api/admin/events'),
      $fetch<ApiResponse<Venue[]>>('/api/admin/venues'),
    ])

    if (!eventsResponse.success || !venuesResponse.success) {
      throw new Error('Unsuccessful response')
    }

    events.value = eventsResponse.data
    venues.value = venuesResponse.data
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to load events'))
  }
  finally {
    loading.value = false
  }
}

function openEvent(eventId: number) {
  navigateTo(`/admin/events/${eventId}`)
}

async function publishEvent(eventId: number) {
  try {
    loading.value = true
    await $fetch(`/api/admin/events/${eventId}/publish`, { method: 'POST' })
    toast.success('Event published')
    await fetchEvents()
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to publish event'))
  }
  finally {
    loading.value = false
  }
}

async function unpublishEvent(eventId: number) {
  try {
    loading.value = true
    await $fetch(`/api/admin/events/${eventId}/unpublish`, { method: 'POST' })
    toast.success('Event moved back to draft')
    await fetchEvents()
  }
  catch (error) {
    toast.error(extractErrorMessage(error, 'Failed to unpublish event'))
  }
  finally {
    loading.value = false
  }
}

const columns = computed(() => createColumns(openEvent, publishEvent, unpublishEvent))

onMounted(() => {
  fetchEvents()
})
</script>
