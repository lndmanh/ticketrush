<script setup lang="ts">
import { RefreshCcw, ZoomIn, ZoomOut } from '@lucide/vue'
import type { SeatMapLayout, SeatMapSeat, SeatMapSeatClickPayload, SeatMapSeatOverrideSummary, SeatMapSectionPriceSummary, SeatMapTicketType } from '~~/types/seatmap'
import type { SeatMapRenderSeat } from '@/lib/seatmapRender'
import { buildSeatMapLayout } from '@/lib/seatmapLayout'
import { createSeatMapRenderModel, createSeatMapSeatClickPayload } from '@/lib/seatmapRender'
import { seatMapStatusPalette } from '@/lib/seatmapStatus'
import SeatMapPixiRenderer from '@/components/ticket/SeatMapPixiRenderer.vue'
import { SeatStatus } from '#shared/commonEnums'

const props = withDefaults(defineProps<{
  seats: SeatMapSeat[]
  ticketTypes?: SeatMapTicketType[]
  sectionPrices?: SeatMapSectionPriceSummary[]
  seatOverrides?: SeatMapSeatOverrideSummary[]
  actionLabel?: string | null
  selectedSeatIds?: number[]
  interactive?: boolean
  mode?: 'public' | 'admin'
}>(), {
  actionLabel: null,
  ticketTypes: () => [],
  sectionPrices: () => [],
  seatOverrides: () => [],
  selectedSeatIds: () => [],
  interactive: false,
  mode: 'public',
})

const emit = defineEmits<{
  purchase: []
  toggle: [seatId: number]
  seatClick: [payload: SeatMapSeatClickPayload]
}>()

const { t } = useI18n()

const selectedSection = ref('all')
const zoomLevel = ref(100)
const keyboardSeatIndex = ref(0)
const rendererRef = ref<InstanceType<typeof SeatMapPixiRenderer> | null>(null)

const layout = computed(() => buildSeatMapLayout(props.seats, props.ticketTypes, props.sectionPrices, props.seatOverrides))
const sectionOptions = computed(() => layout.value.sections.map(section => ({
  value: section.key,
  label: section.name,
})))
const visibleLayout = computed<SeatMapLayout>(() => {
  if (selectedSection.value === 'all') {
    return layout.value
  }

  return {
    ...layout.value,
    sections: layout.value.sections.filter(section => section.key === selectedSection.value),
  }
})
const renderModel = computed(() => createSeatMapRenderModel(visibleLayout.value, props.selectedSeatIds, {
  stageLabel: t('seatmap.stage_short'),
  availabilityLabel: (available, total) => t('seatmap.availability_label', { available, total }),
}))
const legendItems = computed(() => [
  seatMapStatusPalette[SeatStatus.Available],
  seatMapStatusPalette.selected,
  seatMapStatusPalette[SeatStatus.Locked],
  seatMapStatusPalette[SeatStatus.Sold],
  seatMapStatusPalette[SeatStatus.Unavailable],
])
const keyboardSeat = computed(() => renderModel.value.seats[keyboardSeatIndex.value] ?? null)

watch(renderModel, (model) => {
  if (keyboardSeatIndex.value >= model.seats.length) {
    keyboardSeatIndex.value = 0
  }
})

function setSelectedSection(value: string) {
  selectedSection.value = value
}

function updateZoomLevel(value: number) {
  zoomLevel.value = value
}

function zoomAtCenter(multiplier: number) {
  rendererRef.value?.zoomAtViewportCenter(multiplier)
}

function resetView() {
  rendererRef.value?.fitToModel()
}

function canToggleSeat(seat: SeatMapSeat) {
  if (!props.interactive) {
    return false
  }

  return props.mode === 'admin' || seat.status === SeatStatus.Available
}

function moveKeyboardSeat(delta: number) {
  const seatCount = renderModel.value.seats.length
  if (seatCount === 0) {
    keyboardSeatIndex.value = 0
    return
  }

  keyboardSeatIndex.value = (keyboardSeatIndex.value + delta + seatCount) % seatCount
}

function inspectKeyboardSeat() {
  const seat = keyboardSeat.value
  if (!seat) {
    return
  }

  handleSeatClick(seat)
}

function getKeyboardSeatLabel(seat: SeatMapRenderSeat) {
  return t('seatmap.keyboard_seat_label', {
    section: seat.sectionName,
    row: seat.rowLabel,
    seat: seat.label,
    status: t(seat.color.labelKey),
  })
}

