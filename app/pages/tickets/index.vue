<script setup lang="ts">
import { ArrowRight, CalendarRange, ChevronLeft, ChevronRight, MapPin, Search, SlidersHorizontal, Ticket, UserRound, X } from '@lucide/vue'
import { apiRoutes } from '#shared/apiRoutes'
import type { TicketStatus } from '#shared/commonEnums'
import type { ApiResponse } from '~~/types/api'
import type { TicketListItem } from '~~/types/ticketing'
import { getDisplayDateLocale } from '@/lib/localizedEvents'

const TICKETS_PAGE_SIZE = 9

type TicketSortOption = 'issued_desc' | 'issued_asc' | 'event_asc' | 'attendee_asc'
type TicketFilterOption = { value: string, label: string }

const DEFAULT_TICKET_SORT: TicketSortOption = 'issued_desc'

const { locale, t } = useI18n()

definePageMeta({
  title: 'tickets.page_title',
  breadcrumb: 'nav.my_tickets',
  layout: 'dashboard',
  middleware: ['auth'],
})

const sortOptions = computed<Array<{ value: TicketSortOption, label: string }>>(() => [
  { value: 'issued_desc', label: t('tickets.sort_issued_newest') },
  { value: 'issued_asc', label: t('tickets.sort_issued_oldest') },
  { value: 'event_asc', label: t('tickets.sort_event_soonest') },
  { value: 'attendee_asc', label: t('tickets.sort_attendee_az') },
])

const eventInput = ref('')
const attendeeInput = ref('')
const keywordInput = ref('')
const sortInput = ref<TicketSortOption>(DEFAULT_TICKET_SORT)
const activeEvent = ref('')
const activeAttendee = ref('')
const activeKeyword = ref('')
const activeSort = ref<TicketSortOption>(DEFAULT_TICKET_SORT)
const activePage = ref(1)

useSeo({
  title: computed(() => t('tickets.page_title')),
  description: computed(() => t('tickets.page_description')),
  type: 'website',
})

const { data: ticketsResponse } = await useAPI<ApiResponse<TicketListItem[]>>(() => apiRoutes.TICKETS, {
  query: computed(() => ({ locale: locale.value })),
})

const tickets = computed(() => ticketsResponse.value?.data ?? [])
const normalizedActiveKeyword = computed(() => normalizeTicketSearchValue(activeKeyword.value))

const eventOptions = computed<TicketFilterOption[]>(() => {
  const options = new Map<string, string>()

  for (const ticket of tickets.value) {
    const event = ticket.event
    if (!event) {
      continue
    }

    const value = getEventFilterValue(ticket)
    if (value && !options.has(value)) {
      options.set(value, event.title)
    }
  }

  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => compareLabels(left.label, right.label))
})

const attendeeOptions = computed<TicketFilterOption[]>(() => {
  const options = new Map<string, string>()

  for (const ticket of tickets.value) {
    const value = getAttendeeFilterValue(ticket)
    if (value && !options.has(value)) {
      options.set(value, ticket.attendeeName)
    }
  }

  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => compareLabels(left.label, right.label))
})

const filteredTickets = computed(() => {
  const visibleTickets = tickets.value.filter((ticket) => {
    if (activeEvent.value && getEventFilterValue(ticket) !== activeEvent.value) {
      return false
    }

    if (activeAttendee.value && getAttendeeFilterValue(ticket) !== activeAttendee.value) {
      return false
    }

    return matchesTicketSearch(ticket)
  })

  return [...visibleTickets].sort(compareTickets)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTickets.value.length / TICKETS_PAGE_SIZE)))

const paginatedTickets = computed(() => {
  const start = (activePage.value - 1) * TICKETS_PAGE_SIZE
  return filteredTickets.value.slice(start, start + TICKETS_PAGE_SIZE)
})

const hasPreviousPage = computed(() => activePage.value > 1)
const hasNextPage = computed(() => activePage.value < totalPages.value)

