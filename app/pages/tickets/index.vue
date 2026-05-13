<script setup lang="ts">
import { Ticket } from '@lucide/vue'
import type { ApiResponse } from '~~/types/api'
import type { TicketListItem } from '~~/types/ticketing'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import type { TicketStatusFilter } from '@/components/ticket/TicketStatusTabs.vue'

interface TicketEventGroupData {
  id: string
  title: string
  subtitle: string | null
  eventTime: string
  startsAt: string | Date | null | undefined
  coverImage: string | null
  tickets: TicketListItem[]
}

const { locale, t } = useI18n()
const selectedDate = ref('')
const selectedStatus = ref<TicketStatusFilter>('all')
const expandedEventIds = ref<string[]>([])

const { data: ticketsResponse } = await useAPI<ApiResponse<TicketListItem[]>>(() => '/api/tickets', {
  query: computed(() => ({ locale: locale.value })),
})

const tickets = computed(() => ticketsResponse.value?.data ?? [])
const issuedTicketsCount = computed(() => tickets.value.filter(ticket => normalizeStatus(ticket.status) === 'issued').length)
const upcomingTicketsCount = computed(() => {
  const now = Date.now()
  return tickets.value.filter((ticket) => {
    if (!ticket.event?.startsAt) {
      return false
    }

    return new Date(ticket.event.startsAt).getTime() >= now
  }).length
})

// Client-side date filtering keeps the ticket wallet responsive without extra API calls.
const filteredTickets = computed(() => {
  return tickets.value.filter((ticket) => {
    if (!matchesStatusFilter(ticket.status, selectedStatus.value)) {
      return false
    }

    if (!selectedDate.value) {
      return true
    }

    if (!ticket.event?.startsAt) {
      return false
    }

    return toDateInputValue(ticket.event.startsAt) === selectedDate.value
  })
})

const ticketEventGroups = computed<TicketEventGroupData[]>(() => {
  const groups = new Map<string, TicketEventGroupData>()

  for (const ticket of filteredTickets.value) {
    const id = ticket.event?.publicId ?? ticket.event?.id?.toString() ?? ticket.publicId
    const existingGroup = groups.get(id)

    if (existingGroup) {
      existingGroup.tickets.push(ticket)
      continue
    }

    groups.set(id, {
      id,
      title: ticket.event?.title || ticket.publicId,
      subtitle: ticket.event?.subtitle ?? null,
      eventTime: formatEventTime(ticket.event?.startsAt),
      startsAt: ticket.event?.startsAt,
      coverImage: ticket.event?.coverImage ?? null,
      tickets: [ticket],
    })
  }

  return [...groups.values()].sort((firstGroup, secondGroup) => {
    if (!firstGroup.startsAt || !secondGroup.startsAt) {
      return 0
    }

    return new Date(firstGroup.startsAt).getTime() - new Date(secondGroup.startsAt).getTime()
  })
})

watch(ticketEventGroups, (groups) => {
  const visibleIds = groups.map(group => group.id)
  expandedEventIds.value = expandedEventIds.value.filter(id => visibleIds.includes(id))

  const firstVisibleId = visibleIds[0]
  if (expandedEventIds.value.length === 0 && firstVisibleId) {
    expandedEventIds.value = [firstVisibleId]
  }
}, { immediate: true })

function formatIssuedAt(value: string | Date) {
  return new Date(value).toLocaleDateString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatEventTime(value: string | Date | null | undefined) {
  if (!value) {
    return t('common.dates_tba')
  }

  return new Date(value).toLocaleString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getShortTicketId(value: string) {
  return value.length > 10 ? value.slice(-10) : value
}

function normalizeStatus(status: string) {
  return status.toLowerCase().replaceAll(' ', '_')
}

function getStatusLabel(status: string) {
  const key = `tickets.status_${normalizeStatus(status)}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
}

function toDateInputValue(value: string | Date) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isEventExpanded(eventId: string) {
  return expandedEventIds.value.includes(eventId)
}

function toggleEventGroup(eventId: string) {
  if (isEventExpanded(eventId)) {
    expandedEventIds.value = expandedEventIds.value.filter(id => id !== eventId)
    return
  }

  expandedEventIds.value = [...expandedEventIds.value, eventId]
}

function matchesStatusFilter(status: string, filter: TicketStatusFilter) {
  const normalizedStatus = normalizeStatus(status)

  if (filter === 'all') {
    return true
  }

  if (filter === 'success') {
    return ['issued', 'paid', 'confirmed', 'success', 'completed'].includes(normalizedStatus)
  }

  if (filter === 'processing') {
    return ['pending', 'processing', 'held', 'reserved', 'draft'].includes(normalizedStatus)
  }

  return ['cancelled', 'canceled', 'refunded', 'void', 'expired', 'failed'].includes(normalizedStatus)
}

definePageMeta({
  title: 'tickets.page_title',
  breadcrumb: 'nav.my_tickets',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main class="relative mx-auto w-full max-w-[100rem] space-y-5 overflow-hidden pb-8 pt-5">
    <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(circle_at_12%_0%,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_86%_18%,hsl(var(--chart-2)/0.10),transparent_30%)]" />

    <TicketHeader
      :total-tickets="tickets.length"
      :issued-tickets="issuedTicketsCount"
      :upcoming-tickets="upcomingTicketsCount"
    />

    <TicketFilter
      v-model:selected-date="selectedDate"
      :total-tickets="tickets.length"
      :filtered-tickets="filteredTickets.length"
    />

    <TicketStatusTabs v-model="selectedStatus" />

    <section
      v-if="ticketEventGroups.length > 0"
      class="space-y-4"
    >
      <TicketEventGroup
        v-for="(group, groupIndex) in ticketEventGroups"
        :key="group.id"
        :title="group.title"
        :subtitle="group.subtitle"
        :event-time="group.eventTime"
        :cover-image="group.coverImage"
        :venue-name="null"
        :venue-city="null"
        :ticket-count="group.tickets.length"
        :expanded="isEventExpanded(group.id)"
        :tone="groupIndex"
        @toggle="toggleEventGroup(group.id)"
      >
        <div class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <TicketCard
            v-for="ticket in group.tickets"
            :key="ticket.id"
            :ticket="ticket"
            :issued-at-label="formatIssuedAt(ticket.issuedAt)"
            :event-time-label="formatEventTime(ticket.event?.startsAt)"
            :status-label="getStatusLabel(ticket.status)"
            :short-ticket-id="getShortTicketId(ticket.publicId)"
          />
        </div>
      </TicketEventGroup>
    </section>

    <Empty
      v-else
      class="rounded-[1.75rem] border bg-card/60 py-16"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Ticket class="size-5" />
        </EmptyMedia>
        <EmptyTitle>{{ selectedDate ? $t('tickets.filter_empty_title') : $t('tickets.empty_title') }}</EmptyTitle>
        <EmptyDescription>
          {{ selectedDate ? $t('tickets.filter_empty_desc') : $t('tickets.empty_subtitle') }}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div class="flex flex-wrap justify-center gap-2">
          <Button
            v-if="selectedDate"
            variant="outline"
            class="rounded-full"
            @click="selectedDate = ''"
          >
            {{ $t('tickets.clear_date_filter') }}
          </Button>
          <Button
            as-child
            class="rounded-full"
          >
            <NuxtLink to="/events">
              {{ $t('tickets.browse_events') }}
            </NuxtLink>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  </main>
</template>
