<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from '@lucide/vue'
import type {
  EventCatalogDateFilter,
  EventCatalogSort,
  EventCatalogStatusFilter,
} from '~~/types/events'

const EVENTS_PAGE_SIZE = 9

const statusOptions: Array<{ label: string, value: EventCatalogStatusFilter }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Upcoming', value: 'published' },
  { label: 'On sale', value: 'on_sale' },
  { label: 'Sold out', value: 'sold_out' },
  { label: 'Ended', value: 'ended' },
]

const dateOptions: Array<{ label: string, value: EventCatalogDateFilter }> = [
  { label: 'Any date', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Next 7 days', value: 'week' },
  { label: 'Next 30 days', value: 'month' },
]

const sortOptions: Array<{ label: string, value: EventCatalogSort }> = [
  { label: 'Soonest first', value: 'soonest' },
  { label: 'Newest releases', value: 'newest' },
  { label: 'Sales ending soon', value: 'ending_soon' },
]

const router = useRouter()
const route = useRoute()

function getQueryString(value: string | string[] | null | undefined) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return ''
}

function getPositiveQueryNumber(value: string | string[] | null | undefined, fallback: number) {
  const parsed = Number(getQueryString(value))
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function isStatusFilter(value: string): value is EventCatalogStatusFilter {
  return statusOptions.some(option => option.value === value)
}

function isDateFilter(value: string): value is EventCatalogDateFilter {
  return dateOptions.some(option => option.value === value)
}

function isCatalogSort(value: string): value is EventCatalogSort {
  return sortOptions.some(option => option.value === value)
}

function getStatusFilterFromRoute() {
  const value = getQueryString(route.query.status)
  return isStatusFilter(value) ? value : 'all'
}

function getDateFilterFromRoute() {
  const value = getQueryString(route.query.date)
  return isDateFilter(value) ? value : 'all'
}

function getSortFromRoute() {
  const value = getQueryString(route.query.sort)
  return isCatalogSort(value) ? value : 'soonest'
}

const searchInput = ref(getQueryString(route.query.q))
const activeSearch = ref(getQueryString(route.query.q))
const activeStatus = ref<EventCatalogStatusFilter>(getStatusFilterFromRoute())
const activeCity = ref(getQueryString(route.query.city) || 'all')
const activeDate = ref<EventCatalogDateFilter>(getDateFilterFromRoute())
const activeSort = ref<EventCatalogSort>(getSortFromRoute())
const activePage = ref(getPositiveQueryNumber(route.query.page, 1))

function syncStateFromRoute() {
  const routeSearch = getQueryString(route.query.q)
  searchInput.value = routeSearch
  activeSearch.value = routeSearch
  activeStatus.value = getStatusFilterFromRoute()
  activeCity.value = getQueryString(route.query.city) || 'all'
  activeDate.value = getDateFilterFromRoute()
  activeSort.value = getSortFromRoute()
  activePage.value = getPositiveQueryNumber(route.query.page, 1)
}

function buildCatalogQuery(page: number) {
  const query: Record<string, string> = {}
  const trimmedSearch = searchInput.value.trim()

  if (trimmedSearch) {
    query.q = trimmedSearch
  }

  if (activeStatus.value !== 'all') {
    query.status = activeStatus.value
  }

  if (activeCity.value !== 'all') {
    query.city = activeCity.value
  }

  if (activeDate.value !== 'all') {
    query.date = activeDate.value
  }

  if (activeSort.value !== 'soonest') {
    query.sort = activeSort.value
  }

  if (page > 1) {
    query.page = String(page)
  }

  return query
}

async function replaceCatalogQuery(page: number = 1) {
  await router.replace({
    path: '/events',
    query: buildCatalogQuery(page),
  })
}

async function applySearch() {
  await replaceCatalogQuery(1)
}

async function resetFilters() {
  searchInput.value = ''
  activeStatus.value = 'all'
  activeCity.value = 'all'
  activeDate.value = 'all'
  activeSort.value = 'soonest'
  await replaceCatalogQuery(1)
}

async function goToPage(page: number) {
  if (page < 1) {
    return
  }

  await replaceCatalogQuery(page)
}

watch(() => route.query, syncStateFromRoute, { deep: true })

const catalogQuery = computed(() => ({
  q: activeSearch.value || undefined,
  status: activeStatus.value === 'all' ? undefined : activeStatus.value,
  city: activeCity.value === 'all' ? undefined : activeCity.value,
  date: activeDate.value === 'all' ? undefined : activeDate.value,
  sort: activeSort.value === 'soonest' ? undefined : activeSort.value,
  page: activePage.value,
  pageSize: EVENTS_PAGE_SIZE,
}))

const { data: catalogResponse, pending, error: catalogFetchError } = await useFetch('/api/events', {
  query: catalogQuery,
})

const { data: cityResponse } = await useFetch('/api/events/cities')

const catalog = computed(() => {
  const response = catalogResponse.value
  if (!response || !response.success) {
    return null
  }

  return response
})

const catalogError = computed(() => {
  if (catalogFetchError.value) {
    return catalogFetchError.value.message
  }

  const response = catalogResponse.value
  if (!response || response.success) {
    return ''
  }

  return response.error.message
})

const events = computed(() => catalog.value?.data ?? [])
const pagination = computed(() => catalog.value?.pagination ?? {
  page: activePage.value,
  pageSize: EVENTS_PAGE_SIZE,
  totalItems: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
})
const cityOptions = computed(() => {
  const response = cityResponse.value
  if (!response || !response.success) {
    return []
  }

  return response.data
})
const activeFilterCount = computed(() => {
  let count = 0
  if (activeSearch.value) count += 1
  if (activeStatus.value !== 'all') count += 1
  if (activeCity.value !== 'all') count += 1
  if (activeDate.value !== 'all') count += 1
  return count
})
const resultSummary = computed(() => {
  const total = pagination.value.totalItems
  if (total === 0) {
    return 'No events found'
  }

  const start = (pagination.value.page - 1) * pagination.value.pageSize + 1
  const end = Math.min(pagination.value.page * pagination.value.pageSize, total)
  return `Showing ${start}-${end} of ${total} event${total === 1 ? '' : 's'}`
})

definePageMeta({
  title: 'Events',
  breadcrumb: 'Events',
})
</script>

<template>
  <AppLayout
    :hide-header="true"
    class-name="gap-8 py-6 md:gap-10 md:py-10"
  >
    <section class="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(20rem,0.55fr)] lg:items-end">
      <div class="space-y-5">
        <Badge
          variant="outline"
          class="w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
        >
          Event catalog
        </Badge>
        <div class="space-y-4">
          <h1 class="display-title max-w-4xl text-balance">
            Find your next event.
          </h1>
          <p class="max-w-[42rem] text-base leading-8 text-muted-foreground md:text-lg">
            Search live shows, compare cities and dates, then choose the session that fits your plans.
          </p>
        </div>
      </div>

      <Card class="overflow-hidden border-muted/70 bg-card/60 shadow-none backdrop-blur">
        <CardContent class="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p class="text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ pagination.totalItems }}
            </p>
            <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Events
            </p>
          </div>
          <div>
            <p class="text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ cityOptions.length }}
            </p>
            <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Cities
            </p>
          </div>
          <div>
            <p class="text-2xl font-semibold tracking-[-0.05em] text-foreground">
              {{ activeFilterCount }}
            </p>
            <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Active filters
            </p>
          </div>
        </CardContent>
      </Card>
    </section>

    <Card class="border-muted/70 bg-card/70 shadow-none backdrop-blur">
      <CardContent class="space-y-5 p-4 md:p-5">
        <form
          class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
          @submit.prevent="applySearch"
        >
          <div class="space-y-2">
            <Label for="event-search">Search events</Label>
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="event-search"
                v-model="searchInput"
                class="h-11 rounded-full pl-10"
                placeholder="Search by event, venue, or city"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Button
              type="submit"
              class="h-11 rounded-full px-5"
            >
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              class="h-11 rounded-full px-5"
              :disabled="activeFilterCount === 0"
              @click="resetFilters"
            >
              <X class="size-4" />
              Reset
            </Button>
          </div>
        </form>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="space-y-2">
            <Label for="event-status-filter">Status</Label>
            <Select
              v-model="activeStatus"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-status-filter"
                class="h-11 rounded-full"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="event-city-filter">City</Label>
            <Select
              v-model="activeCity"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-city-filter"
                class="h-11 rounded-full"
              >
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All cities
                </SelectItem>
                <SelectItem
                  v-for="city in cityOptions"
                  :key="city"
                  :value="city"
                >
                  {{ city }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="event-date-filter">Date</Label>
            <Select
              v-model="activeDate"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-date-filter"
                class="h-11 rounded-full"
              >
                <SelectValue placeholder="Any date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in dateOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="event-sort-filter">Sort</Label>
            <Select
              v-model="activeSort"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-sort-filter"
                class="h-11 rounded-full"
              >
                <SelectValue placeholder="Soonest first" />
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
        </div>
      </CardContent>
    </Card>

    <section class="space-y-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            class="rounded-full"
          >
            <SlidersHorizontal class="size-3.5" />
            {{ resultSummary }}
          </Badge>
          <Badge
            v-if="pending"
            variant="outline"
            class="rounded-full"
          >
            Loading
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          Page {{ pagination.page }}{{ pagination.totalPages > 0 ? ` of ${pagination.totalPages}` : '' }}
        </p>
      </div>

      <Card
        v-if="catalogError"
        class="border-destructive/30 bg-destructive/5 shadow-none"
      >
        <CardContent class="p-5 text-sm text-destructive">
          {{ catalogError }}
        </CardContent>
      </Card>

      <section
        v-if="events.length > 0"
        class="soft-grid lg:grid-cols-2 xl:grid-cols-3"
      >
        <TicketEventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
        />
      </section>

      <Empty
        v-else
        class="rounded-[2rem] border bg-card/60 py-16"
      >
        <EmptyHeader>
          <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border bg-muted/40">
            <CalendarDays class="size-5 text-muted-foreground" />
          </div>
          <EmptyTitle>No events match your filters</EmptyTitle>
          <EmptyDescription>
            Try a broader search, another city, or reset filters to see every live event.
          </EmptyDescription>
        </EmptyHeader>
        <Button
          variant="outline"
          class="mt-5 rounded-full"
          @click="resetFilters"
        >
          Reset filters
        </Button>
      </Empty>

      <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">
          {{ resultSummary }}
        </p>
        <div class="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            class="rounded-full"
            :disabled="!pagination.hasPreviousPage"
            aria-label="Go to previous events page"
            @click="goToPage(pagination.page - 1)"
          >
            <ChevronLeft class="size-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            class="rounded-full"
            :disabled="!pagination.hasNextPage"
            aria-label="Go to next events page"
            @click="goToPage(pagination.page + 1)"
          >
            Next
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </section>
  </AppLayout>
</template>
