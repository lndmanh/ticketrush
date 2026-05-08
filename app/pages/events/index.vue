<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApiResponse, PaginatedApiResponse } from '~~/types/api'
import type {
  EventCatalogDateFilter,
  EventCatalogItem,
  EventCatalogLocationOptions,
  EventCatalogSort,
  EventCatalogStatusFilter,
} from '~~/types/events'

const EVENTS_PAGE_SIZE = 9

const { t } = useI18n()

const statusOptions = computed(() => [
  { label: t('events.status_all'), value: 'all' as EventCatalogStatusFilter },
  { label: t('events.status_upcoming'), value: 'published' as EventCatalogStatusFilter },
  { label: t('events.status_on_sale'), value: 'on_sale' as EventCatalogStatusFilter },
  { label: t('events.status_sold_out'), value: 'sold_out' as EventCatalogStatusFilter },
  { label: t('events.status_ended'), value: 'ended' as EventCatalogStatusFilter },
])

const dateOptions = computed(() => [
  { label: t('events.date_any'), value: 'all' as EventCatalogDateFilter },
  { label: t('events.date_today'), value: 'today' as EventCatalogDateFilter },
  { label: t('events.date_week'), value: 'week' as EventCatalogDateFilter },
  { label: t('events.date_month'), value: 'month' as EventCatalogDateFilter },
])

const sortOptions = computed(() => [
  { label: t('events.sort_soonest'), value: 'soonest' as EventCatalogSort },
  { label: t('events.sort_newest_releases'), value: 'newest' as EventCatalogSort },
  { label: t('events.sort_ending_soon'), value: 'ending_soon' as EventCatalogSort },
])

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
  return statusOptions.value.some(option => option.value === value)
}

function isDateFilter(value: string): value is EventCatalogDateFilter {
  return dateOptions.value.some(option => option.value === value)
}

function isCatalogSort(value: string): value is EventCatalogSort {
  return sortOptions.value.some(option => option.value === value)
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
const activeCountry = ref(getQueryString(route.query.country) || 'all')
const activeCity = ref(getQueryString(route.query.city) || 'all')
const activeArea = ref(getQueryString(route.query.area))
const activeVenue = ref(getQueryString(route.query.venue) || 'all')
const activeDate = ref<EventCatalogDateFilter>(getDateFilterFromRoute())
const activeSort = ref<EventCatalogSort>(getSortFromRoute())
const activePage = ref(getPositiveQueryNumber(route.query.page, 1))

function syncStateFromRoute() {
  const routeSearch = getQueryString(route.query.q)
  searchInput.value = routeSearch
  activeSearch.value = routeSearch
  activeStatus.value = getStatusFilterFromRoute()
  activeCountry.value = getQueryString(route.query.country) || 'all'
  activeCity.value = getQueryString(route.query.city) || 'all'
  activeArea.value = getQueryString(route.query.area)
  activeVenue.value = getQueryString(route.query.venue) || 'all'
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

  if (activeCountry.value !== 'all') {
    query.country = activeCountry.value
  }

  if (activeCity.value !== 'all') {
    query.city = activeCity.value
  }

  const trimmedArea = activeArea.value.trim()
  if (trimmedArea) {
    query.area = trimmedArea
  }

  if (activeVenue.value !== 'all') {
    query.venue = activeVenue.value
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
  activeCountry.value = 'all'
  activeCity.value = 'all'
  activeArea.value = ''
  activeVenue.value = 'all'
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
  country: activeCountry.value === 'all' ? undefined : activeCountry.value,
  city: activeCity.value === 'all' ? undefined : activeCity.value,
  area: activeArea.value.trim() || undefined,
  venue: activeVenue.value === 'all' ? undefined : activeVenue.value,
  date: activeDate.value === 'all' ? undefined : activeDate.value,
  sort: activeSort.value === 'soonest' ? undefined : activeSort.value,
  page: activePage.value,
  pageSize: EVENTS_PAGE_SIZE,
}))

const { data: catalogResponse, pending, error: catalogFetchError } = await useFetch<PaginatedApiResponse<EventCatalogItem[]>>('/api/events', {
  query: catalogQuery,
})

const { data: locationResponse } = await useFetch<ApiResponse<EventCatalogLocationOptions>>('/api/events/locations')

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
const locationOptions = computed(() => {
  const response = locationResponse.value
  if (!response || !response.success) {
    return {
      countries: [] as string[],
      cities: [] as string[],
      areas: [] as string[],
      venues: [] as EventCatalogLocationOptions['venues'],
    }
  }

  return response.data
})

const countryOptions = computed(() => locationOptions.value.countries)

