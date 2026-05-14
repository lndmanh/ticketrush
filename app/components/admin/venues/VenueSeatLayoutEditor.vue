<script setup lang="ts">
import type { VenueRowDraftInput, VenueSeatDraftInput, VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import { SeatLayoutMode } from '#shared/commonEnums'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { createDefaultSectionGridPlacement, createManualDuplicateSeatRow, getMaxSeatYInSection, getSectionGridCells } from '@/lib/seatmapGrid'
import { Accessibility, ChevronDown, CopyPlus, Plus, Trash2 } from '@lucide/vue'

const { t } = useI18n()

const props = defineProps<{
  sections: VenueSectionDraftInput[]
}>()

const emit = defineEmits<{
  (e: 'update:sections', value: VenueSectionDraftInput[]): void
}>()

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

function normalizeAutomaticSectionCoordinates(section: VenueSectionDraftInput) {
  if (section.seatLayoutMode !== SeatLayoutMode.Automatic) {
    return section
  }

  return {
    ...section,
    rows: section.rows.map((row, rowIndex) => ({
      ...row,
      seats: row.seats.map((seat, seatIndex) => ({
        ...seat,
        x: seatIndex,
        y: rowIndex,
      })),
    })),
  }
}

function getNextUnusedSeatXForY(section: VenueSectionDraftInput, rowY: number) {
  const usedXValues = new Set<number>()

  for (const row of section.rows) {
    for (const seat of row.seats) {
      if (seat.y === rowY) {
        usedXValues.add(seat.x)
      }
    }
  }

  let nextX = 0

  while (usedXValues.has(nextX)) {
    nextX += 1
  }

  return nextX
}

function parseIntegerInput(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (!/^-?\d+$/.test(trimmed)) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function clampGridPlacement(placement: { gridX: number, gridY: number, gridW: number, gridH: number }) {
  const gridX = Math.max(0, Math.min(placement.gridX, 24))
  const gridY = Math.max(0, Math.min(placement.gridY, 99))
  const gridW = Math.max(1, Math.min(placement.gridW, 25 - gridX))
  const gridH = Math.max(1, Math.min(placement.gridH, 100 - gridY))

  return { gridX, gridY, gridW, gridH }
}

function isManualSeatCoordinateTaken(section: VenueSectionDraftInput, rowIndex: number, seatIndex: number, x: number, y: number) {
  return section.rows.some((row, currentRowIndex) => row.seats.some((seat, currentSeatIndex) => {
    if (currentRowIndex === rowIndex && currentSeatIndex === seatIndex) {
      return false
    }

    return seat.x === x && seat.y === y
  }))
}

function createSection(index: number, gridPlacement = createDefaultSectionGridPlacement(index)): VenueSectionDraftInput {
  const placement = clampGridPlacement(gridPlacement)

  return {
    code: `SEC-${index + 1}`,
    name: `Section ${index + 1}`,
    color: '#111111',
    sortOrder: index,
    gridX: placement.gridX,
    gridY: placement.gridY,
    gridW: placement.gridW,
    gridH: placement.gridH,
    seatLayoutMode: SeatLayoutMode.Automatic,
    rows: [createRow(0)],
  }
}

function getSectionGridPlacement(section: VenueSectionDraftInput) {
  return {
    gridX: section.gridX,
    gridY: section.gridY,
    gridW: section.gridW,
    gridH: section.gridH,
  }
}

function hasGridCellOverlap(placement: { gridX: number, gridY: number, gridW: number, gridH: number }, sections: VenueSectionDraftInput[]) {
  const nextCells = new Set(getSectionGridCells(placement).map(cell => `${cell.x}:${cell.y}`))

  return sections.some((section) => {
    const sectionPlacement = getSectionGridPlacement(section)

    return getSectionGridCells(sectionPlacement).some(cell => nextCells.has(`${cell.x}:${cell.y}`))
  })
}

function findFirstNonOverlappingDefaultSectionGridPlacement(startIndex: number) {
  let candidateIndex = startIndex

  while (candidateIndex < startIndex + 1000) {
    const placement = createDefaultSectionGridPlacement(candidateIndex)

    if (placement.gridY + placement.gridH > 100) {
      return null
    }

    if (!hasGridCellOverlap(placement, props.sections)) {
      return placement
    }

    candidateIndex += 1
  }

  return null
}

function createUniqueSectionCode(code: string) {
  const existingCodes = new Set(props.sections.map(section => section.code.trim().toLowerCase()))
  const baseCode = code.trim() || `SEC-${props.sections.length + 1}`
  let nextCode = `${baseCode}-COPY`
  let copyIndex = 2

  while (existingCodes.has(nextCode.toLowerCase())) {
    nextCode = `${baseCode}-COPY-${copyIndex}`
    copyIndex += 1
  }

  return nextCode
}

function createSectionCopy(section: VenueSectionDraftInput, placement = findFirstNonOverlappingDefaultSectionGridPlacement(props.sections.length)): VenueSectionDraftInput | null {
  if (!placement) {
    return null
  }

  return {
    ...createSection(props.sections.length, placement),
    gridX: placement.gridX,
    gridY: placement.gridY,
    gridW: placement.gridW,
    gridH: placement.gridH,
    seatLayoutMode: section.seatLayoutMode,
    code: createUniqueSectionCode(section.code),
    name: `${section.name} ${t('admin.venues.copy')}`,
    color: section.color,
    rows: section.rows.map((row, rowIndex) => ({
      label: row.label,
      sortOrder: rowIndex,
      seats: row.seats.map((seat, seatIndex) => ({
        label: seat.label,
        seatNumber: seat.seatNumber,
        x: seat.x,
        y: seat.y,
        sortOrder: seatIndex,
        accessibilityLabel: seat.accessibilityLabel ?? '',
        isAccessible: seat.isAccessible,
      })),
    })),
  }
}

function updateSections(nextSections: VenueSectionDraftInput[]) {
  emit('update:sections', nextSections.map((section, sectionIndex) => ({
    ...section,
    gridX: Math.max(0, Math.min(section.gridX, 24)),
    gridY: Math.max(0, Math.min(section.gridY, 99)),
    gridW: Math.max(1, Math.min(section.gridW, 25 - Math.max(0, Math.min(section.gridX, 24)))),
    gridH: Math.max(1, Math.min(section.gridH, 100 - Math.max(0, Math.min(section.gridY, 99)))),
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

function updateSection(sectionIndex: number, key: keyof VenueSectionDraftInput, value: string | number | boolean | VenueRowDraftInput[] | SeatLayoutMode) {
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

function updateGridField(sectionIndex: number, key: 'gridX' | 'gridY' | 'gridW' | 'gridH', value: string | number | null | undefined) {
  const parsed = parseIntegerInput(value)
  if (parsed === null) {
    return
  }

  const section = props.sections[sectionIndex]
  if (!section) {
    return
  }

  const next = { ...section }

  if (key === 'gridX') {
    next.gridX = Math.max(0, Math.min(parsed, 24))
    next.gridW = Math.min(next.gridW, 25 - next.gridX)
  }
  else if (key === 'gridY') {
    next.gridY = Math.max(0, Math.min(parsed, 99))
    next.gridH = Math.min(next.gridH, 100 - next.gridY)
  }
  else if (key === 'gridW') {
    next.gridW = Math.max(1, Math.min(parsed, 25 - next.gridX))
  }
  else {
    next.gridH = Math.max(1, Math.min(parsed, 100 - next.gridY))
  }

  updateSections(props.sections.map((currentSection, currentIndex) => {
    if (currentIndex !== sectionIndex) {
      return currentSection
    }

    return next
  }))
}

function updateSeatLayoutMode(sectionIndex: number, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  const value = target.value === SeatLayoutMode.Manual ? SeatLayoutMode.Manual : SeatLayoutMode.Automatic
  const section = props.sections[sectionIndex]
  if (!section) {
    return
  }

  if (value === SeatLayoutMode.Automatic) {
    updateSections(props.sections.map((currentSection, currentIndex) => {
      if (currentIndex !== sectionIndex) {
        return currentSection
      }

      return {
        ...currentSection,
        seatLayoutMode: value,
        rows: currentSection.rows.map((row, rowIndex) => ({
          ...row,
          seats: row.seats.map((seat, seatIndex) => ({
            ...seat,
            x: seatIndex,
            y: rowIndex,
          })),
        })),
      }
    }))
    return
  }

  updateSection(sectionIndex, 'seatLayoutMode', value)
}

function addSection() {
  const placement = findFirstNonOverlappingDefaultSectionGridPlacement(props.sections.length)

  if (!placement) {
    return
  }

  updateSections([...props.sections, createSection(props.sections.length, placement)])
}

function duplicateSection(sectionIndex: number) {
  const section = props.sections[sectionIndex]
  if (!section) {
    return
  }

  const placement = findFirstNonOverlappingDefaultSectionGridPlacement(props.sections.length)
  if (!placement) {
    return
  }

  const duplicatedSection = createSectionCopy(section, placement)
  if (!duplicatedSection) {
    return
  }

  updateSections([
    ...props.sections.slice(0, sectionIndex + 1),
    duplicatedSection,
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

  const nextRow = createRow(section.rows.length, section.rows[0]?.seats.length || 8)

  if (section.seatLayoutMode === SeatLayoutMode.Manual) {
    const y = getNextUnusedSeatY(section)

    updateSection(sectionIndex, 'rows', [...section.rows, {
      ...nextRow,
      seats: nextRow.seats.map((seat, seatIndex) => ({
        ...seat,
        y,
        x: getNextUnusedSeatXForY(section, y) + seatIndex,
      })),
    }])
    return
  }

  updateSection(sectionIndex, 'rows', normalizeAutomaticSectionCoordinates({
    ...section,
    rows: [...section.rows, nextRow],
  }).rows)
}

function duplicateRow(sectionIndex: number, rowIndex: number) {
  const section = props.sections[sectionIndex]
  const row = section?.rows[rowIndex]
  if (!section || !row) {
    return
  }

  const nextRows = [...section.rows]
  const nextY = section.seatLayoutMode === SeatLayoutMode.Manual ? getMaxSeatYInSection(section.rows) + 1 : row.sortOrder
  nextRows.splice(rowIndex + 1, 0, {
    ...(
      section.seatLayoutMode === SeatLayoutMode.Manual
        ? createManualDuplicateSeatRow(row, nextY)
        : {
            label: `${row.label}*`,
            sortOrder: row.sortOrder,
            seats: row.seats.map((seat, seatIndex) => ({
              label: seat.label,
              seatNumber: seat.seatNumber,
              x: seatIndex,
              y: rowIndex + 1,
              sortOrder: seatIndex,
              accessibilityLabel: seat.accessibilityLabel ?? '',
              isAccessible: seat.isAccessible,
            })),
          }
    ),
  })

  updateSection(sectionIndex, 'rows', section.seatLayoutMode === SeatLayoutMode.Automatic
    ? normalizeAutomaticSectionCoordinates({ ...section, rows: nextRows }).rows
    : nextRows)
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

  const nextRows = section.rows.filter((_, currentIndex) => currentIndex !== rowIndex)

  updateSection(sectionIndex, 'rows', section.seatLayoutMode === SeatLayoutMode.Automatic
    ? normalizeAutomaticSectionCoordinates({ ...section, rows: nextRows }).rows
    : nextRows)
}

function addSeat(sectionIndex: number, rowIndex: number) {
  const section = props.sections[sectionIndex]
  const row = section?.rows[rowIndex]
  if (!row) {
    return
  }

  if (!section) {
    return
  }

  const rowY = section.seatLayoutMode === SeatLayoutMode.Manual
    ? (row.seats[0]?.y ?? getNextUnusedSeatY(section))
    : rowIndex

  const nextSeat = createSeat(row.seats.length)

  const nextRows = section.rows.map((currentRow, currentIndex) => {
    if (currentIndex !== rowIndex) {
      return currentRow
    }

    return {
      ...currentRow,
      seats: [
        ...currentRow.seats,
        {
          ...nextSeat,
          x: section.seatLayoutMode === SeatLayoutMode.Manual ? getNextUnusedSeatXForY(section, rowY) : nextSeat.x,
          y: section.seatLayoutMode === SeatLayoutMode.Manual ? rowY : rowIndex,
        },
      ],
    }
  })

  updateSection(sectionIndex, 'rows', section.seatLayoutMode === SeatLayoutMode.Automatic
    ? normalizeAutomaticSectionCoordinates({ ...section, rows: nextRows }).rows
    : nextRows)
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

function updateSeatNumber(sectionIndex: number, rowIndex: number, seatIndex: number, value: string | number | null | undefined) {
  const parsed = parseIntegerInput(value)
  if (parsed === null || parsed < 1) {
    return
  }

  updateSeat(sectionIndex, rowIndex, seatIndex, 'seatNumber', parsed)
}

function updateManualSeatCoordinate(sectionIndex: number, rowIndex: number, seatIndex: number, key: 'x' | 'y', value: string | number | null | undefined) {
  const parsed = parseIntegerInput(value)
  if (parsed === null || parsed < 0) {
    return
  }

  const section = props.sections[sectionIndex]
  const row = section?.rows[rowIndex]
  const seat = row?.seats[seatIndex]
  if (!section || !row || !seat) {
    return
  }

  const nextX = key === 'x' ? parsed : seat.x
  const nextY = key === 'y' ? parsed : seat.y

  if (isManualSeatCoordinateTaken(section, rowIndex, seatIndex, nextX, nextY)) {
    return
  }

  updateSeat(sectionIndex, rowIndex, seatIndex, key, parsed)
}

function isManualSeatCoordinateTakenForSeat(section: VenueSectionDraftInput, rowIndex: number, seatIndex: number) {
  const seat = section.rows[rowIndex]?.seats[seatIndex]
  if (!seat) {
    return false
  }

  return isManualSeatCoordinateTaken(section, rowIndex, seatIndex, seat.x, seat.y)
}

function removeSeat(sectionIndex: number, rowIndex: number, seatIndex: number) {
  const row = props.sections[sectionIndex]?.rows[rowIndex]
  if (!row || row.seats.length <= 1) {
    return
  }

  const nextSeats = row.seats.filter((_, currentIndex) => currentIndex !== seatIndex)
  const nextRows = props.sections[sectionIndex].rows.map((currentRow, currentRowIndex) => {
    if (currentRowIndex !== rowIndex) {
      return currentRow
    }

    return {
      ...currentRow,
      seats: nextSeats,
    }
  })

  const nextSection = props.sections[sectionIndex]
  if (!nextSection) {
    return
  }

  updateSection(sectionIndex, 'rows', nextSection.seatLayoutMode === SeatLayoutMode.Automatic
    ? normalizeAutomaticSectionCoordinates({ ...nextSection, rows: nextRows }).rows
    : nextRows)
}

function isAutomaticSeatLayout(section: VenueSectionDraftInput) {
  return section.seatLayoutMode === SeatLayoutMode.Automatic
}

function getSectionFieldId(sectionIndex: number, field: string) {
  return `section-${sectionIndex}-${field}`
}

function getSeatFieldId(sectionIndex: number, rowIndex: number, seatIndex: number, field: string) {
  return `section-${sectionIndex}-row-${rowIndex}-seat-${seatIndex}-${field}`
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-base font-medium tracking-[-0.03em] text-foreground">
          {{ $t('admin.venues.seat_layout_editor') }}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        @click="addSection"
      >
        {{ $t('admin.venues.add_section') }}
      </Button>
    </div>

    <Accordion
      type="multiple"
      class="space-y-4"
    >
      <AccordionItem
        v-for="(section, sectionIndex) in sections"
        :key="sectionIndex"
        :value="`section-${sectionIndex}`"
        class="dashboard-list-item space-y-4"
      >
        <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div class="grid flex-1 gap-3 md:grid-cols-2">
            <div class="space-y-2">
              <label
                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                :for="getSectionFieldId(sectionIndex, 'code')"
              >{{ $t('admin.columns.code') }}</label>
              <Input
                :id="getSectionFieldId(sectionIndex, 'code')"
                :model-value="section.code"
                @update:model-value="updateSection(sectionIndex, 'code', $event)"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                :for="getSectionFieldId(sectionIndex, 'name')"
              >{{ $t('admin.columns.name') }}</label>
              <Input
                :id="getSectionFieldId(sectionIndex, 'name')"
                :model-value="section.name"
                @update:model-value="updateSection(sectionIndex, 'name', $event)"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :title="$t('admin.venues.duplicate_section')"
              :aria-label="$t('admin.venues.duplicate_section')"
              @click="duplicateSection(sectionIndex)"
            >
              <CopyPlus class="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :title="$t('admin.venues.remove_section')"
              :aria-label="$t('admin.venues.remove_section')"
              @click="removeSection(sectionIndex)"
            >
              <Trash2 class="size-4" />
            </Button>
            <AccordionTrigger :aria-label="$t('admin.venues.toggle_row_seats')">
              <span class="sr-only">{{ $t('admin.venues.toggle_row_seats') }}</span>
            </AccordionTrigger>
          </div>
        </div>

        <AccordionContent class="space-y-3 pb-0">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div class="space-y-2">
              <label
                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                :for="getSectionFieldId(sectionIndex, 'grid-x')"
              >Grid X</label>
              <Input
                :id="getSectionFieldId(sectionIndex, 'grid-x')"
                :model-value="String(section.gridX)"
                type="number"
                min="0"
                :max="24"
                @update:model-value="updateGridField(sectionIndex, 'gridX', $event)"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                :for="getSectionFieldId(sectionIndex, 'grid-y')"
              >Grid Y</label>
              <Input
                :id="getSectionFieldId(sectionIndex, 'grid-y')"
                :model-value="String(section.gridY)"
                type="number"
                min="0"
                @update:model-value="updateGridField(sectionIndex, 'gridY', $event)"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                :for="getSectionFieldId(sectionIndex, 'grid-w')"
              >Grid W</label>
              <Input
                :id="getSectionFieldId(sectionIndex, 'grid-w')"
                :model-value="String(section.gridW)"
                type="number"
                min="1"
                :max="25"
                @update:model-value="updateGridField(sectionIndex, 'gridW', $event)"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                :for="getSectionFieldId(sectionIndex, 'grid-h')"
              >Grid H</label>
              <Input
                :id="getSectionFieldId(sectionIndex, 'grid-h')"
                :model-value="String(section.gridH)"
                type="number"
                min="1"
                @update:model-value="updateGridField(sectionIndex, 'gridH', $event)"
              />
            </div>
            <div class="space-y-2">
              <label
                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                :for="`section-${sectionIndex}-layout-mode`"
              >Seat layout mode</label>
              <select
                :id="`section-${sectionIndex}-layout-mode`"
                :value="section.seatLayoutMode"
                class="h-10 w-full rounded-[0.9rem] border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                @change="updateSeatLayoutMode(sectionIndex, $event)"
              >
                <option :value="SeatLayoutMode.Automatic">
                  Automatic
                </option>
                <option :value="SeatLayoutMode.Manual">
                  Manual
                </option>
              </select>
            </div>
          </div>

          <Collapsible
            v-for="(row, rowIndex) in section.rows"
            :key="`${section.code}-${row.label}-${rowIndex}`"
            v-slot="{ open }"
            class="rounded-[1.2rem] border border-border bg-secondary p-4"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:max-w-64">
                <label
                  class="shrink-0 text-xs uppercase tracking-[0.18em] text-muted-foreground"
                  :for="getSectionFieldId(sectionIndex, `row-${rowIndex}-label`)"
                >{{ $t('admin.venues.row_label') }}</label>
                <Input
                  :id="getSectionFieldId(sectionIndex, `row-${rowIndex}-label`)"
                  :model-value="row.label"
                  class="sm:flex-1"
                  @update:model-value="updateRow(sectionIndex, rowIndex, 'label', $event)"
                />
              </div>

              <div class="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  @click="addSeat(sectionIndex, rowIndex)"
                >
                  <Plus class="size-4" />
                  {{ $t('admin.venues.add_seat') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :aria-label="$t('admin.venues.duplicate_row')"
                  @click="duplicateRow(sectionIndex, rowIndex)"
                >
                  <CopyPlus class="size-4" />
                  {{ $t('admin.venues.duplicate_row') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :aria-label="$t('admin.venues.remove_row')"
                  @click="removeRow(sectionIndex, rowIndex)"
                >
                  <Trash2 class="size-4" />
                  {{ $t('admin.venues.remove_row') }}
                </Button>
                <CollapsibleTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    :title="$t('admin.venues.toggle_row_seats')"
                    :aria-label="$t('admin.venues.toggle_row_seats')"
                  >
                    <span class="sr-only">{{ $t('admin.venues.toggle_row_seats') }}</span>
                    <ChevronDown
                      class="size-4 transition-transform duration-200"
                      :class="open ? 'rotate-180' : ''"
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            <CollapsibleContent>
              <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div
                  v-for="(seat, seatIndex) in row.seats"
                  :key="`${section.code}-${row.label}-${seat.label}-${seatIndex}`"
                  class="rounded-[1rem] border border-border bg-background p-3"
                >
                  <div class="grid gap-3">
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div class="space-y-2">
                        <label
                          class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                          :for="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'label')"
                        >{{ $t('admin.venues.seat_label') }}</label>
                        <Input
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'label')"
                          :model-value="seat.label"
                          @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'label', $event)"
                        />
                      </div>
                      <div class="space-y-2">
                        <label
                          class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                          :for="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'number')"
                        >{{ $t('admin.venues.seat_no') }}</label>
                        <Input
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'number')"
                          :model-value="String(seat.seatNumber)"
                          type="number"
                          min="1"
                          @update:model-value="updateSeatNumber(sectionIndex, rowIndex, seatIndex, $event)"
                        />
                      </div>
                    </div>

                    <div
                      class="grid gap-3 sm:grid-cols-2"
                      :class="isAutomaticSeatLayout(section) ? 'opacity-60' : ''"
                    >
                      <div class="space-y-2">
                        <label
                          class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                          :for="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'x')"
                        >X</label>
                        <Input
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'x')"
                          :model-value="String(seat.x)"
                          type="number"
                          min="0"
                          :disabled="isAutomaticSeatLayout(section)"
                          @update:model-value="updateManualSeatCoordinate(sectionIndex, rowIndex, seatIndex, 'x', $event)"
                        />
                      </div>
                      <div class="space-y-2">
                        <label
                          class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                          :for="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'y')"
                        >Y</label>
                        <Input
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'y')"
                          :model-value="String(seat.y)"
                          type="number"
                          min="0"
                          :disabled="isAutomaticSeatLayout(section)"
                          @update:model-value="updateManualSeatCoordinate(sectionIndex, rowIndex, seatIndex, 'y', $event)"
                        />
                      </div>
                    </div>
                    <p
                      v-if="!isAutomaticSeatLayout(section) && isManualSeatCoordinateTakenForSeat(section, rowIndex, seatIndex)"
                      class="text-xs text-destructive"
                    >
                      Seat coordinates must be unique within a section.
                    </p>
                    <p
                      v-if="isAutomaticSeatLayout(section)"
                      class="text-xs text-muted-foreground"
                    >
                      Seat coordinates are generated automatically in this mode.
                    </p>

                    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div class="space-y-2">
                        <label
                          class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                          :for="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'accessibility-label')"
                        >{{ $t('admin.venues.accessibility_label') }}</label>
                        <Input
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'accessibility-label')"
                          :model-value="seat.accessibilityLabel || ''"
                          @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'accessibilityLabel', $event)"
                        />
                      </div>

                      <label
                        class="flex min-h-10 items-center justify-between rounded-[0.9rem] border border-border bg-secondary px-3 py-2 sm:min-w-24"
                        :for="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'accessible')"
                        :title="$t('admin.venues.accessible_seat')"
                      >
                        <Accessibility class="size-4 text-muted-foreground" />
                        <Switch
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'accessible')"
                          :model-value="seat.isAccessible"
                          :aria-label="$t('admin.venues.accessible_seat')"
                          @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'isAccessible', $event)"
                        />
                      </label>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      @click="removeSeat(sectionIndex, rowIndex, seatIndex)"
                    >
                      {{ $t('admin.venues.remove_seat') }}
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="addRow(sectionIndex)"
          >
            {{ $t('admin.venues.add_row') }}
          </Button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
</template>
