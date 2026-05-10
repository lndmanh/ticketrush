<script setup lang="ts">
import { Check, CircleSlash, LockKeyhole, Search, Ticket, ZoomIn, ZoomOut } from '@lucide/vue'
import type { SeatMapSeat, SeatMapStatus, SeatMapTicketType } from '~~/types/seatmap'
import { colorToRgb, formatSeatMapCurrency } from '@/lib/seatmapLayout'
import { Button } from '@/components/ui/button'
import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const { t } = useI18n()

const props = withDefaults(defineProps<{
  seats: SeatMapSeat[]
  ticketTypes: SeatMapTicketType[]
  actionLabel?: string | null
  selectedSeatIds?: number[]
  interactive?: boolean
  mode?: 'public' | 'admin'
}>(), {
  actionLabel: 'Open live seat selection',
  selectedSeatIds: () => [],
  interactive: false,
  mode: 'public',
})

const emit = defineEmits<{
  purchase: []
  toggle: [seatId: number]
}>()

function getSeatStyle(color: string, seat: SeatMapSeat, isActive: boolean, isSelected: boolean) {
  const rgb = colorToRgb(color)
  const baseStyle = {
    gridColumn: `${(seat.displayX ?? 0) + 1}`,
    fontVariantNumeric: 'tabular-nums',
  }

  if (isSelected) {
    return {
      ...baseStyle,
      backgroundColor: 'hsl(var(--primary))',
      borderColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      boxShadow: '0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary) / 0.45), 0 22px 38px -24px rgba(0,0,0,0.5)',
    }
  }

  if (!rgb) {
    return baseStyle
  }

  if (seat.status === 'sold') {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'rgba(15, 23, 42, 0.92)',
      color: 'rgba(255,255,255,0.72)',
      boxShadow: isActive ? '0 0 0 2px rgba(255,255,255,0.55), 0 10px 24px -18px rgba(15, 23, 42, 0.95)' : 'none',
    }
  }

  if (seat.status === 'locked') {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.56)',
      color: 'rgb(146, 64, 14)',
      opacity: 0.72,
      boxShadow: isActive ? '0 0 0 2px rgba(245, 158, 11, 0.34), 0 10px 24px -18px rgba(245, 158, 11, 0.58)' : 'none',
    }
  }

  if (seat.status === 'unavailable') {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(100, 116, 139, 0.18)',
      borderColor: 'rgba(100, 116, 139, 0.36)',
      color: 'rgb(71, 85, 105)',
      boxShadow: isActive ? '0 0 0 2px rgba(100, 116, 139, 0.3), 0 10px 24px -18px rgba(100, 116, 139, 0.65)' : 'none',
    }
  }

  return {
    ...baseStyle,
    backgroundColor: `rgba(${rgb}, 0.98)`,
    borderColor: `rgba(${rgb}, 0.88)`,
    color: 'white',
    boxShadow: isActive ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px rgba(${rgb}, 0.34), 0 22px 36px -22px rgba(${rgb}, 0.62)` : `0 8px 18px -16px rgba(${rgb}, 0.6)`,
  }
}

function getSectionStartingPrice(seats: SeatMapSeat[]) {
  const pricedSeats = seats.filter(seat => typeof seat.priceCents === 'number')
  if (pricedSeats.length === 0) {
    return null
  }

  const [firstSeat, ...remainingSeats] = pricedSeats
  if (!firstSeat) {
    return null
  }

  return remainingSeats.reduce((lowest, seat) => seat.priceCents < lowest.priceCents ? seat : lowest, firstSeat)
}

function getSeatColor(sectionColor: string, seat: SeatMapSeat, ticketTypeById: Map<number, SeatMapTicketType>) {
  if (typeof seat.ticketTypeId !== 'number') {
    return sectionColor
  }

  return ticketTypeById.get(seat.ticketTypeId)?.color || sectionColor
}

function getTicketTypeSeatCount(ticketTypeId: number | undefined, seats: SeatMapSeat[]) {
  if (typeof ticketTypeId !== 'number') {
    return 0
  }

  return seats.filter(seat => seat.ticketTypeId === ticketTypeId).length
}

function onSeatPress(seat: SeatMapSeat, setActiveSeat: (seatId: number) => void) {
  setActiveSeat(seat.id)

  if (!props.interactive || seat.status !== 'available') {
    return
  }

  emit('toggle', seat.id)
}

function getSeatInteractionClass(seat: SeatMapSeat) {
  return seat.status === 'available'
    ? 'hover:-translate-y-0.5 active:scale-[0.96]'
    : 'cursor-not-allowed opacity-70'
}

function getStatusLabel(status: SeatMapStatus) {
  if (status === 'available') {
    return t('seatmap.status_available')
  }

  if (status === 'locked') {
    return t('seatmap.status_locked')
  }

  if (status === 'sold') {
    return t('seatmap.status_sold')
  }

  return t('seatmap.status_unavailable')
}

function getStatusBadgeClass(status: SeatMapStatus) {
  if (status === 'available') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  }

  if (status === 'locked') {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }

  if (status === 'sold') {
    return 'border-slate-950/10 bg-slate-950 text-white dark:border-white/10 dark:bg-white/10 dark:text-white'
  }

  return 'border-border bg-muted text-muted-foreground'
}

function getStatusDescription(status: SeatMapStatus) {
  if (status === 'available') {
    return props.interactive ? t('seatmap.desc_available_interactive') : t('seatmap.desc_available')
  }

  if (status === 'locked') {
    return t('seatmap.desc_locked')
  }

  if (status === 'sold') {
    return t('seatmap.desc_sold')
  }

  return t('seatmap.desc_unavailable')
}
</script>

<template>
  <TicketSeatMapLayoutProvider
    v-slot="{
      layout,
      inventorySummary,
      sectionOptions,
      selectedSection,
      visibleSections,
      activeSeat,
      activeSeatTicketType,
      stageStyle,
      zoomLevel,
      zoomStyle,
      isSeatSelected,
      setActiveSeat,
      setSelectedSection,
      decreaseZoom,
      increaseZoom,
      resetZoom,
      getRowStyle,
      getTintStyle,
    }"
    :seats="seats"
    :ticket-types="ticketTypes"
    :selected-seat-ids="selectedSeatIds"
  >
    <section class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          :model-value="selectedSection"
          @update:model-value="setSelectedSection"
        >
          <SelectTrigger class="min-w-[12rem]">
            <SelectValue placeholder="Focus section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All sections
            </SelectItem>
            <SelectItem
              v-for="section in sectionOptions"
              :key="section.value"
              :value="section.value"
            >
              {{ section.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <div class="flex items-center gap-2 rounded-full border border-border bg-muted/35 p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            @click="decreaseZoom"
          >
            <ZoomOut class="size-4" />
          </Button>
          <span class="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-muted-foreground">
            {{ zoomLevel }}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            @click="increaseZoom"
          >
            <ZoomIn class="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="px-3 text-xs"
            @click="resetZoom"
          >
            Reset
          </Button>
        </div>
      </div>

      <div
        v-if="seats.length === 0"
        class="rounded-[1.75rem] border border-dashed border-border bg-muted/25 p-8 text-center"
      >
        <p class="text-sm font-medium text-foreground">
          {{ $t('seatmap.layout_empty_title') }}
        </p>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ $t('seatmap.layout_empty_desc') }}
        </p>
      </div>

      <template v-else>
        <div class="flex h-full min-h-0 flex-col rounded-[1.75rem] border border-border bg-secondary/45 p-4 md:p-5">
          <div
            class="rounded-[1.5rem] border px-4 py-5 text-center md:px-6"
            :style="stageStyle"
          >
            <p class="text-sm font-medium text-foreground">
              {{ $t('seatmap.stage') }}
            </p>
            <p class="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {{ $t('seatmap.front_of_house') }}
            </p>
          </div>

          <div
            v-if="inventorySummary.total > 0"
            class="mt-4 flex flex-wrap gap-2"
          >
            <span class="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
              <Check class="size-3.5" />
              {{ $t('common.available') }}
            </span>
            <span
              v-if="interactive"
              class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              <Ticket class="size-3.5" />
              {{ $t('common.selected') }}
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
              <LockKeyhole class="size-3.5" />
              {{ $t('seatmap.temporarily_held') }}
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-slate-950/10 bg-slate-950 px-3 py-1.5 text-xs text-white dark:border-white/10 dark:bg-white/10">
              <CircleSlash class="size-3.5" />
              {{ $t('common.sold') }}
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <Search class="size-3.5" />
              {{ $t('seatmap.click_to_inspect') }}
            </span>
          </div>

          <div
            v-if="ticketTypes.length > 0"
            class="mt-3 flex flex-wrap gap-2"
          >
            <span
              v-for="ticketType in ticketTypes"
              :key="ticketType.id ?? ticketType.name"
              class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground"
            >
              <span
                class="size-2.5 rounded-full"
                :style="{ backgroundColor: ticketType.color }"
              />
              <span class="font-medium">{{ ticketType.name }}</span>
              <span class="text-muted-foreground">
                {{ formatSeatMapCurrency(ticketType.priceCents, ticketType.currency) }} · {{ $t('seatmap.seat_count', { count: getTicketTypeSeatCount(ticketType.id, seats) }) }}
              </span>
            </span>
          </div>

          <ScrollArea class="mt-4 min-h-[34rem] flex-1 rounded-[1.5rem] border border-border bg-background/80">
            <div class="min-w-fit p-4 md:p-7">
              <div
                class="w-max min-w-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                :style="zoomStyle"
              >
                <div class="grid justify-center gap-4 xl:grid-cols-1">
                  <article
                    v-for="section in visibleSections"
                    :key="section.key"
                    class="w-fit rounded-[1.5rem] border p-4"
                    :style="getTintStyle(section.color, 0.18, 0.14)"
                  >
                    <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div class="space-y-2">
                        <div class="flex items-center gap-3">
                          <span
                            class="size-2.5 rounded-full"
                            :style="{ backgroundColor: section.color }"
                          />
                          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            {{ section.code }}
                          </p>
                        </div>
                        <div>
                          <h3 class="text-lg font-semibold tracking-tight text-foreground">
                            {{ section.name }}
                          </h3>
                          <p class="text-sm text-muted-foreground">
                            {{ $t('seatmap.section_summary', { available: section.metrics.available, total: section.metrics.total, rows: section.rows.length }) }}
                            <template v-if="getSectionStartingPrice(section.seats)">
                              · {{ $t('seatmap.from_price', { price: formatSeatMapCurrency(getSectionStartingPrice(section.seats)?.priceCents ?? 0, getSectionStartingPrice(section.seats)?.currency) }) }}
                            </template>
                          </p>
                        </div>
                      </div>

                      <div class="grid grid-cols-3 gap-2 text-center md:min-w-[12rem]">
                        <div class="rounded-2xl border border-border bg-background/88 px-3 py-2">
                          <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Open
                          </p>
                          <p class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {{ section.metrics.available }}
                          </p>
                        </div>
                        <div class="rounded-2xl border border-border bg-background/88 px-3 py-2">
                          <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Held
                          </p>
                          <p class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {{ section.metrics.locked }}
                          </p>
                        </div>
                        <div class="rounded-2xl border border-border bg-background/88 px-3 py-2">
                          <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Sold
                          </p>
                          <p class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                            {{ section.metrics.sold }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator class="my-4" />

                    <div class="space-y-3">
                      <div
                        v-for="row in section.rows"
                        :key="`${section.code}-${row.label}`"
                        class="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-3.5"
                      >
                        <div class="flex h-11 flex-col items-center justify-center rounded-xl border border-border bg-background/92 text-foreground shadow-sm">
                          <span class="font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">{{ $t('seatmap.row_short') }}</span>
                          <span class="text-xs font-semibold">{{ row.label }}</span>
                        </div>

                        <div class="overflow-x-auto pb-1">
                          <div
                            class="mx-auto grid w-fit min-w-max gap-2"
                            :style="getRowStyle(row)"
                          >
                            <button
                              v-for="seat in row.seats"
                              :key="seat.id"
                              type="button"
                              class="flex h-11 w-11 items-center justify-center rounded-[0.95rem] border text-[11px] font-bold tracking-[0.01em] transition-[transform,box-shadow,background-color,border-color,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                              :class="getSeatInteractionClass(seat)"
                              :style="getSeatStyle(getSeatColor(section.color, seat, layout.ticketTypeById), seat, activeSeat?.id === seat.id, isSeatSelected(seat.id))"
                              :aria-pressed="isSeatSelected(seat.id) || activeSeat?.id === seat.id"
                              :aria-disabled="seat.status !== 'available'"
                              :aria-label="`${section.name} row ${row.label} seat ${seat.seatLabelSnapshot} (${getStatusLabel(seat.status)})`"
                              :title="`${section.name} · ${$t('admin.event_session.row_label', { row: row.label, seat: seat.seatLabelSnapshot })}`"
                              @click="onSeatPress(seat, setActiveSeat)"
                            >
                              <span class="sr-only">
                                {{ section.name }} row {{ row.label }} seat {{ seat.seatLabelSnapshot }}
                              </span>
                              <span aria-hidden="true">{{ seat.seatLabelSnapshot }}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-[1.25rem] border border-border bg-secondary/35 p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Total
              </p>
              <p class="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {{ inventorySummary.total }}
              </p>
            </div>
            <div class="rounded-[1.25rem] border border-border bg-secondary/35 p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Available
              </p>
              <p class="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {{ inventorySummary.available }}
              </p>
            </div>
            <div class="rounded-[1.25rem] border border-border bg-secondary/35 p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Held
              </p>
              <p class="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {{ inventorySummary.locked }}
              </p>
            </div>
            <div class="rounded-[1.25rem] border border-border bg-secondary/35 p-4">
              <p class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Sold
              </p>
              <p class="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {{ inventorySummary.sold }}
              </p>
            </div>
          </div>

          <div class="rounded-[1.5rem] border border-border bg-background p-4">
            <template v-if="activeSeat">
              <span :class="['inline-flex rounded-full border px-3 py-1 text-xs font-medium', getStatusBadgeClass(activeSeat.status)]">
                {{ getStatusLabel(activeSeat.status) }}
              </span>
              <h3 class="mt-3 text-xl font-semibold tracking-tight text-foreground">
                {{ $t('seatmap.row_label', { row: activeSeat.rowLabelSnapshot || 'GA', seat: activeSeat.seatLabelSnapshot }) }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                {{ getStatusDescription(activeSeat.status) }}
              </p>
              <p class="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {{ formatSeatMapCurrency(activeSeat.priceCents, activeSeat.currency) }}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ activeSeatTicketType?.name || $t('seatmap.general_seating') }}
              </p>
              <Button
                v-if="actionLabel"
                class="mt-4 w-full"
                size="lg"
                @click="emit('purchase')"
              >
                {{ actionLabel }}
              </Button>
            </template>
          </div>
        </div>
      </template>
    </section>
  </TicketSeatMapLayoutProvider>
</template>
