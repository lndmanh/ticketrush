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
  }

  if (isSelected) {
    return {
      ...baseStyle,
      backgroundColor: 'hsl(var(--primary))',
      borderColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      boxShadow: '0 18px 34px -24px rgba(0,0,0,0.45)',
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
      boxShadow: isActive ? '0 0 0 1px rgba(255,255,255,0.4)' : 'none',
    }
  }

  if (seat.status === 'locked') {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(245, 158, 11, 0.16)',
      borderColor: 'rgba(245, 158, 11, 0.52)',
      color: 'rgb(120, 53, 15)',
      boxShadow: isActive ? '0 0 0 1px rgba(245, 158, 11, 0.38)' : 'none',
    }
  }

  if (seat.status === 'unavailable') {
    return {
      ...baseStyle,
      backgroundColor: 'rgba(100, 116, 139, 0.12)',
      borderColor: 'rgba(100, 116, 139, 0.3)',
      color: 'rgb(71, 85, 105)',
      boxShadow: isActive ? '0 0 0 1px rgba(100, 116, 139, 0.24)' : 'none',
    }
  }

  return {
    ...baseStyle,
    backgroundColor: `rgba(${rgb}, 0.94)`,
    borderColor: `rgba(${rgb}, 0.72)`,
    color: 'white',
    boxShadow: isActive ? `0 0 0 2px rgba(${rgb}, 0.18), 0 18px 34px -24px rgba(${rgb}, 0.54)` : 'none',
  }
}

function onSeatPress(seat: SeatMapSeat, setActiveSeat: (seatId: number) => void) {
  setActiveSeat(seat.id)

  if (!props.interactive || seat.status !== 'available') {
    return
  }

  emit('toggle', seat.id)
}

function getStatusLabel(status: SeatMapStatus) {
  if (status === 'available') {
    return 'Available now'
  }

  if (status === 'locked') {
    return 'Temporarily held'
  }

  if (status === 'sold') {
    return 'Already sold'
  }

  return 'Not currently offered'
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
    return props.interactive ? 'This seat can be added to the current checkout selection.' : 'This seat can still be secured once you enter live selection.'
  }

  if (status === 'locked') {
    return 'Another buyer is holding this seat during an active checkout window.'
  }

  if (status === 'sold') {
    return 'This position has already been converted into a completed order.'
  }

  return 'This location is currently not being released for public purchase.'
}

function getStatusRatio(count: number, total: number) {
  if (total === 0) {
    return '0%'
  }

  return `${(count / total) * 100}%`
}
</script>

<template>
  <TicketSeatMapLayoutProvider
    v-slot="{
      sections,
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
          Seat layout is not available yet.
        </p>
        <p class="mt-2 text-sm text-muted-foreground">
          Ticket releases and live availability will appear here once inventory is published.
        </p>
      </div>

      <template v-else>
        <div class="flex h-full min-h-0 flex-col rounded-[1.75rem] border border-border bg-secondary/45 p-4 md:p-5">
          <div
            class="rounded-[1.5rem] border px-4 py-5 text-center md:px-6"
            :style="stageStyle"
          >
            <p class="text-sm font-medium text-foreground">
              Stage / focal line
            </p>
            <p class="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Front-of-house preview
            </p>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
              <Check class="size-3.5" />
              Available
            </span>
            <span
              v-if="interactive"
              class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              <Ticket class="size-3.5" />
              Selected
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300">
              <LockKeyhole class="size-3.5" />
              Held
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-slate-950/10 bg-slate-950 px-3 py-1.5 text-xs text-white dark:border-white/10 dark:bg-white/10">
              <CircleSlash class="size-3.5" />
              Sold
            </span>
            <span class="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
              <Search class="size-3.5" />
              Click a seat to inspect it
            </span>
          </div>

          <ScrollArea class="mt-4 min-h-[32rem] flex-1 rounded-[1.5rem] border border-border bg-background/80">
            <div class="min-w-fit p-4 md:p-6">
              <div
                class="w-max min-w-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                :style="zoomStyle"
              >
                <div class="grid gap-4 xl:grid-cols-2">
                  <article
                    v-for="section in visibleSections"
                    :key="section.key"
                    class="rounded-[1.5rem] border p-4"
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
                            {{ section.metrics.total }} seats · {{ section.rows.length }} rows
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
                        class="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-3"
                      >
                        <div class="flex h-10 items-center justify-center rounded-xl border border-border bg-background/88 text-xs font-medium text-foreground">
                          {{ row.label }}
                        </div>

                        <div class="overflow-x-auto pb-1">
                          <div
                            class="grid min-w-max gap-1.5"
                            :style="getRowStyle(row)"
                          >
                            <button
                              v-for="seat in row.seats"
                              :key="seat.id"
                              type="button"
                              class="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border text-[10px] font-semibold transition-[transform,box-shadow,background-color,border-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                              :style="getSeatStyle(section.color, seat, activeSeat?.id === seat.id, isSeatSelected(seat.id))"
                              :aria-pressed="isSeatSelected(seat.id) || activeSeat?.id === seat.id"
                              :title="`${section.name} · Row ${row.label} · Seat ${seat.seatLabelSnapshot}`"
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
                Row {{ activeSeat.rowLabelSnapshot || 'GA' }} · Seat {{ activeSeat.seatLabelSnapshot }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-muted-foreground">
                {{ getStatusDescription(activeSeat.status) }}
              </p>
              <p class="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {{ formatSeatMapCurrency(activeSeat.priceCents, activeSeat.currency) }}
              </p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ activeSeatTicketType?.name || 'General seating release' }}
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