const cityOptions = computed(() => {
  const cities = locationOptions.value.cities
  if (activeCountry.value === 'all') {
    return cities
  }

  const country = activeCountry.value.toLowerCase()
  const filtered = locationOptions.value.venues
    .filter(venue => venue.country.toLowerCase() === country)
    .map(venue => venue.city)

  return Array.from(new Set(filtered)).sort((left, right) => left.localeCompare(right))
})

const areaOptions = computed(() => {
  const selectedCity = activeCity.value.toLowerCase()
  const selectedCountry = activeCountry.value.toLowerCase()
  const areas = locationOptions.value.areas
  if (selectedCity === 'all' && selectedCountry === 'all') {
    return areas
  }

  const fromAddress = new Set<string>()
  for (const venue of locationOptions.value.venues) {
    if (selectedCountry !== 'all' && venue.country.toLowerCase() !== selectedCountry) {
      continue
    }
    if (selectedCity !== 'all' && venue.city.toLowerCase() !== selectedCity) {
      continue
    }
    for (const part of venue.address.split(',').map(part => part.trim()).filter(Boolean)) {
      const normalized = part.toLowerCase()
      if (normalized === venue.city.toLowerCase() || normalized === venue.country.toLowerCase()) {
        continue
      }
      fromAddress.add(part)
    }
  }

  return Array.from(fromAddress).sort((left, right) => left.localeCompare(right))
})

const venueOptions = computed(() => {
  const selectedCountry = activeCountry.value.toLowerCase()
  const selectedCity = activeCity.value.toLowerCase()
  const selectedArea = activeArea.value.trim().toLowerCase()

  return locationOptions.value.venues.filter((venue) => {
    if (selectedCountry !== 'all' && venue.country.toLowerCase() !== selectedCountry) {
      return false
    }

    if (selectedCity !== 'all' && venue.city.toLowerCase() !== selectedCity) {
      return false
    }

    if (selectedArea) {
      const values = [venue.address, venue.name, venue.city]
      if (!values.some(value => value.toLowerCase().includes(selectedArea))) {
        return false
      }
    }

    return true
  })
})

watch(activeCountry, (country) => {
  if (country === 'all') {
    return
  }

  if (activeCity.value !== 'all' && !cityOptions.value.includes(activeCity.value)) {
    activeCity.value = 'all'
  }

  if (activeVenue.value !== 'all' && !venueOptions.value.some(venue => venue.slug === activeVenue.value)) {
    activeVenue.value = 'all'
  }
})

watch(activeCity, (city) => {
  if (city === 'all') {
    return
  }

  if (activeVenue.value !== 'all' && !venueOptions.value.some(venue => venue.slug === activeVenue.value)) {
    activeVenue.value = 'all'
  }
})
const activeFilterCount = computed(() => {
  let count = 0
  if (activeSearch.value) count += 1
  if (activeStatus.value !== 'all') count += 1
  if (activeCountry.value !== 'all') count += 1
  if (activeCity.value !== 'all') count += 1
  if (activeArea.value.trim()) count += 1
  if (activeVenue.value !== 'all') count += 1
  if (activeDate.value !== 'all') count += 1
  return count
})
const resultSummary = computed(() => {
  const total = pagination.value.totalItems
  if (total === 0) {
    return t('events.result_no_events')
  }

  const start = (pagination.value.page - 1) * pagination.value.pageSize + 1
  const end = Math.min(pagination.value.page * pagination.value.pageSize, total)
  return t('events.result_showing', { start, end, total })
})

definePageMeta({
  title: 'Events',
  breadcrumb: 'Events',
})
</script>