const activeFilterCount = computed(() => {
  let count = 0
  if (activeEvent.value) count += 1
  if (activeAttendee.value) count += 1
  if (activeKeyword.value) count += 1
  if (activeSort.value !== DEFAULT_TICKET_SORT) count += 1
  return count
})

const hasPendingFilterInput = computed(() => {
  return eventInput.value !== activeEvent.value
    || attendeeInput.value !== activeAttendee.value
    || keywordInput.value.trim() !== activeKeyword.value
    || sortInput.value !== activeSort.value
})

const canResetFilters = computed(() => activeFilterCount.value > 0 || hasPendingFilterInput.value)

const resultSummary = computed(() => {
  const total = filteredTickets.value.length
  if (total === 0) return t('tickets.result_no_tickets')
  if (total === 1) return t('tickets.result_one_ticket')
  const start = (activePage.value - 1) * TICKETS_PAGE_SIZE + 1
  const end = Math.min(activePage.value * TICKETS_PAGE_SIZE, total)
  return t('tickets.result_showing', { start, end, total })
})

const pageSummary = computed(() => {
  return t('tickets.page_info', { page: activePage.value, total: totalPages.value })
})

watch(totalPages, (pageCount) => {
  if (activePage.value > pageCount) {
    activePage.value = pageCount
  }
})

function normalizeTicketSearchValue(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase(locale.value) ?? ''
}

function compareLabels(left: string, right: string) {
  return left.localeCompare(right, locale.value, { sensitivity: 'base' })
}

function getEventFilterValue(ticket: TicketListItem) {
  return ticket.event ? String(ticket.event.id) : ''
}

function getAttendeeFilterValue(ticket: TicketListItem) {
  if (typeof ticket.savedAttendeeId === 'number') {
    return `saved:${ticket.savedAttendeeId}`
  }

  const email = normalizeTicketSearchValue(ticket.attendeeEmail)
  if (email) {
    return `email:${email}`
  }

  const name = normalizeTicketSearchValue(ticket.attendeeName)
  return name ? `name:${name}` : ''
}

function matchesTicketSearch(ticket: TicketListItem) {
  const query = normalizedActiveKeyword.value

  if (!query) {
    return true
  }

  const searchableValues = [
    ticket.publicId,
    ticket.event?.title,
    ticket.attendeeName,
    ticket.attendeeEmail,
    ticket.attendeePhone,
    ticket.attendeeGuardianName,
    ticket.attendeeGuardianEmail,
    ticket.attendeeGuardianPhone,
    ticket.orderItem?.ticketLabel,
    ticket.orderItem?.sectionLabel,
    ticket.orderItem?.rowLabel,
    ticket.orderItem?.seatLabel,
  ]

  return searchableValues.some(value => normalizeTicketSearchValue(value).includes(query))
}

