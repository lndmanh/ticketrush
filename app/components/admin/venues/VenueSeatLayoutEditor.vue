<script setup lang="ts">
import type { VenueRowDraftInput, VenueSeatDraftInput, VenueSectionDraftInput } from '#shared/schemas/ticketingSchema'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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

function createSection(index: number): VenueSectionDraftInput {
  return {
    code: `SEC-${index + 1}`,
    name: `Section ${index + 1}`,
    color: '#111111',
    sortOrder: index,
    rows: [createRow(0)],
  }
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

function createSectionCopy(section: VenueSectionDraftInput, index: number): VenueSectionDraftInput {
  const nextSection = createSection(index)

  return {
    ...nextSection,
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
    createSectionCopy(section, props.sections.length),
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
          <div class="grid flex-1 gap-3 md:grid-cols-3">
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">{{ $t('admin.columns.code') }}</label>
              <Input
                :model-value="section.code"
                @update:model-value="updateSection(sectionIndex, 'code', $event)"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">{{ $t('admin.columns.name') }}</label>
              <Input
                :model-value="section.name"
                @update:model-value="updateSection(sectionIndex, 'name', $event)"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs uppercase tracking-[0.18em] text-muted-foreground">{{ $t('admin.columns.color') }}</label>
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
              :title="$t('admin.venues.duplicate_section')"
              @click="duplicateSection(sectionIndex)"
            >
              <CopyPlus class="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :title="$t('admin.venues.remove_section')"
              @click="removeSection(sectionIndex)"
            >
              <Trash2 class="size-4" />
            </Button>
            <AccordionTrigger />
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
                <label class="shrink-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">{{ $t('admin.venues.row_label') }}</label>
                <Input
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
                  @click="duplicateRow(sectionIndex, rowIndex)"
                >
                  <CopyPlus class="size-4" />
                  {{ $t('admin.venues.duplicate_row') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
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
                  >
                    <span class="sr-only">Toggle row seats</span>
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
                        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{{ $t('admin.venues.seat_label') }}</label>
                        <Input
                          :model-value="seat.label"
                          @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'label', $event)"
                        />
                      </div>
                      <div class="space-y-2">
                        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{{ $t('admin.venues.seat_no') }}</label>
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

                    <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div class="space-y-2">
                        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{{ $t('admin.venues.accessibility_label') }}</label>
                        <Input
                          :model-value="seat.accessibilityLabel || ''"
                          @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'accessibilityLabel', $event)"
                        />
                      </div>

                      <div
                        class="flex min-h-10 items-center justify-between rounded-[0.9rem] border border-border bg-secondary px-3 py-2 sm:min-w-24"
                        :title="$t('admin.venues.accessible_seat')"
                      >
                        <Accessibility class="size-4 text-muted-foreground" />
                        <Switch
                          :model-value="seat.isAccessible"
                          @update:model-value="updateSeat(sectionIndex, rowIndex, seatIndex, 'isAccessible', $event)"
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
