<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SeatMapSeat, SeatMapTicketType } from '@/lib/seatmapLayout'
import { buildSeatMapLayout, getRowStyle, getTintStyle } from '@/lib/seatmapLayout'

const props = withDefaults(defineProps<{
  seats: SeatMapSeat[]
  ticketTypes: SeatMapTicketType[]
  selectedSeatIds?: number[]
  defaultSection?: string
}>(), {
  selectedSeatIds: () => [],
  defaultSection: 'all',
})

const selectedSection = ref(props.defaultSection)
const zoomLevel = ref(100)
const activeSeatId = ref<number | null>(null)

const layout = computed(() => buildSeatMapLayout(props.seats, props.ticketTypes))

const sectionOptions = computed(() => layout.value.sections.map(section => ({
  value: section.key,
  label: section.name,
})))

const visibleSections = computed(() => {
  if (selectedSection.value === 'all') {
    return layout.value.sections
  }

  return layout.value.sections.filter(section => section.key === selectedSection.value)
})

const visibleSeats = computed(() => visibleSections.value.flatMap(section => section.seats))

const activeSeat = computed(() => {
  const selectedSeat = visibleSeats.value.find(seat => seat.id === activeSeatId.value)
  if (selectedSeat) {
    return selectedSeat
  }

  return visibleSeats.value.find(seat => seat.status === 'available') ?? visibleSeats.value[0] ?? null
})

const highlightedSection = computed(() => {
  if (!activeSeat.value) {
    return visibleSections.value[0] ?? layout.value.sections[0] ?? null
  }

  return layout.value.sections.find(section => section.name === activeSeat.value?.sectionNameSnapshot) ?? visibleSections.value[0] ?? null
})

const activeSeatTicketType = computed(() => {
  if (!activeSeat.value || activeSeat.value.ticketTypeId === null) {
    if (typeof activeSeat.value?.venueSectionId === 'number') {
      return layout.value.ticketTypeBySectionId.get(activeSeat.value.venueSectionId) ?? null
    }

    return null
  }

  return layout.value.ticketTypeById.get(activeSeat.value.ticketTypeId) ?? null
})

const stageStyle = computed(() => getTintStyle(highlightedSection.value?.color ?? '#111827', 0.2, 0.12))

const zoomStyle = computed(() => ({
  transform: `scale(${zoomLevel.value / 100})`,
  transformOrigin: 'top center',
}))

function isSeatSelected(seatId: number) {
  return props.selectedSeatIds.includes(seatId)
}

function setActiveSeat(seatId: number) {
  activeSeatId.value = seatId
}

function setSelectedSection(value: string) {
  selectedSection.value = value
}

function decreaseZoom() {
  zoomLevel.value = Math.max(75, zoomLevel.value - 10)
}

function increaseZoom() {
  zoomLevel.value = Math.min(160, zoomLevel.value + 10)
}

function resetZoom() {
  zoomLevel.value = 100
}
</script>

<template>
  <slot
    :layout="layout"
    :sections="layout.sections"
    :inventory-summary="layout.inventorySummary"
    :section-options="sectionOptions"
    :selected-section="selectedSection"
    :visible-sections="visibleSections"
    :visible-seats="visibleSeats"
    :active-seat="activeSeat"
    :active-seat-ticket-type="activeSeatTicketType"
    :highlighted-section="highlightedSection"
    :stage-style="stageStyle"
    :zoom-level="zoomLevel"
    :zoom-style="zoomStyle"
    :is-seat-selected="isSeatSelected"
    :set-active-seat="setActiveSeat"
    :set-selected-section="setSelectedSection"
    :decrease-zoom="decreaseZoom"
    :increase-zoom="increaseZoom"
    :reset-zoom="resetZoom"
    :get-row-style="getRowStyle"
    :get-tint-style="getTintStyle"
  />
</template>
