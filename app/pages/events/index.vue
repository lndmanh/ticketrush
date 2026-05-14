<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X, MapPin, Calendar as CalendarIcon } from '@lucide/vue'
import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import type { ApiResponse, PaginatedApiResponse } from '~~/types/api'
import type { EventCatalogItem, EventCatalogLocationOptions } from '~~/types/events'
import { EventCatalogSort } from '#shared/commonEnums'

const EVENTS_PAGE_SIZE = 9

const { t, locale } = useI18n()

const sortOptions = computed<Array<{ label: string, value: EventCatalogSort }>>(() => [
  { label: t('events.sort_soonest'), value: EventCatalogSort.Soonest },
  { label: t('events.sort_newest'), value: EventCatalogSort.Newest },
  { label: t('events.sort_ending_soon'), value: EventCatalogSort.EndingSoon },
])

const router = useRouter()
const route = useRoute()

function getQueryString(value: string | string[] | null | undefined) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] || ''
  return ''
}

function getPositiveQueryNumber(value: string | string[] | null | undefined, fallback: number) {
  const parsed = Number(getQueryString(value))
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function isCatalogSort(value: string): value is EventCatalogSort {
  return sortOptions.value.some(option => option.value === value)
}

function getSortFromRoute() {
  const value = getQueryString(route.query.sort)
  return isCatalogSort(value) ? value : EventCatalogSort.Soonest
}

const keywordInput = ref(getQueryString(route.query.q))
const locationInput = ref(getQueryString(route.query.location))
const selectedDate = ref(getQueryString(route.query.date))
const activeKeyword = ref(getQueryString(route.query.q))
const activeLocation = ref(getQueryString(route.query.location))
const activeDate = ref(getQueryString(route.query.date))
const activeSort = ref<EventCatalogSort>(getSortFromRoute())
const activePage = ref(getPositiveQueryNumber(route.query.page, 1))

const dateFormatter = computed(() => new DateFormatter(locale.value, { dateStyle: 'long' }))

const calendarValue = computed({
  get: () => {
    if (!selectedDate.value) return undefined
    try {
      return parseDate(selectedDate.value)
    }
    catch {
      return undefined
    }
  },
  set: (val: DateValue | undefined) => {
    selectedDate.value = val ? val.toString() : ''
  },
})

function syncStateFromRoute() {
  keywordInput.value = getQueryString(route.query.q)
  locationInput.value = getQueryString(route.query.location)
  selectedDate.value = getQueryString(route.query.date)

  activeKeyword.value = getQueryString(route.query.q)
  activeLocation.value = getQueryString(route.query.location)
  activeDate.value = getQueryString(route.query.date)
  activeSort.value = getSortFromRoute()
  activePage.value = getPositiveQueryNumber(route.query.page, 1)
}

function buildCatalogQuery(page: number) {
  const query: Record<string, string> = {}

  const trimmedKeyword = keywordInput.value.trim()
  if (trimmedKeyword) query.q = trimmedKeyword

  const trimmedLocation = locationInput.value.trim()
  if (trimmedLocation) query.location = trimmedLocation

  const trimmedDate = selectedDate.value.trim()
  if (trimmedDate) query.date = trimmedDate

  if (activeSort.value !== EventCatalogSort.Soonest) query.sort = activeSort.value
  if (page > 1) query.page = String(page)

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
  keywordInput.value = ''
  locationInput.value = ''
  selectedDate.value = ''
  activeSort.value = EventCatalogSort.Soonest
  await replaceCatalogQuery(1)
}

async function clearFilter(key: string) {
  if (key === 'q') keywordInput.value = ''
  if (key === 'location') locationInput.value = ''
  if (key === 'date') selectedDate.value = ''
  await replaceCatalogQuery(1)
}

async function goToPage(page: number) {
  if (page < 1) return
  await replaceCatalogQuery(page)
}

watch(() => route.query, syncStateFromRoute, { deep: true })

const catalogQuery = computed(() => ({
  locale: locale.value,
  q: activeKeyword.value || undefined,
  location: activeLocation.value || undefined,
  date: activeDate.value || undefined,
  sort: activeSort.value === EventCatalogSort.Soonest ? undefined : activeSort.value,
  page: activePage.value,
  pageSize: EVENTS_PAGE_SIZE,
}))

const { data: catalogResponse, pending, error: catalogFetchError } = await useAPI<PaginatedApiResponse<EventCatalogItem[]>>(() => '/api/events', {
  query: catalogQuery,
})

const { data: locationResponse } = await useAPI<ApiResponse<EventCatalogLocationOptions>>(() => '/api/events/locations', {
  query: computed(() => ({ locale: locale.value })),
})

const catalog = computed(() => {
  const response = catalogResponse.value
  if (!response || !response.success) return null
  return response
})

const catalogError = computed(() => {
  if (catalogFetchError.value) return catalogFetchError.value.message
  const response = catalogResponse.value
  if (!response || response.success) return ''
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

const locationOptions = computed<string[]>(() => {
  const response = locationResponse.value
  if (!response || !response.success) {
    return []
  }

  const locations = new Set<string>()
  const data: EventCatalogLocationOptions = response.data

  for (const country of data.countries) {
    locations.add(country)
  }

  for (const city of data.cities) {
    locations.add(city)
  }

  for (const area of data.areas) {
    locations.add(area)
  }

  for (const venue of data.venues) {
    locations.add(venue.name)
    locations.add(venue.address)
  }

  return Array.from(locations)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
})

const activeFilterCount = computed(() => {
  let count = 0
  if (activeKeyword.value) count += 1
  if (activeLocation.value) count += 1
  if (activeDate.value) count += 1
  return count
})

const activeFilterChips = computed(() => {
  const chips: Array<{ key: string, label: string, value: string }> = []
  if (activeKeyword.value) {
    chips.push({ key: 'q', label: t('events.search_keyword_label'), value: activeKeyword.value })
  }
  if (activeLocation.value) {
    chips.push({ key: 'location', label: t('events.search_location_label'), value: activeLocation.value })
  }
  if (activeDate.value) {
    chips.push({ key: 'date', label: t('events.search_date_label'), value: activeDate.value })
  }
  return chips
})

const resultSummary = computed(() => {
  const total = pagination.value.totalItems
  if (total === 0) return t('events.result_no_events')
  if (total === 1) return t('events.result_one_event')
  const start = (pagination.value.page - 1) * pagination.value.pageSize + 1
  const end = Math.min(pagination.value.page * pagination.value.pageSize, total)
  return t('events.result_showing', { start, end, total })
})

const pageSummary = computed(() => {
  return t('events.page_info', { page: pagination.value.page, total: pagination.value.totalPages || 1 })
})

definePageMeta({
  title: 'events.page_title',
  breadcrumb: 'events.breadcrumb',
  defaultLayoutContained: false,
})
</script>

<template>
  <AppLayout
    :hide-header="true"
    class-name="relative gap-8 overflow-hidden md:gap-10 max-w-[90rem] px-4 mt-16 pb-3 sm:px-6 lg:px-10"
  >
    <div class="relative space-y-5 py-3">
      <TicketCheckoutRecoveryBanner />

      <form
        class="space-y-3"
        @submit.prevent="applySearch"
      >
        <div class="sr-only">
          <Label for="event-location">{{ $t('events.search_location_label') }}</Label>
          <Label for="event-date">{{ $t('events.search_date_label') }}</Label>
          <Label for="event-keyword">{{ $t('events.search_keyword_label') }}</Label>
        </div>

        <ButtonGroup class="w-full flex-col gap-2 md:flex-row md:gap-0 [&>*]:max-md:rounded-full [&>*]:max-md:border-l">
          <InputGroup class="h-12 bg-background/80 md:flex-[1.1] md:rounded-r-none md:border-r-0">
            <InputGroupAddon>
              <MapPin class="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              id="event-location"
              v-model="locationInput"
              class="h-12 text-sm"
              :aria-label="$t('events.search_location_label')"
              :placeholder="$t('events.search_location_placeholder')"
              list="location-options"
            />
            <datalist id="location-options">
              <option
                v-for="loc in locationOptions"
                :key="loc"
                :value="loc"
              />
            </datalist>
          </InputGroup>

          <Popover>
            <PopoverTrigger as-child>
              <Button
                id="event-date"
                type="button"
                variant="outline"
                class="h-12 w-full justify-start bg-background/80 px-4 text-left font-normal md:flex-1 md:rounded-none md:border-r-0"
                :class="!selectedDate && 'text-muted-foreground'"
                :aria-label="$t('events.search_date_label')"
              >
                <CalendarIcon class="mr-2 size-4 shrink-0" />
                <span class="truncate">
                  {{ calendarValue ? dateFormatter.format(calendarValue.toDate(getLocalTimeZone())) : $t('events.search_date_placeholder') }}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              class="w-auto rounded-[1.5rem] p-0"
              align="start"
            >
              <Calendar
                v-model="calendarValue"
                initial-focus
              />
              <div
                v-if="selectedDate"
                class="border-t p-3"
              >
                <Button
                  type="button"
                  variant="ghost"
                  class="h-9 w-full rounded-full text-xs"
                  @click="selectedDate = ''"
                >
                  {{ $t('events.clear_date') }}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <InputGroup class="h-12 bg-background/80 md:flex-[1.45] md:rounded-none md:border-r-0">
            <InputGroupAddon>
              <Search class="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              id="event-keyword"
              v-model="keywordInput"
              class="h-12 text-sm"
              :aria-label="$t('events.search_keyword_label')"
              :placeholder="$t('events.search_keyword_placeholder')"
            />
          </InputGroup>

          <Button
            type="submit"
            class="h-12 px-5 md:rounded-none"
          >
            <Search class="size-4" />
            {{ $t('events.search_btn') }}
          </Button>
          <Button
            type="button"
            variant="outline"
            class="h-12 px-5 md:rounded-l-none"
            :disabled="activeFilterCount === 0"
            @click="resetFilters"
          >
            <X class="size-4" />
            {{ $t('events.reset_btn') }}
          </Button>
        </ButtonGroup>
      </form>

      <div
        v-if="activeFilterChips.length > 0"
        class="flex flex-wrap items-center gap-2 rounded-lg border bg-background/70 p-3"
      >
        <span class="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {{ $t('events.active_filters_label') }}
        </span>
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          type="button"
          class="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-primary/8"
          @click="clearFilter(chip.key)"
        >
          <span class="text-muted-foreground">{{ chip.label }}:</span>
          <span class="truncate font-medium">{{ chip.value }}</span>
          <X class="size-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>

    <section class="space-y-5">
      <div
        v-if="events.length > 0"
        class="flex flex-col gap-3 rounded-lg border bg-card/60 p-3 md:flex-row md:items-center md:justify-between"
      >
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
            {{ $t('events.badge_loading') }}
          </Badge>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <Label
              for="event-sort-filter"
              class="text-sm text-muted-foreground whitespace-nowrap"
            >{{ $t('events.sort_label') }}</Label>
            <Select
              v-model="activeSort"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-sort-filter"
                class="h-9 rounded-full text-xs"
              >
                <SelectValue :placeholder="$t('events.sort_soonest')" />
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
        class="border py-16"
      >
        <EmptyHeader>
          <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border bg-muted/40">
            <CalendarDays class="size-5 text-muted-foreground" />
          </div>
          <EmptyTitle>{{ $t('events.no_match_title') }}</EmptyTitle>
          <EmptyDescription>
            {{ $t('events.no_match_desc') }}
          </EmptyDescription>
        </EmptyHeader>
        <Button
          variant="outline"
          class="mt-5 rounded-full"
          @click="resetFilters"
        >
          {{ $t('events.reset_filters') }}
        </Button>
      </Empty>

      <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
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
            :disabled="!pagination.hasPreviousPage"
            :aria-label="$t('events.prev_page')"
            @click="goToPage(pagination.page - 1)"
          >
            <ChevronLeft class="size-4" />
            {{ $t('events.prev_page') }}
          </Button>
          <Button
            type="button"
            variant="outline"
            class="rounded-full"
            :disabled="!pagination.hasNextPage"
            :aria-label="$t('events.next_page')"
            @click="goToPage(pagination.page + 1)"
          >
            {{ $t('events.next_page') }}
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </section>
  </AppLayout>
</template>
