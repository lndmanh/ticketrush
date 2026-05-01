<script setup lang="ts">
import { computed } from 'vue'
import type { VenueRowDraftInput, VenueSeatDraftInput, VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { CopyPlus, Trash2 } from '@lucide/vue'

const props = defineProps<{
  sections: VenueSectionDraftInput[]
}>()

const emit = defineEmits<{
  (e: 'update:sections', value: VenueSectionDraftInput[]): void
}>()

const layoutTicketTypes = computed(() => props.sections.map((section, sectionIndex) => ({
  venueSectionId: sectionIndex + 1,
  name: section.name,
  description: `${section.rows.length} row${section.rows.length === 1 ? '' : 's'} configured for ${section.name}`,
  priceCents: 0,
  currency: 'VND',
  capacity: section.rows.reduce((count, row) => count + row.seats.length, 0),
  color: section.color,
})))

const layoutSeats = computed(() => props.sections.flatMap((section, sectionIndex) => section.rows.flatMap((row, rowIndex) => row.seats.map((seat, seatIndex) => ({
  id: ((sectionIndex + 1) * 100000) + ((rowIndex + 1) * 1000) + seatIndex,
  venueSectionId: sectionIndex + 1,
  ticketTypeId: null,
  sectionNameSnapshot: section.name,
  rowLabelSnapshot: row.label,
  seatLabelSnapshot: seat.label,
  displayX: seat.x,
  displayY: seat.y,
  priceCents: 0,
  currency: 'VND',
  status: 'available',
})))))

function nextRowLabel(index: number) {
  return String.fromCharCode(65 + index)
}

function createSeat(index: number): VenueSeatDraftInput {
  const seatNumber = index + 1

  return {
    label: String(seatNumber),
    seatNumber,
    x: index,
    y: 0,
    sortOrder: index,
    accessibilityLabel: '',
    isAccessible: false,
  }
}

function createRow(index: number, seatCount = 8): VenueRowDraftInput {
  return {
    label: nextRowLabel(index),
    sortOrder: index,
    seats: Array.from({ length: seatCount }, (_, seatIndex) => ({
      ...createSeat(seatIndex),
      y: index,
    })),
  }
}

function createSection(index: number): VenueSectionDraftInput {
  return {
    code: `SEC-${index + 1}`,
    name: `Section ${index + 1}`,
    color: '#111111',
    sortOrder: index,
    rows: [createRow(0)],
  }
}

function updateSections(nextSections: VenueSectionDraftInput[]) {
  emit('update:sections', nextSections.map((section, sectionIndex) => ({
    ...section,
    sortOrder: sectionIndex,
    rows: section.rows.map((row, rowIndex) => ({
      ...row,
      sortOrder: rowIndex,
      seats: row.seats.map((seat, seatIndex) => ({
        ...seat,
        seatNumber: seat.seatNumber,
        sortOrder: seatIndex,
      })),
    })),
  })))
}

function updateSection(sectionIndex: number, key: keyof VenueSectionDraftInput, value: string | number | VenueRowDraftInput[]) {
  updateSections(props.sections.map((section, currentIndex) => {
    if (currentIndex !== sectionIndex) {
      return section
    }

    return {
      ...section,
      [key]: value,
    }
  }))
}

function addSection() {
  updateSections([...props.sections, createSection(props.sections.length)])
}

function duplicateSection(sectionIndex: number) {
  const section = props.sections[sectionIndex]
  if (!section) {
    return
  }

  updateSections([
    ...props.sections.slice(0, sectionIndex + 1),
    {
      ...section,
      code: `${section.code}-COPY`,
      name: `${section.name} Copy`,
      rows: section.rows.map((row, rowIndex) => ({
        ...row,
        label: row.label,
        sortOrder: rowIndex,
        seats: row.seats.map((seat, seatIndex) => ({
          ...seat,
          sortOrder: seatIndex,
        })),
      })),
    },
    ...props.sections.slice(sectionIndex + 1),
  ])
}

function removeSection(sectionIndex: number) {
  if (props.sections.length <= 1) {
    return
  }

  updateSections(props.sections.filter((_, currentIndex) => currentIndex !== sectionIndex))
}

function addRow(sectionIndex: number) {
  const section = props.sections[sectionIndex]
  if (!section) {
    return
  }

  updateSection(sectionIndex, 'rows', [...section.rows, createRow(section.rows.length, section.rows[0]?.seats.length || 8)])
}

function duplicateRow(sectionIndex: number, rowIndex: number) {
  const section = props.sections[sectionIndex]
  const row = section?.rows[rowIndex]
  if (!section || !row) {
    return
  }

  const nextRows = [...section.rows]
  nextRows.splice(rowIndex + 1, 0, {
    ...row,
    label: `${row.label}*`,
    seats: row.seats.map((seat, seatIndex) => ({
      ...seat,
      sortOrder: seatIndex,
    })),
  })

  updateSection(sectionIndex, 'rows', nextRows)
}

function updateRow(sectionIndex: number, rowIndex: number, key: keyof VenueRowDraftInput, value: string | number | VenueSeatDraftInput[]) {
  const section = props.sections[sectionIndex]
  if (!section) {
    return
  }

  updateSection(sectionIndex, 'rows', section.rows.map((row, currentIndex) => {
    if (currentIndex !== rowIndex) {
      return row
    }

    return {
      ...row,
      [key]: value,
    }
  }))
}

function removeRow(sectionIndex: number, rowIndex: number) {
  const section = props.sections[sectionIndex]
  if (!section || section.rows.length <= 1) {
    return
  }

  updateSection(sectionIndex, 'rows', section.rows.filter((_, currentIndex) => currentIndex !== rowIndex))
}

function addSeat(sectionIndex: number, rowIndex: number) {
  const row = props.sections[sectionIndex]?.rows[rowIndex]
  if (!row) {
    return
  }

  updateRow(sectionIndex, rowIndex, 'seats', [
    ...row.seats,
    {
      ...createSeat(row.seats.length),
      y: rowIndex,
    },
  ])
}

function updateSeat(sectionIndex: number, rowIndex: number, seatIndex: number, key: keyof VenueSeatDraftInput, value: string | number | boolean) {
  const row = props.sections[sectionIndex]?.rows[rowIndex]
  if (!row) {
    return
  }

  updateRow(sectionIndex, rowIndex, 'seats', row.seats.map((seat, currentIndex) => {
    if (currentIndex !== seatIndex) {
      return seat
    }

    return {
      ...seat,
      [key]: value,
    }
  }))
}

function removeSeat(sectionIndex: number, rowIndex: number, seatIndex: number) {
  const row = props.sections[sectionIndex]?.rows[rowIndex]
  if (!row || row.seats.length <= 1) {
    return
  }

  updateRow(sectionIndex, rowIndex, 'seats', row.seats.filter((_, currentIndex) => currentIndex !== seatIndex))
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-base font-medium tracking-[-0.03em] text-foreground">
          Seat layout editor
        </p>
        <p class="mt-1 text-sm leading-6 text-muted-foreground">
          Edit sections, rows, seat coordinates, and accessibility markers directly.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        @click="addSection"
      >
        Add section
      </Button>
    </div>

    <TicketSeatMapLayoutProvider
      v-slot="{ sections: previewSections, inventorySummary, visibleSections, stageStyle, zoomStyle, getRowStyle, getTintStyle }"
      :seats="layoutSeats"
      :ticket-types="layoutTicketTypes"
    >
      <div class="rounded-[1.75rem] border border-border bg-secondary/35 p-4">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="text-sm font-medium text-foreground">
              Shared seat map preview
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              This preview uses the same normalized layout provider as the public and admin event maps.
            </p>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-2xl border border-border bg-background px-3 py-2">
              <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Sections
              </p>
              <p class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {{ previewSections.length }}
              </p>
            </div>
            <div class="rounded-2xl border border-border bg-background px-3 py-2">
              <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Seats
              </p>
              <p class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {{ inventorySummary.total }}
              </p>
            </div>
            <div class="rounded-2xl border border-border bg-background px-3 py-2">
              <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Rows
              </p>
              <p class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {{ previewSections.reduce((count, section) => count + section.rows.length, 0) }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="mt-4 rounded-[1.5rem] border px-4 py-5 text-center"
          :style="stageStyle"
        >
          <p class="text-sm font-medium text-foreground">
            Stage / focal line
          </p>
          <p class="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Venue blueprint preview
          </p>
        </div>

        <div
          class="mt-4 overflow-x-auto rounded-[1.5rem] border border-border bg-background/80 p-4"
          :style="zoomStyle"
        >
          <div class="grid min-w-max gap-4 xl:grid-cols-2">
            <article
              v-for="section in visibleSections"
              :key="section.key"
              class="rounded-[1.5rem] border p-4"
              :style="getTintStyle(section.color, 0.18, 0.14)"
            >
              <div class="mb-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span
                    class="size-2.5 rounded-full"
                    :style="{ backgroundColor: section.color }"
                  />
                  <p class="text-sm font-medium text-foreground">
                    {{ section.name }}
                  </p>
                </div>
                <p class="text-xs tabular-nums text-muted-foreground">
                  {{ section.metrics.total }} seats
                </p>
              </div>

              <div class="space-y-3">
                <div
                  v-for="row in section.rows"
                  :key="`${section.code}-${row.label}`"
                  class="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-3"
                >
                  <div class="flex h-10 items-center justify-center rounded-xl border border-border bg-background/88 text-xs font-medium text-foreground">
                    {{ row.label }}
                  </div>
                  <div class="grid min-w-max gap-1.5" :style="getRowStyle(row)">
                    <div
                      v-for="seat in row.seats"
                      :key="seat.id"
                      class="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border text-[10px] font-semibold text-white"
                      :style="{ gridColumn: `${(seat.displayX ?? 0) + 1}`, backgroundColor: section.color, borderColor: section.color }"
                    >
                      {{ seat.seatLabelSnapshot }}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </TicketSeatMapLayoutProvider>

    <div class="space-y-4">
      <div
        v-for="(section, sectionIndex) in sections"
        :key="`${section.code}-${sectionIndex}`"
        class="dashboard-list-item space-y-4"
      >
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="grid flex-1 gap-3 md:grid-cols-3">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Code</label>
              <Input
                :model-value="section.code"
                @update:model-value="updateSection(sectionIndex, 'code', $event)"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Name</label>
              <Input
                :model-value="section.name"
                @update:model-value="updateSection(sectionIndex, 'name', $event)"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Color</label>
              <Input
                :model-value="section.color"
                @update:model-value="updateSection(sectionIndex, 'color', $event)"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Duplicate section"
              @click="duplicateSection(sectionIndex)"
            >
              <CopyPlus class="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Remove section"
              @click="removeSection(sectionIndex)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="(row, rowIndex) in section.rows"
            :key="`${section.code}-${row.label}-${rowIndex}`"
            class="rounded-[1.2rem] border border-border bg-secondary p-4"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="grid flex-1 gap-3 md:grid-cols-[minmax(0,12rem)_auto]">
                <div class="space-y-2">
                  <label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Row label</label>
                  <Input
                    :model-value="row.label"
                    @update:model-value="updateRow(sectionIndex, rowIndex, 'label', $event)"
                  />
                </div>
                <div class="flex flex-wrap items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    @click="addSeat(sectionIndex, rowIndex)"
                  >
                    Add seat
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="duplicateRow(sectionIndex, rowIndex)"
                  >
                    Duplicate row
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="removeRow(sectionIndex, rowIndex)"
                  >
                    Remove row
                  </Button>
                </div>
              </div>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="(seat, seatIndex) in row.seats"
                :key="`${section.code}-${row.label}-${seat.label}-${seatIndex}`"
                class="rounded-[1rem] border border-border bg-background p-3"
              >
                <div class="grid gap-3">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-2">
                      <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Label</label>
                      <Input
                        :model-value="seat.label"
                        @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'label', $event)"
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Seat no.</label>
                      <Input
                        :model-value="String(seat.seatNumber)"
                        type="number"
                        min="1"
                        @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'seatNumber', Number($event))"
                      />
                    </div>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-2">
                      <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">X</label>
                      <Input
                        :model-value="String(seat.x)"
                        type="number"
                        min="0"
                        @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'x', Number($event))"
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Y</label>
                      <Input
                        :model-value="String(seat.y)"
                        type="number"
                        min="0"
                        @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'y', Number($event))"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Accessibility label</label>
                    <Input
                      :model-value="seat.accessibilityLabel || ''"
                      @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'accessibilityLabel', $event)"
                    />
                  </div>

                  <div class="flex items-center justify-between gap-3 rounded-[0.9rem] border border-border bg-secondary px-3 py-2">
                    <span class="text-sm text-foreground">Accessible seat</span>
                    <Switch
                      :model-value="seat.isAccessible"
                      @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'isAccessible', $event)"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click="removeSeat(sectionIndex, rowIndex, seatIndex)"
                  >
                    Remove seat
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="addRow(sectionIndex)"
          >
            Add row
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
