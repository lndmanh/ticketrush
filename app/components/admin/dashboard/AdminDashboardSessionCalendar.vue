<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { AdminDashboardCalendarSession } from '~~/types/admin-dashboard'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { CalendarClock, ChevronLeft, ChevronRight, MapPin, Ticket } from '@lucide/vue'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNext,
  CalendarPrev,
  CalendarRoot,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  selectedDate: string
  sessionCounts: Record<string, number>
  sessions: AdminDashboardCalendarSession[]
}>()

const emit = defineEmits<{
  (event: 'update:selectedDate', value: string): void
}>()

function parseIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month) || !Number.isSafeInteger(day)) {
    return null
  }

  return new CalendarDate(year, month, day)
}

const selectedDateValue = computed<DateValue | undefined>({
  get() {
    return parseIsoDate(props.selectedDate) ?? today(getLocalTimeZone())
  },
  set(value) {
    if (value) {
      emit('update:selectedDate', value.toString())
    }
  },
})

function getSessionCount(day: DateValue) {
  return props.sessionCounts[day.toString()] ?? 0
}

function getDayNumber(day: DateValue) {
  return new Date(`${day.toString()}T00:00:00`).getDate()
}

function formatSelectedDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function getStatusVariant(statusLabel: string): 'default' | 'outline' | 'secondary' {
  if (statusLabel === 'Live' || statusLabel === 'Selling') return 'default'
  if (statusLabel === 'Draft') return 'outline'
  return 'secondary'
}

function getSeatSummary(session: AdminDashboardCalendarSession) {
  if (session.totalSeats === 0) return 'No seats listed'
  return `${session.soldSeats}/${session.totalSeats} sold`
}

function getOccupancyWidth(session: AdminDashboardCalendarSession) {
  if (session.totalSeats === 0) return '0%'
  return `${Math.round((session.soldSeats / session.totalSeats) * 100)}%`
}
</script>

<template>
  <Card class="overflow-hidden border-border/70 bg-card/90 shadow-sm">
    <CardHeader class="space-y-2 border-b pb-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <CardTitle class="text-base">
            Session calendar
          </CardTitle>
          <p class="mt-1 text-sm text-muted-foreground">
            Pick a day to inspect launches and sales status.
          </p>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-5 pt-5">
      <CalendarRoot
        v-slot="{ grid, weekDays }"
        v-model="selectedDateValue"
        :week-starts-on="1"
        fixed-weeks
        prevent-deselect
        class="w-full"
      >
        <CalendarHeader class="mb-4 flex items-center justify-between gap-3">
          <CalendarPrev
            class="inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Previous month"
          >
            <ChevronLeft class="size-4" />
          </CalendarPrev>
          <CalendarHeading class="text-sm font-semibold text-foreground" />
          <CalendarNext
            class="inline-flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Next month"
          >
            <ChevronRight class="size-4" />
          </CalendarNext>
        </CalendarHeader>

        <CalendarGrid
          v-for="month in grid"
          :key="month.value.toString()"
          class="w-full border-separate border-spacing-y-1"
        >
          <CalendarGridHead>
            <CalendarGridRow class="grid grid-cols-7 gap-1">
              <CalendarHeadCell
                v-for="day in weekDays"
                :key="day"
                class="py-2 text-center text-[11px] font-medium text-muted-foreground"
              >
                {{ day }}
              </CalendarHeadCell>
            </CalendarGridRow>
          </CalendarGridHead>
          <CalendarGridBody>
            <CalendarGridRow
              v-for="(weekDates, index) in month.rows"
              :key="`${month.value.toString()}-${index}`"
              class="grid grid-cols-7 gap-1"
            >
              <CalendarCell
                v-for="day in weekDates"
                :key="day.toString()"
                :date="day"
              >
                <CalendarCellTrigger
                  v-slot="{ selected, today: isToday, outsideView }"
                  :day="day"
                  :month="month.value"
                  :class="cn(
                    'relative flex aspect-square min-h-10 w-full flex-col items-center justify-center rounded-xl text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    outsideView ? 'text-muted-foreground/35' : 'text-foreground hover:bg-muted',
                    isToday && !selected ? 'bg-primary/10 text-primary' : '',
                    selected ? 'bg-primary text-primary-foreground shadow-sm' : '',
                  )"
                >
                  <span class="leading-none">{{ getDayNumber(day) }}</span>
                  <span
                    v-if="getSessionCount(day) > 0"
                    :class="cn(
                      'mt-1 h-1.5 min-w-1.5 rounded-full px-1 text-[9px] leading-[0.375rem]',
                      selected ? 'bg-primary-foreground/80 text-primary' : 'bg-primary/75 text-primary-foreground',
                    )"
                  >
                    {{ getSessionCount(day) > 1 ? getSessionCount(day) : '' }}
                  </span>
                </CalendarCellTrigger>
              </CalendarCell>
            </CalendarGridRow>
          </CalendarGridBody>
        </CalendarGrid>
      </CalendarRoot>

      <div class="border-t pt-5">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold tracking-[-0.02em] text-foreground">
              Daily agenda
            </h3>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ formatSelectedDate(props.selectedDate) }}
            </p>
          </div>
          <Badge
            variant="outline"
            class="rounded-full"
          >
            {{ sessions.length }} session{{ sessions.length === 1 ? '' : 's' }}
          </Badge>
        </div>

        <div class="space-y-3">
          <NuxtLink
            v-for="session in sessions"
            :key="session.id"
            :to="`/admin/events/${session.eventId}`"
            class="group block rounded-2xl border bg-muted/25 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <p class="truncate font-medium text-foreground">
                  {{ session.eventTitle }}
                </p>
                <p class="truncate text-sm text-muted-foreground">
                  {{ session.label }} · {{ formatTime(session.startsAt) }}
                </p>
              </div>
              <Badge
                :variant="getStatusVariant(session.statusLabel)"
                class="shrink-0 rounded-full"
              >
                {{ session.statusLabel }}
              </Badge>
            </div>

            <div class="mt-4 grid gap-2 text-sm text-muted-foreground">
              <div class="flex items-center gap-2">
                <MapPin class="size-3.5 shrink-0" />
                <span class="truncate">{{ session.venueName || 'Venue pending' }}{{ session.venueCity ? `, ${session.venueCity}` : '' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Ticket class="size-3.5 shrink-0" />
                <span>{{ getSeatSummary(session) }}</span>
                <span class="ml-auto font-mono text-xs text-foreground">{{ formatCurrency(session.revenueCents) }}</span>
              </div>
            </div>

            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                class="h-full rounded-full bg-primary transition-all duration-500"
                :style="{ width: getOccupancyWidth(session) }"
              />
            </div>
          </NuxtLink>

          <Empty
            v-if="sessions.length === 0"
            class="border bg-muted/20 py-10"
          >
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarClock class="size-5" />
              </EmptyMedia>
              <EmptyTitle>No sessions on this day</EmptyTitle>
              <EmptyDescription>
                Select a marked date to inspect selling windows, capacity, and revenue.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
