<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold text-foreground">
          {{ $t('admin.events.title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('admin.events.desc') }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button as-child>
          <NuxtLink to="/admin/events/create">
            <Rocket class="h-4 w-4" />
            {{ $t('admin.events.create_event') }}
          </NuxtLink>
        </Button>
        <Button
          v-if="firstDraftEventId !== null"
          variant="outline"
          @click="openEvent(firstDraftEventId)"
        >
          {{ $t('admin.events.open_latest_draft') }}
        </Button>
      </div>
    </section>

    <section
      v-if="unfinishedDraft"
      class="space-y-3"
    >
      <div class="flex flex-col gap-1">
        <h3 class="text-lg font-semibold tracking-[-0.03em] text-foreground">
          {{ $t('admin.events.unfinished_draft') }}
        </h3>
      </div>

      <Card class="shadow-none">
        <CardContent class="flex flex-col gap-4 py-0 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-medium text-foreground">
                {{ unfinishedDraft.titleSnapshot || $t('admin.events.untitled_event') }}
              </p>
              <Badge variant="outline">
                {{ $t('common.step') }} {{ unfinishedDraft.lastSavedStep }}
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ $t('admin.events.autosave_saved_at', { venue: getAutosaveVenueName(unfinishedDraft.venueId), date: formatDateTime(unfinishedDraft.updatedAt, getDisplayDateLocale(locale)) }) }}
            </p>
          </div>
          <div class="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="discardAutosaveDraft(unfinishedDraft.draftKey)"
            >
              {{ $t('admin.events.discard') }}
            </Button>
            <Button
              type="button"
              size="sm"
              @click="resumeAutosaveDraft(unfinishedDraft.draftKey)"
            >
              {{ $t('admin.events.resume') }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>

    <DataTable
      :columns="columns"
      :data="rows"
      :loading="loading"
      :toolbar-label="$t('admin.events.event_registry')"
      :toolbar-description="$t('admin.events.registry_desc')"
      :search-placeholder="$t('admin.events.search_events')"
      :empty-title="$t('admin.events.no_match')"
      :empty-description="$t('admin.events.no_match_desc')"
      :column-labels="columnLabels"
      @update:data="fetchEvents"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import type { Event, Venue } from '#shared/db'
import type { ApiResponse } from '~~/types/api'
import type { AutosaveDraftDeleteData, AutosaveDraftSummary } from '~~/types/admin-events'
import { ArchiveIcon, Rocket } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import DataTable from '@/components/DataTable.vue'
import AdminFeaturedEventCard from './AdminFeaturedEventCard.vue'
import type { EventTableRow } from './columns'
import { createColumns } from './columns'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatDateTime } from '@/lib/utils'
import { apiRoutes } from '#shared/apiRoutes'
import { EventStatus } from '#shared/commonEnums'

const { locale, t } = useI18n()
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
    venueName: venueById.get(event.venueId) ?? t('admin.events.unknown_venue'),
    startsAt: new Date(event.startsAt),
    salesStartAt: new Date(event.salesStartAt),
    updatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
  }))
})

const draftRows = computed(() => rows.value.filter(row => row.status === EventStatus.Draft))
const liveRows = computed(() => rows.value.filter(row => row.status !== EventStatus.Draft))

const priorityRows = computed(() => {
  return [...rows.value]
    .sort((left, right) => {
      if (left.status === EventStatus.Draft && right.status !== EventStatus.Draft) {
        return -1
      }

      if (left.status !== EventStatus.Draft && right.status === EventStatus.Draft) {
        return 1
      }

      return left.startsAt.getTime() - right.startsAt.getTime()
    })
    .slice(0, 4)
})

const featuredPriorityEvent = computed(() => priorityRows.value[0] ?? null)

const firstDraftEventId = computed(() => draftRows.value[0]?.id ?? null)
const columnLabels = computed(() => ({
  title: t('admin.columns.event'),
  status: t('admin.columns.status'),
  venueName: t('admin.columns.venue'),
  startsAt: t('admin.columns.starts'),
  salesStartAt: t('admin.columns.sales_window'),
  updatedAt: t('admin.columns.updated'),
}))

async function fetchEvents() {
  try {
    loading.value = true
    const [eventsResponse, venuesResponse, autosavesResponse] = await Promise.all([
      apiRequest(apiRoutes.ADMIN_EVENTS),
      apiRequest(apiRoutes.ADMIN_VENUES),
      apiRequest(apiRoutes.ADMIN_EVENT_AUTOSAVES),
    ])

    if (!eventsResponse.success) throw eventsResponse
    if (!venuesResponse.success) throw venuesResponse
    if (!autosavesResponse.success) throw autosavesResponse

    events.value = eventsResponse.data
    venues.value = venuesResponse.data
    unfinishedDraft.value = autosavesResponse.data
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.events.load_failed')).message)
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
    return t('admin.events.no_venue')
  }

  return venues.value.find(venue => venue.id === venueId)?.name ?? t('admin.events.unknown_venue')
}

function resumeAutosaveDraft(draftKey: string) {
  navigateTo({ path: '/admin/events/create', query: { draftKey } })
}

async function discardAutosaveDraft(draftKey: string) {
  try {
    loading.value = true
    const response = await apiRequest<ApiResponse<AutosaveDraftDeleteData>>(apiRoutes.adminEventAutosave(draftKey), { method: 'DELETE' })
    if (!response.success) {
      throw response
    }
    if (import.meta.client && window.localStorage.getItem('ticketrush:event-create-autosave-key') === draftKey) {
      window.localStorage.removeItem('ticketrush:event-create-autosave-key')
    }
    if (unfinishedDraft.value?.draftKey === draftKey) {
      unfinishedDraft.value = null
    }
    toast.success(t('admin.events.autosave_discarded'))
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.events.discard_failed')).message)
  }
  finally {
    loading.value = false
  }
}

async function publishEvent(eventId: number) {
  try {
    loading.value = true
    const response = await apiRequest<ApiResponse<Event>>(apiRoutes.adminEventPublish(eventId), { method: 'POST' })
    if (!response.success) {
      throw response
    }
    toast.success(t('admin.events.published'))
    await fetchEvents()
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.events.publish_failed')).message)
  }
  finally {
    loading.value = false
  }
}

async function unpublishEvent(eventId: number) {
  try {
    loading.value = true
    const response = await apiRequest<ApiResponse<Event | undefined>>(apiRoutes.adminEventUnpublish(eventId), { method: 'POST' })
    if (!response.success) {
      throw response
    }
    toast.success(t('admin.events.unpublished'))
    await fetchEvents()
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.events.unpublish_failed')).message)
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