function handleSeatClick(renderSeat: SeatMapRenderSeat) {
  const payload = createSeatMapSeatClickPayload(renderSeat)
  emit('seatClick', payload)

  if (canToggleSeat(payload.seat)) {
    emit('toggle', payload.seat.id)
  }
}
</script>

<template>
  <section class="relative flex h-full min-h-[30rem] overflow-hidden bg-background text-foreground">
    <div
      v-if="seats.length === 0"
      class="flex h-full min-h-[24rem] w-full flex-col items-center justify-center gap-2 text-center"
    >
      <p class="text-sm font-medium">
        {{ $t('seatmap.layout_empty_title') }}
      </p>
      <p class="max-w-sm text-sm text-muted-foreground">
        {{ $t('seatmap.layout_empty_desc') }}
      </p>
    </div>

    <template v-else>
      <p class="sr-only">
        {{ $t('seatmap.keyboard_instructions') }}
      </p>

      <ClientOnly>
        <SeatMapPixiRenderer
          ref="rendererRef"
          :model="renderModel"
          @seat-click="handleSeatClick"
          @zoom-change="updateZoomLevel"
        />
        <template #fallback>
          <div class="flex h-full min-h-[24rem] w-full items-center justify-center text-sm text-muted-foreground">
            {{ $t('common.loading') }}
          </div>
        </template>
      </ClientOnly>

      <div class="sr-only focus-within:not-sr-only focus-within:pointer-events-auto focus-within:absolute focus-within:left-3 focus-within:top-20 focus-within:z-10 focus-within:flex focus-within:max-w-sm focus-within:flex-col focus-within:gap-2 focus-within:rounded-2xl focus-within:border focus-within:bg-background focus-within:p-3 focus-within:shadow-lg">
        <p class="text-sm font-medium">
          {{ $t('seatmap.keyboard_controls') }}
        </p>
        <p
          class="text-xs text-muted-foreground"
          aria-live="polite"
        >
          {{ keyboardSeat ? getKeyboardSeatLabel(keyboardSeat) : $t('seatmap.layout_empty_title') }}
        </p>
        <div class="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="moveKeyboardSeat(-1)"
          >
            {{ $t('seatmap.previous_seat') }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="moveKeyboardSeat(1)"
          >
            {{ $t('seatmap.next_seat') }}
          </Button>
          <Button
            type="button"
            size="sm"
            :disabled="!keyboardSeat"
            @click="inspectKeyboardSeat"
          >
            {{ $t('seatmap.click_to_inspect') }}
          </Button>
        </div>
      </div>

      <div class="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-start sm:justify-between md:p-4">
        <div class="pointer-events-auto flex w-full flex-wrap items-center gap-2 rounded-full border bg-background/90 p-1 shadow-sm backdrop-blur sm:w-auto">
          <Select
            :model-value="selectedSection"
            @update:model-value="value => setSelectedSection(String(value))"
          >
            <SelectTrigger
              class="h-9 min-w-40 flex-1 rounded-full border-0 bg-transparent px-3 shadow-none sm:flex-none"
              :aria-label="$t('seatmap.focus_section')"
            >
              <SelectValue :placeholder="$t('seatmap.focus_section')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {{ $t('seatmap.all_sections') }}
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
        </div>

        <div class="pointer-events-auto flex w-fit items-center gap-1 self-end rounded-full border bg-background/90 p-1 shadow-sm backdrop-blur sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="$t('seatmap.zoom_out')"
            @click="zoomAtCenter(0.9)"
          >
            <ZoomOut />
          </Button>
          <span class="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
            {{ zoomLevel }}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="$t('seatmap.zoom_in')"
            @click="zoomAtCenter(1.1)"
          >
            <ZoomIn />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="$t('seatmap.reset_zoom')"
            @click="resetView"
          >
            <RefreshCcw />
          </Button>
        </div>
      </div>

      <div class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-3 md:p-4">
        <Badge
          v-for="item in legendItems"
          :key="item.labelKey"
          variant="outline"
          class="gap-2 bg-background/90 backdrop-blur"
        >
          <span
            class="size-2.5 rounded-full"
            :style="{ backgroundColor: item.fill }"
          />
          {{ $t(item.labelKey) }}
        </Badge>
      </div>
    </template>
  </section>
</template>