<template>
  <AppLayout
    :hide-header="true"
    class-name="relative gap-8 overflow-hidden py-6 md:gap-10 md:py-10"
  >
    <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(circle_at_16%_12%,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_88%_8%,hsl(var(--muted-foreground)/0.12),transparent_28%)]" />

    <section class="surface-shell overflow-hidden">
      <div class="surface-core relative grid gap-8 overflow-hidden px-5 py-7 md:px-8 md:py-9 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)] lg:items-end">
        <div class="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div class="relative space-y-5">
          <Badge
            variant="outline"
            class="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-primary"
          >
            {{ $t('events.catalog_eyebrow') }}
          </Badge>
          <div class="space-y-4">
            <h1 class="display-title max-w-4xl text-balance md:text-7xl">
              {{ $t('events.catalog_title') }}
            </h1>
            <p class="max-w-[44rem] text-base leading-8 text-muted-foreground md:text-lg">
              {{ $t('events.catalog_subtitle') }}
            </p>
          </div>
        </div>

        <div class="relative grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div class="rounded-[1.5rem] border bg-background/70 p-4 backdrop-blur">
            <p class="font-mono text-3xl font-semibold tracking-[-0.06em] text-foreground">
              {{ pagination.totalItems }}
            </p>
            <p class="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {{ $t('events.stat_events') }}
            </p>
          </div>
          <div class="rounded-[1.5rem] border bg-background/70 p-4 backdrop-blur">
            <p class="font-mono text-3xl font-semibold tracking-[-0.06em] text-foreground">
              {{ cityOptions.length }}
            </p>
            <p class="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {{ $t('events.stat_cities') }}
            </p>
          </div>
          <div class="rounded-[1.5rem] border bg-background/70 p-4 backdrop-blur">
            <p class="font-mono text-3xl font-semibold tracking-[-0.06em] text-foreground">
              {{ activeFilterCount }}
            </p>
            <p class="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {{ $t('events.stat_active_filters') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <Card class="overflow-hidden border-muted/70 bg-card/70 shadow-none backdrop-blur">
      <CardContent class="relative space-y-5 p-4 md:p-5">
        <div class="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
        <form
          class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
          @submit.prevent="applySearch"
        >
          <div class="space-y-2">
            <Label for="event-search">{{ $t('events.search_events_label') }}</Label>
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="event-search"
                v-model="searchInput"
                class="h-11 rounded-full pl-10"
                :placeholder="$t('events.search_events_placeholder')"
              />
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Button
              type="submit"
              class="h-11 rounded-full px-5"
            >
              {{ $t('events.search_btn') }}
            </Button>
            <Button
              type="button"
              variant="outline"
              class="h-11 rounded-full px-5"
              :disabled="activeFilterCount === 0"
              @click="resetFilters"
            >
              <X class="size-4" />
              {{ $t('events.reset_btn') }}
            </Button>
          </div>
        </form>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div class="space-y-2">
            <Label for="event-status-filter">{{ $t('events.status_label') }}</Label>
            <Select
              v-model="activeStatus"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-status-filter"
                class="h-11 rounded-full"
              >
                <SelectValue :placeholder="$t('events.status_all')" />
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
            <Label for="event-country-filter">{{ $t('events.country_label') }}</Label>
            <Select
              v-model="activeCountry"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-country-filter"
                class="h-11 rounded-full"
              >
                <SelectValue :placeholder="$t('events.country_all')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {{ $t('events.country_all') }}
                </SelectItem>
                <SelectItem
                  v-for="country in countryOptions"
                  :key="country"
                  :value="country"
                >
                  {{ country }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="event-city-filter">{{ $t('events.city_label') }}</Label>
            <Select
              v-model="activeCity"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-city-filter"
                class="h-11 rounded-full"
              >
                <SelectValue :placeholder="$t('events.city_all')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {{ $t('events.city_all') }}
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
            <Label for="event-area-filter">{{ $t('events.area_label') }}</Label>
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="event-area-filter"
                v-model="activeArea"
                class="h-11 rounded-full pl-10"
                list="event-area-options"
                :placeholder="$t('events.area_placeholder')"
                @keydown.enter.prevent="applySearch"
              />
              <datalist id="event-area-options">
                <option
                  v-for="area in areaOptions"
                  :key="area"
                  :value="area"
                />
              </datalist>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="event-venue-filter">{{ $t('events.venue_label') }}</Label>
            <Select
              v-model="activeVenue"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-venue-filter"
                class="h-11 rounded-full"
              >
                <SelectValue :placeholder="$t('events.venue_all')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {{ $t('events.venue_all') }}
                </SelectItem>
                <SelectItem
                  v-for="venue in venueOptions"
                  :key="venue.slug"
                  :value="venue.slug"
                >
                  {{ venue.name }} · {{ venue.city }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="event-date-filter">{{ $t('events.date_label') }}</Label>
            <Select
              v-model="activeDate"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-date-filter"
                class="h-11 rounded-full"
              >
                <SelectValue :placeholder="$t('events.date_any')" />
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
            <Label for="event-sort-filter">{{ $t('events.sort_label') }}</Label>
            <Select
              v-model="activeSort"
              @update:model-value="replaceCatalogQuery(1)"
            >
              <SelectTrigger
                id="event-sort-filter"
                class="h-11 rounded-full"
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
      </CardContent>
    </Card>

    <section class="space-y-5">
      <div class="flex flex-col gap-3 rounded-[1.5rem] border bg-card/60 p-3 md:flex-row md:items-center md:justify-between">
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
          {{ resultSummary }} · {{ $t('events.page_info', { page: pagination.page, total: pagination.totalPages || 1 }) }}
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
