<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { VenueRowDraftInput, VenueSeatDraftInput, VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import { SeatLayoutMode } from '#shared/commonEnums'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { createDefaultSectionGridPlacement, createManualDuplicateSeatRow, getMaxSeatYInSection, getSectionGridCells } from '@/lib/seatmapGrid'
import { Accessibility, Check, ChevronDown, CopyPlus, Palette, Plus, Settings2, Trash2 } from '@lucide/vue'

const { t } = useI18n()

const props = defineProps<{
  sections: VenueSectionDraftInput[]
}>()

const sectionColorDrafts = ref<Record<string, string>>({})

const emit = defineEmits<{
  (e: 'update:sections', value: VenueSectionDraftInput[]): void
}>()

const commonSectionColors = [
  { nameKey: 'admin.venues.color_slate', value: '#334155' },
  { nameKey: 'admin.venues.color_rose', value: '#E11D48' },
  { nameKey: 'admin.venues.color_orange', value: '#F97316' },
  { nameKey: 'admin.venues.color_amber', value: '#D97706' },
  { nameKey: 'admin.venues.color_emerald', value: '#059669' },
  { nameKey: 'admin.venues.color_teal', value: '#0F766E' },
  { nameKey: 'admin.venues.color_blue', value: '#2563EB' },
  { nameKey: 'admin.venues.color_indigo', value: '#4338CA' },
  { nameKey: 'admin.venues.color_violet', value: '#7C3AED' },
  { nameKey: 'admin.venues.color_fuchsia', value: '#C026D3' },
]

function normalizeHexColor(value: string) {
  const trimmed = value.trim()

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map(character => `${character}${character}`).join('')}`.toUpperCase()
  }

  return null
}

function getSafeSectionColor(color: string) {
  return normalizeHexColor(color) ?? '#334155'
}

function getSectionColorPreviewStyle(color: string) {
  const safeColor = getSafeSectionColor(color)

  return {
    background: `radial-gradient(circle at 18% 18%, rgba(255,255,255,0.42), transparent 32%), linear-gradient(135deg, ${safeColor} 0%, ${safeColor}CC 46%, ${safeColor}88 100%)`,
  }
}

function getSectionColorButtonClass(sectionColor: string, color: string) {
  return getSafeSectionColor(sectionColor) === getSafeSectionColor(color)
    ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
    : ''
}

function getSectionColorDraftKey(sectionIndex: number, section: VenueSectionDraftInput) {
  return `${sectionIndex}:${section.code}`
}

function getSectionColorDraft(sectionIndex: number, section: VenueSectionDraftInput) {
  return sectionColorDrafts.value[getSectionColorDraftKey(sectionIndex, section)] ?? section.color
}

function updateSectionColorDraft(sectionIndex: number, section: VenueSectionDraftInput, value: string | number) {
  sectionColorDrafts.value = {
    ...sectionColorDrafts.value,
    [getSectionColorDraftKey(sectionIndex, section)]: String(value),
  }
}

function applySectionColor(sectionIndex: number, section: VenueSectionDraftInput) {
  const normalizedColor = normalizeHexColor(getSectionColorDraft(sectionIndex, section))
  if (!normalizedColor) {
    return
  }

  updateSection(sectionIndex, 'color', normalizedColor)
  sectionColorDrafts.value = {
    ...sectionColorDrafts.value,
    [getSectionColorDraftKey(sectionIndex, section)]: normalizedColor,
  }
}

function selectSectionColor(sectionIndex: number, section: VenueSectionDraftInput, color: string) {
  const normalizedColor = normalizeHexColor(color)
  if (!normalizedColor) {
    return
  }

  updateSection(sectionIndex, 'color', normalizedColor)
  sectionColorDrafts.value = {
    ...sectionColorDrafts.value,
    [getSectionColorDraftKey(sectionIndex, section)]: normalizedColor,
  }
}

function isSectionColorDraftInvalid(sectionIndex: number, section: VenueSectionDraftInput) {
  return normalizeHexColor(getSectionColorDraft(sectionIndex, section)) === null
}

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

function getNextUnusedSeatY(section: VenueSectionDraftInput) {
  const usedYValues = new Set<number>()

  for (const row of section.rows) {
    for (const seat of row.seats) {
      usedYValues.add(seat.y)
    }
  }

  let nextY = 0

  while (usedYValues.has(nextY)) {
    nextY += 1
  }

  return nextY
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

function updateSeatLayoutMode(sectionIndex: number, selectedValue: AcceptableValue) {
  if (typeof selectedValue !== 'string') {
    return
  }

  const value = selectedValue === SeatLayoutMode.Manual ? SeatLayoutMode.Manual : SeatLayoutMode.Automatic
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

function updateSeatAccessibility(sectionIndex: number, rowIndex: number, seatIndex: number, isAccessible: boolean) {
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
      isAccessible,
      accessibilityLabel: isAccessible ? seat.accessibilityLabel : '',
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
  <div class="flex h-full min-h-0 flex-col gap-4">
    <div class="flex shrink-0 items-center justify-between gap-4">
      <div>
        <p class="text-base font-medium tracking-[-0.03em] text-foreground">
          {{ $t('admin.venues.seat_layout_editor') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <slot name="toolbar-start" />
        <Button
          type="button"
          variant="outline"
          @click="addSection"
        >
          {{ $t('admin.venues.add_section') }}
        </Button>
      </div>
    </div>

    <Accordion
      type="multiple"
      class="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
    >
      <AccordionItem
        v-for="(section, sectionIndex) in sections"
        :key="sectionIndex"
        :value="`section-${sectionIndex}`"
        class="dashboard-list-item space-y-4"
      >
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground">
              {{ section.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ section.code }} · {{ $t('admin.venues.row_count', { count: section.rows.length }) }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :title="$t('admin.venues.section_settings_for', { name: section.name })"
                  :aria-label="$t('admin.venues.section_settings_for', { name: section.name })"
                >
                  <Settings2 class="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                class="w-[calc(100vw-2rem)] max-w-md"
              >
                <div class="flex flex-col gap-4">
                  <div>
                    <p class="text-sm font-medium text-foreground">
                      {{ $t('admin.venues.section_settings') }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ $t('admin.venues.section_settings_desc') }}
                    </p>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
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

                  <div class="flex flex-col gap-2 rounded-[1rem] border bg-muted/30 p-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Section color
                        </p>
                        <p class="truncate text-sm font-medium text-foreground">
                          {{ section.color }}
                        </p>
                      </div>
                      <Popover>
                        <PopoverTrigger as-child>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="shrink-0"
                            :title="$t('admin.venues.choose_section_color_for', { name: section.name })"
                            :aria-label="$t('admin.venues.choose_section_color_for', { name: section.name })"
                          >
                            <span
                              class="size-4 rounded-full border"
                              :style="getSectionColorPreviewStyle(section.color)"
                            />
                            <Palette class="size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          class="w-[calc(100vw-2rem)] max-w-sm"
                        >
                          <div class="flex flex-col gap-4">
                            <div>
                              <p class="text-sm font-medium text-foreground">
                                Section background
                              </p>
                              <p class="text-xs text-muted-foreground">
                                Pick a common gradient color or enter a custom hex value.
                              </p>
                            </div>

                            <div
                              class="h-20 rounded-[1rem] border shadow-sm"
                              :style="getSectionColorPreviewStyle(section.color)"
                            />

                            <div class="grid grid-cols-5 gap-2">
                              <Button
                                v-for="color in commonSectionColors"
                                :key="color.value"
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                class="relative overflow-hidden rounded-full border p-0"
                                :class="getSectionColorButtonClass(section.color, color.value)"
                                :title="$t(color.nameKey)"
                                :aria-label="$t('admin.venues.use_section_color', { color: $t(color.nameKey) })"
                                @click="selectSectionColor(sectionIndex, section, color.value)"
                              >
                                <span
                                  class="absolute inset-0"
                                  :style="getSectionColorPreviewStyle(color.value)"
                                />
                                <Check
                                  v-if="getSafeSectionColor(section.color) === getSafeSectionColor(color.value)"
                                  class="relative size-4 text-white drop-shadow"
                                />
                              </Button>
                            </div>

                            <div class="space-y-2">
                              <label
                                class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                                :for="getSectionFieldId(sectionIndex, 'color')"
                              >{{ $t('admin.venues.custom_hex_color') }}</label>
                              <Input
                                :id="getSectionFieldId(sectionIndex, 'color')"
                                :model-value="getSectionColorDraft(sectionIndex, section)"
                                placeholder="#2563EB"
                                :aria-invalid="isSectionColorDraftInvalid(sectionIndex, section)"
                                @update:model-value="updateSectionColorDraft(sectionIndex, section, $event)"
                              />
                              <p
                                v-if="isSectionColorDraftInvalid(sectionIndex, section)"
                                class="text-xs text-destructive"
                              >
                                {{ $t('admin.venues.use_valid_hex_color') }}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                :disabled="isSectionColorDraftInvalid(sectionIndex, section)"
                                @click="applySectionColor(sectionIndex, section)"
                              >
                                {{ $t('admin.venues.apply_color') }}
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="space-y-2">
                      <label
                        class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                        :for="getSectionFieldId(sectionIndex, 'grid-x')"
                      >{{ $t('admin.venues.grid_x') }}</label>
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
                      >{{ $t('admin.venues.grid_y') }}</label>
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
                      >{{ $t('admin.venues.grid_w') }}</label>
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
                      >{{ $t('admin.venues.grid_h') }}</label>
                      <Input
                        :id="getSectionFieldId(sectionIndex, 'grid-h')"
                        :model-value="String(section.gridH)"
                        type="number"
                        min="1"
                        @update:model-value="updateGridField(sectionIndex, 'gridH', $event)"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label
                      class="text-xs uppercase tracking-[0.18em] text-muted-foreground"
                      :for="`section-${sectionIndex}-layout-mode`"
                    >{{ $t('admin.venues.seat_layout_mode') }}</label>
                    <Select
                      :model-value="section.seatLayoutMode"
                      @update:model-value="updateSeatLayoutMode(sectionIndex, $event)"
                    >
                      <SelectTrigger :id="`section-${sectionIndex}-layout-mode`">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem :value="SeatLayoutMode.Automatic">
                            {{ $t('admin.venues.seat_layout_mode_automatic') }}
                          </SelectItem>
                          <SelectItem :value="SeatLayoutMode.Manual">
                            {{ $t('admin.venues.seat_layout_mode_manual') }}
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
                  size="icon-sm"
                  :title="$t('admin.venues.add_seat')"
                  @click="addSeat(sectionIndex, rowIndex)"
                >
                  <Plus class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="$t('admin.venues.duplicate_row')"
                  :title="$t('admin.venues.duplicate_row')"
                  @click="duplicateRow(sectionIndex, rowIndex)"
                >
                  <CopyPlus class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :aria-label="$t('admin.venues.remove_row')"
                  :title="$t('admin.venues.remove_row')"
                  @click="removeRow(sectionIndex, rowIndex)"
                >
                  <Trash2 class="size-4" />
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
              <div class="mt-4 grid gap-3 lg:grid-cols-2">
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
                      {{ $t('admin.venues.manual_seat_coordinates_unique') }}
                    </p>
                    <div class="grid gap-3 rounded-[0.9rem] border border-border bg-secondary p-3 2xl:grid-cols-[auto_minmax(0,1fr)] 2xl:items-center">
                      <div class="flex items-center gap-3">
                        <label
                          class="flex items-center gap-2 text-xs text-muted-foreground"
                          :for="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'accessible')"
                        >
                          <Accessibility class="size-4 text-muted-foreground" />
                          <span>{{ $t('admin.venues.accessible_seat') }}</span>
                        </label>
                        <Switch
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'accessible')"
                          :model-value="seat.isAccessible"
                          :aria-label="$t('admin.venues.accessible_seat')"
                          @update:model-value="updateSeatAccessibility(sectionIndex, rowIndex, seatIndex, $event)"
                        />
                      </div>
                      <div
                        v-if="seat.isAccessible"
                        class="min-w-0 space-y-2"
                      >
                        <Input
                          :id="getSeatFieldId(sectionIndex, rowIndex, seatIndex, 'accessibility-label')"
                          :model-value="seat.accessibilityLabel || ''"
                          :placeholder="$t('admin.venues.accessibility_label')"
                          @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'accessibilityLabel', $event)"
                        />
                      </div>
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