function getTicketStatusLabel(status: TicketStatus) {
  const key = `tickets.status_${status}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
}

function compareTickets(left: TicketListItem, right: TicketListItem) {
  if (activeSort.value === 'issued_asc') {
    return getSortableTime(left.issuedAt, 0) - getSortableTime(right.issuedAt, 0)
  }

  if (activeSort.value === 'event_asc') {
    return getSortableTime(left.event?.startsAt, Number.MAX_SAFE_INTEGER) - getSortableTime(right.event?.startsAt, Number.MAX_SAFE_INTEGER)
  }

  if (activeSort.value === 'attendee_asc') {
    return compareLabels(left.attendeeName, right.attendeeName)
  }

  return getSortableTime(right.issuedAt, 0) - getSortableTime(left.issuedAt, 0)
}

function getSortableTime(value: string | Date | null | undefined, fallback: number) {
  if (!value) {
    return fallback
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? fallback : timestamp
}

function applySearch() {
  activeEvent.value = eventInput.value
  activeAttendee.value = attendeeInput.value
  activeKeyword.value = keywordInput.value.trim()
  activeSort.value = sortInput.value
  activePage.value = 1
}

function resetFilters() {
  eventInput.value = ''
  attendeeInput.value = ''
  keywordInput.value = ''
  sortInput.value = DEFAULT_TICKET_SORT
  activeEvent.value = ''
  activeAttendee.value = ''
  activeKeyword.value = ''
  activeSort.value = DEFAULT_TICKET_SORT
  activePage.value = 1
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) {
    return
  }

  activePage.value = page
}

function formatEventTime(value: string | Date | null | undefined) {
  if (!value) {
    return t('tickets.time_tba')
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
</script>

<template>
  <main class="space-y-6">
    <form
      class="space-y-3"
      @submit.prevent="applySearch"
    >
      <div class="sr-only">
        <Label for="ticket-event-filter">{{ $t('tickets.search_event_label') }}</Label>
        <Label for="ticket-attendee-filter">{{ $t('tickets.search_attendee_label') }}</Label>
        <Label for="ticket-keyword-filter">{{ $t('tickets.search_label') }}</Label>
        <Label for="ticket-sort-filter">{{ $t('tickets.sort_label') }}</Label>
      </div>

      <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-stretch lg:gap-0">
        <div class="min-w-0 lg:flex-[1.1]">
          <Select v-model="eventInput">
            <SelectTrigger
              id="ticket-event-filter"
              :aria-label="$t('tickets.search_event_label')"
              class="h-12 w-full rounded-full bg-background/80 px-4 text-left font-normal data-[size=default]:h-12 lg:rounded-l-md lg:rounded-r-none lg:border-r-0"
            >
              <CalendarRange class="mr-2 size-4 shrink-0 text-muted-foreground" />
              <SelectValue :placeholder="$t('tickets.search_event_placeholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in eventOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="min-w-0 lg:flex-[1.1]">
          <Select v-model="attendeeInput">
            <SelectTrigger
              id="ticket-attendee-filter"
              :aria-label="$t('tickets.search_attendee_label')"
              class="h-12 w-full rounded-full bg-background/80 px-4 text-left font-normal data-[size=default]:h-12 lg:rounded-none lg:border-r-0"
            >
              <UserRound class="mr-2 size-4 shrink-0 text-muted-foreground" />
              <SelectValue :placeholder="$t('tickets.search_attendee_placeholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in attendeeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <InputGroup class="h-12 w-full rounded-full bg-background/80 lg:flex-[1.45] lg:rounded-none lg:border-r-0">
          <InputGroupAddon>
            <Search class="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            id="ticket-keyword-filter"
            v-model="keywordInput"
            class="h-12 text-sm"
            :aria-label="$t('tickets.search_label')"
            :placeholder="$t('tickets.search_placeholder')"
          />
        </InputGroup>

        <div class="min-w-0 lg:flex-[0.95]">
          <Select v-model="sortInput">
            <SelectTrigger
              id="ticket-sort-filter"
              :aria-label="$t('tickets.sort_label')"
              class="h-12 w-full rounded-full bg-background/80 px-4 text-left font-normal data-[size=default]:h-12 lg:rounded-none lg:border-r-0"
            >
              <SlidersHorizontal class="mr-2 size-4 shrink-0 text-muted-foreground" />
              <SelectValue :placeholder="$t('tickets.sort_placeholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in sortOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          class="h-12 w-full rounded-full px-5 lg:w-auto lg:shrink-0 lg:rounded-none"
        >
          <Search class="size-4" />
          {{ $t('tickets.search_btn') }}
        </Button>
        <Button
          type="button"
          variant="outline"
          class="h-12 w-full rounded-full px-5 lg:w-auto lg:shrink-0 lg:rounded-l-none lg:rounded-r-md"
          :disabled="!canResetFilters"
          @click="resetFilters"
        >
          <X class="size-4" />
          {{ $t('tickets.reset_btn') }}
        </Button>
      </div>
    </form>

    <section class="space-y-5">
      <section
        v-if="paginatedTickets.length > 0"
        class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        <NuxtLink
          v-for="ticket in paginatedTickets"
          :key="ticket.id"
          :to="`/tickets/${ticket.publicId}`"
          class="group relative block overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div class="h-1.5 bg-gradient-to-r from-primary via-primary/55 to-transparent" />

          <div class="space-y-5 p-5">
            <div class="min-w-0 space-y-3">
              <Badge
                variant="secondary"
                class="w-fit capitalize"
              >
                {{ getTicketStatusLabel(ticket.status) }}
              </Badge>
              <h2 class="line-clamp-2 text-xl font-semibold tracking-tight">
                {{ ticket.event?.title || ticket.publicId }}
              </h2>
              <p class="flex items-center gap-2 truncate text-sm text-muted-foreground">
                <UserRound class="size-3.5 shrink-0" />
                <span class="truncate">{{ ticket.attendeeName }}</span>
              </p>
            </div>

            <div class="relative border-t border-dashed pt-5">
              <span class="absolute -left-8 -top-3 size-6 rounded-full border bg-background transition-colors duration-300 group-hover:border-primary/50" />
              <span class="absolute -right-8 -top-3 size-6 rounded-full border bg-background transition-colors duration-300 group-hover:border-primary/50" />

              <div class="grid gap-3 text-sm">
                <div class="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                  <CalendarRange class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div class="min-w-0">
                    <p class="text-xs text-muted-foreground">{{ $t('tickets.event_time') }}</p>
                    <p class="truncate font-medium">
                      {{ formatEventTime(ticket.event?.startsAt) }}
                    </p>
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div class="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div class="min-w-0">
                      <p class="text-xs text-muted-foreground">{{ $t('tickets.seat_label') }}</p>
                      <p class="truncate font-medium">
                        {{ ticket.orderItem?.sectionLabel || $t('tickets.detail_general_admission') }} · {{ ticket.orderItem?.seatLabel || $t('tickets.ga') }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <Ticket class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div class="min-w-0">
                      <p class="text-xs text-muted-foreground">{{ $t('tickets.ticket_label') }}</p>
                      <p class="truncate font-mono text-xs font-medium">
                        #{{ getShortTicketId(ticket.publicId) }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-5 flex justify-end text-sm">
                <span class="inline-flex items-center gap-1 font-semibold text-emerald-500 transition-transform duration-300 group-hover:translate-x-1 dark:text-emerald-400">
                  {{ $t('tickets.view_pass') }}
                  <ArrowRight class="size-4" />
                </span>
              </div>
            </div>
          </div>
        </NuxtLink>
      </section>

      <Empty
        v-else
        class="rounded-xl border bg-card/60 py-16"
      >
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Ticket class="size-5" />
          </EmptyMedia>
          <EmptyTitle>
            {{ tickets.length === 0 ? $t('tickets.empty_title') : $t('tickets.no_match_title') }}
          </EmptyTitle>
          <EmptyDescription>
            {{ tickets.length === 0 ? $t('tickets.empty_wallet_desc') : $t('tickets.no_match_desc') }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div class="flex gap-2">
            <Button
              v-if="tickets.length === 0"
              as-child
              class="rounded-full"
            >
              <NuxtLink to="/events">
                {{ $t('tickets.browse_events') }}
              </NuxtLink>
            </Button>
            <Button
              v-else
              type="button"
              variant="outline"
              class="rounded-full"
              @click="resetFilters"
            >
              {{ $t('tickets.reset_filters') }}
            </Button>
          </div>
        </EmptyContent>
      </Empty>

      <div
        v-if="filteredTickets.length > 0"
        class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-muted-foreground">
          <span>{{ resultSummary }}</span>
          <span class="px-1">·</span>
          <span>{{ pageSummary }}</span>
        </p>
        <div class="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            class="rounded-full"
            :disabled="!hasPreviousPage"
            :aria-label="$t('tickets.prev_page')"
            @click="goToPage(activePage - 1)"
          >
            <ChevronLeft class="size-4" />
            {{ $t('tickets.prev_page') }}
          </Button>
          <Button
            type="button"
            variant="outline"
            class="rounded-full"
            :disabled="!hasNextPage"
            :aria-label="$t('tickets.next_page')"
            @click="goToPage(activePage + 1)"
          >
            {{ $t('tickets.next_page') }}
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </section>
  </main>
</template>
