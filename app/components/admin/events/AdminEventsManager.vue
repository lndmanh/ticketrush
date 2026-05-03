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

    <section
      v-if="unfinishedDraft"
      class="space-y-3"
    >
      <div class="flex flex-col gap-1">
        <h3 class="text-lg font-semibold tracking-[-0.03em] text-foreground">
          Unfinished autosave draft
        </h3>
        <p class="text-sm text-muted-foreground">
          This incomplete event form has not been saved as a real draft event yet.
        </p>
      </div>

      <Card class="shadow-none">
        <CardContent class="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium text-foreground">
                {{ unfinishedDraft.titleSnapshot || 'Untitled event' }}
              </p>
              <Badge variant="outline">
                Step {{ unfinishedDraft.lastSavedStep }}
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ getAutosaveVenueName(unfinishedDraft.venueId) }} · saved {{ new Date(unfinishedDraft.updatedAt).toLocaleString() }}
            </p>
          </div>
          <div class="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="discardAutosaveDraft(unfinishedDraft.draftKey)"
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              @click="resumeAutosaveDraft(unfinishedDraft.draftKey)"
            >
              Resume
            </Button>
          </div>
        </CardContent>
      </Card>
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
import type { ApiResponse } from '~~/types/api'
import { ArchiveIcon, Rocket } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import DataTable from '@/components/DataTable.vue'
import AdminFeaturedEventCard from './AdminFeaturedEventCard.vue'
import type { EventTableRow } from './columns'
import { createColumns } from './columns'

interface AutosaveDraftSummary {
  draftKey: string
  titleSnapshot: string
  slugSnapshot: string
  venueId: number | null
  lastSavedStep: number
  updatedAt: string | Date
  createdAt: string | Date
}

function extractErrorMessage(error: object, fallback: string) {
  if ('data' in error) {
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

function getCaughtErrorMessage(error: object | null, fallback: string) {
  if (!error) {
    return fallback
  }

  return extractErrorMessage(error, fallback)
}

const events = ref<Event[]>([])
const venues = ref<Venue[]>([])
const unfinishedDraft = ref<AutosaveDraftSummary | null>(null)
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
    const [eventsResponse, venuesResponse, autosavesResponse] = await Promise.all([
      $fetch<ApiResponse<Event[]>>('/api/admin/events'),
      $fetch<ApiResponse<Venue[]>>('/api/admin/venues'),
      $fetch<ApiResponse<AutosaveDraftSummary | null>>('/api/admin/events/autosaves'),
    ])

    if (!eventsResponse.success || !venuesResponse.success || !autosavesResponse.success) {
      throw new Error('Unsuccessful response')
    }

    events.value = eventsResponse.data
    venues.value = venuesResponse.data
    unfinishedDraft.value = autosavesResponse.data
  }
  catch (error) {
    toast.error(getCaughtErrorMessage(error && typeof error === 'object' ? error : null, 'Failed to load events'))
  }
  finally {
    loading.value = false
  }
}

function openEvent(eventId: number) {
  navigateTo(`/admin/events/${eventId}`)
}

function getAutosaveVenueName(venueId: number | null) {
  if (!venueId) {
    return 'No venue selected'
  }

  return venues.value.find(venue => venue.id === venueId)?.name ?? 'Unknown venue'
}

function resumeAutosaveDraft(draftKey: string) {
  navigateTo({ path: '/admin/events/create', query: { draftKey } })
}

async function discardAutosaveDraft(draftKey: string) {
  try {
    loading.value = true
    await $fetch(`/api/admin/events/autosaves/${draftKey}`, { method: 'DELETE' })
    if (import.meta.client && window.localStorage.getItem('ticketrush:event-create-autosave-key') === draftKey) {
      window.localStorage.removeItem('ticketrush:event-create-autosave-key')
    }
    if (unfinishedDraft.value?.draftKey === draftKey) {
      unfinishedDraft.value = null
    }
    toast.success('Autosave draft discarded')
  }
  catch (error) {
    toast.error(getCaughtErrorMessage(error && typeof error === 'object' ? error : null, 'Failed to discard autosave draft'))
  }
  finally {
    loading.value = false
  }
}

async function publishEvent(eventId: number) {
  try {
    loading.value = true
    await $fetch(`/api/admin/events/${eventId}/publish`, { method: 'POST' })
    toast.success('Event published')
    await fetchEvents()
  }
  catch (error) {
    toast.error(getCaughtErrorMessage(error && typeof error === 'object' ? error : null, 'Failed to publish event'))
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
    toast.error(getCaughtErrorMessage(error && typeof error === 'object' ? error : null, 'Failed to unpublish event'))
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
