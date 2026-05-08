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
const filterDialogOpen = ref(false)
const draftStatus = ref<EventCatalogStatusFilter>(activeStatus.value)
const draftCity = ref(activeCity.value)
const draftDate = ref<EventCatalogDateFilter>(activeDate.value)
const draftSort = ref<EventCatalogSort>(activeSort.value)

function syncDraftFiltersFromActive() {
  draftStatus.value = activeStatus.value
  draftCity.value = activeCity.value
  draftDate.value = activeDate.value
  draftSort.value = activeSort.value
}

function syncStateFromRoute() {
  const routeSearch = getQueryString(route.query.q)
  searchInput.value = routeSearch
  activeSearch.value = routeSearch
  activeStatus.value = getStatusFilterFromRoute()
  activeCity.value = getQueryString(route.query.city) || 'all'
  activeDate.value = getDateFilterFromRoute()
  activeSort.value = getSortFromRoute()
  activePage.value = getPositiveQueryNumber(route.query.page, 1)
  syncDraftFiltersFromActive()
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

async function applyFilters() {
  activeStatus.value = draftStatus.value
  activeCity.value = draftCity.value
  activeDate.value = draftDate.value
  activeSort.value = draftSort.value
  filterDialogOpen.value = false
  await replaceCatalogQuery(1)
}

async function resetDialogFilters() {
  activeStatus.value = 'all'
  activeCity.value = 'all'
  activeDate.value = 'all'
  activeSort.value = 'soonest'
  draftStatus.value = 'all'
  draftCity.value = 'all'
  draftDate.value = 'all'
  draftSort.value = 'soonest'
  filterDialogOpen.value = false
  await replaceCatalogQuery(1)
}

async function clearSearch() {
  searchInput.value = ''
  await replaceCatalogQuery(1)
}

async function resetFilters() {
  searchInput.value = ''
  activeStatus.value = 'all'
  activeCity.value = 'all'
  activeDate.value = 'all'
  activeSort.value = 'soonest'
  draftStatus.value = 'all'
  draftCity.value = 'all'
  draftDate.value = 'all'
  draftSort.value = 'soonest'
  filterDialogOpen.value = false
  await replaceCatalogQuery(1)
}

async function goToPage(page: number) {
  if (page < 1) {
    return
  }

  await replaceCatalogQuery(page)
}

watch(() => route.query, syncStateFromRoute, { deep: true })

watch(filterDialogOpen, (open) => {
  if (open) {
    syncDraftFiltersFromActive()
  }
})

const catalogQuery = computed(() => ({
  q: activeSearch.value || undefined,
  status: activeStatus.value === 'all' ? undefined : activeStatus.value,
  city: activeCity.value === 'all' ? undefined : activeCity.value,
  date: activeDate.value === 'all' ? undefined : activeDate.value,
  sort: activeSort.value === 'soonest' ? undefined : activeSort.value,
  page: activePage.value,
  pageSize: EVENTS_PAGE_SIZE,
}))

const { data: catalogResponse, pending, error: catalogFetchError } = await useAPI(() => '/api/events', {
  query: catalogQuery,
})

const { data: cityResponse } = await useAPI(() => '/api/events/cities')

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
const activeDialogFilterCount = computed(() => {
  let count = 0
  if (activeStatus.value !== 'all') count += 1
  if (activeCity.value !== 'all') count += 1
  if (activeDate.value !== 'all') count += 1
  if (activeSort.value !== 'soonest') count += 1
  return count
})
const draftDialogFilterCount = computed(() => {
  let count = 0
  if (draftStatus.value !== 'all') count += 1
  if (draftCity.value !== 'all') count += 1
  if (draftDate.value !== 'all') count += 1
  if (draftSort.value !== 'soonest') count += 1
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
    class-name="gap-8 py-6 md:gap-10 md:py-10 mt-20"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-3xl font-bold tracking-tight">
        Browse Events
      </h1>
      <form
        class="w-full sm:w-auto sm:max-w-md"
        @submit.prevent="applySearch"
      >
        <ButtonGroup class="w-full">
          <ButtonGroup class="overflow-visible">
            <ResponsiveDialog
              v-model:open="filterDialogOpen"
              content-class="sm:max-w-2xl"
            >
              <template #trigger>
                <Button
                  type="button"
                  size="icon"
                  class="relative overflow-visible"
                  aria-label="Open event filters"
                >
                  <SlidersHorizontal class="size-4" />
                  <span
                    v-if="activeDialogFilterCount > 0"
                    class="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
                  >
                    {{ activeDialogFilterCount }}
                  </span>
                </Button>
              </template>

              <div class="space-y-6 py-4 md:py-0">
                <DialogHeader>
                  <DialogTitle>Filter events</DialogTitle>
                  <DialogDescription>
                    Narrow the catalog by status, city, date, and sort order.
                  </DialogDescription>
                </DialogHeader>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-2">
                    <Label for="event-status-filter">Status</Label>
                    <Select v-model="draftStatus">
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
                    <Select v-model="draftCity">
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
                    <Select v-model="draftDate">
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
                    <Select v-model="draftSort">
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

                <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    class="rounded-full"
                    :disabled="activeDialogFilterCount === 0 && draftDialogFilterCount === 0"
                    @click="resetDialogFilters"
                  >
                    Reset filters
                  </Button>
                  <Button
                    type="button"
                    class="rounded-full"
                    @click="applyFilters"
                  >
                    Apply filters
                  </Button>
                </div>
              </div>
            </ResponsiveDialog>
          </ButtonGroup>

          <ButtonGroup class="min-w-0 flex-1">
            <InputGroup>
              <InputGroupInput
                id="main-search"
                v-model="searchInput"
                aria-label="Search events"
                placeholder="Search by event, venue, or city"
                :disabled="pending"
              />
              <InputGroupAddon align="inline-end">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <InputGroupButton
                      type="button"
                      class="hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-800 dark:hover:text-orange-100"
                      size="icon-xs"
                      aria-label="Clear search"
                      :disabled="pending || !searchInput"
                      @click="clearSearch"
                    >
                      <X class="size-4" />
                    </InputGroupButton>
                  </TooltipTrigger>
                  <TooltipContent>Clear</TooltipContent>
                </Tooltip>
              </InputGroupAddon>
            </InputGroup>
          </ButtonGroup>

          <ButtonGroup>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              class="rounded-full"
              aria-label="Search events"
              :disabled="pending"
            >
              <Search class="size-4" />
            </Button>
          </ButtonGroup>
        </ButtonGroup>
      </form>
    </div>

    <section class="space-y-6">
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
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
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
