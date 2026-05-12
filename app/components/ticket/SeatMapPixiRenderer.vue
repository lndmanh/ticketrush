<script setup lang="ts">
import 'pixi.js/unsafe-eval'
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { SeatMapRenderModel, SeatMapRenderSeat } from '@/lib/seatmapRender'

const props = defineProps<{
  model: SeatMapRenderModel
}>()

const emit = defineEmits<{
  seatClick: [seat: SeatMapRenderSeat]
  zoomChange: [zoom: number]
}>()

const hostRef = ref<HTMLElement | null>(null)

let app: Application | null = null
let worldLayer: Container | null = null
let sectionLayer: Container | null = null
let seatLayer: Container | null = null
let labelLayer: Container | null = null
let isDragging = false
let lastPointer: { x: number, y: number } | null = null
let lastPinchDistance: number | null = null
let pointerStart: { x: number, y: number } | null = null
let suppressSeatClick = false
let isDisposed = false
let viewportSignature = ''
let areLabelsVisible = false

const tapMoveThreshold = 6
const labelZoomThreshold = 1
const maxLabelledSeats = 900
const seatBackrestInset = 3
const minFitZoom = 0.75

const pointers = new Map<number, { x: number, y: number }>()
const zoom = ref(1)

function getCanvas() {
  return app?.canvas ?? null
}

function getWorldLayer() {
  return worldLayer
}

function createLayer() {
  const layer = new Container()
  layer.eventMode = 'passive'
  return layer
}

function createViewportSignature(model: SeatMapRenderModel) {
  return [
    model.bounds.minX,
    model.bounds.minY,
    model.bounds.maxX,
    model.bounds.maxY,
    model.seats.length,
    model.sections.length,
  ].join(':')
}

function destroyChildren(layer: Container | null) {
  if (!layer) {
    return
  }

  const children = layer.removeChildren()
  for (const child of children) {
    child.destroy({ children: true })
  }
}

function drawSections() {
  destroyChildren(sectionLayer)
  if (!sectionLayer) {
    return
  }

  for (const section of props.model.sections) {
    const padding = 22
    const width = Math.max(section.bounds.width + padding * 2, 120)
    const height = Math.max(section.bounds.height + padding * 2, 64)
    const panel = new Graphics()
      .roundRect(section.bounds.minX - padding, section.bounds.minY - padding, width, height, 22)
      .fill({ color: 0xF8FAFC, alpha: 0.8 })
      .stroke({ width: 1, color: 0xCBD5E1, alpha: 0.75 })

    sectionLayer.addChild(panel)

    const sectionLabel = new Text({
      text: section.name,
      style: {
        fill: '#334155',
        fontFamily: 'Geist, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: '700',
      },
    })
    sectionLabel.x = section.bounds.minX - padding + 14
    sectionLabel.y = section.bounds.minY - padding + 10
    sectionLabel.eventMode = 'none'
    sectionLayer.addChild(sectionLabel)
  }
}

function drawSeats() {
  destroyChildren(seatLayer)
  if (!seatLayer) {
    return
  }

  for (const renderSeat of props.model.seats) {
    const x = -renderSeat.width / 2
    const y = -renderSeat.height / 2
    const backrestY = y + 5
    const seat = new Graphics()
      .roundRect(x, y, renderSeat.width, renderSeat.height, renderSeat.cornerRadius)
      .fill({ color: renderSeat.color.hexNumber })
      .stroke({ width: renderSeat.selected ? 2 : 1, color: 0xFFFFFF, alpha: renderSeat.selected ? 1 : 0.78 })
      .moveTo(x + seatBackrestInset, backrestY)
      .lineTo(x + renderSeat.width - seatBackrestInset, backrestY)
      .stroke({ width: 1, color: renderSeat.color.text, alpha: 0.38 })

    seat.x = renderSeat.x
    seat.y = renderSeat.y
    seat.eventMode = 'static'
    seat.cursor = 'pointer'
    seat.on('pointertap', () => {
      if (!suppressSeatClick) {
        emit('seatClick', renderSeat)
      }
    })
    seatLayer.addChild(seat)
  }
}

function drawLabels() {
  if (!labelLayer) {
    return
  }

  for (const renderSeat of props.model.seats) {
    const label = new Text({
      text: renderSeat.label,
      style: {
        fill: renderSeat.color.text,
        fontFamily: 'Geist, system-ui, sans-serif',
        fontSize: 12,
        fontWeight: '700',
      },
    })
    label.anchor.set(0.5)
    label.x = renderSeat.x
    label.y = renderSeat.y
    label.eventMode = 'none'
    labelLayer.addChild(label)
  }
}

function syncLabels(force = false) {
  const shouldShowLabels = zoom.value >= labelZoomThreshold && props.model.seats.length <= maxLabelledSeats

  if (!shouldShowLabels) {
    if (areLabelsVisible) {
      destroyChildren(labelLayer)
      areLabelsVisible = false
    }
    return
  }

  if (areLabelsVisible && !force) {
    return
  }

  destroyChildren(labelLayer)
  areLabelsVisible = true
  drawLabels()
}

function drawScene() {
  drawSections()
  drawSeats()
  syncLabels(true)
}

function fitToModel() {
  const host = hostRef.value
  const layer = getWorldLayer()
  if (!host || !layer || props.model.seats.length === 0) {
    return
  }

  const padding = 72
  const width = Math.max(props.model.bounds.width + padding * 2, 1)
  const height = Math.max(props.model.bounds.height + padding * 2, 1)
  const nextZoom = Math.min(host.clientWidth / width, host.clientHeight / height, 2)
  zoom.value = Math.max(nextZoom, minFitZoom)
  layer.scale.set(zoom.value)
  layer.x = (host.clientWidth - props.model.bounds.width * zoom.value) / 2 - props.model.bounds.minX * zoom.value
  layer.y = (host.clientHeight - props.model.bounds.height * zoom.value) / 2 - props.model.bounds.minY * zoom.value
  emit('zoomChange', Math.round(zoom.value * 100))
  viewportSignature = createViewportSignature(props.model)
  syncLabels()
}

function applyZoom(nextZoom: number, center: { x: number, y: number }) {
  const layer = getWorldLayer()
  if (!layer) {
    return
  }

  const clampedZoom = Math.min(Math.max(nextZoom, 0.2), 4)
  const worldX = (center.x - layer.x) / zoom.value
  const worldY = (center.y - layer.y) / zoom.value
  zoom.value = clampedZoom
  layer.scale.set(clampedZoom)
  layer.x = center.x - worldX * clampedZoom
  layer.y = center.y - worldY * clampedZoom
  emit('zoomChange', Math.round(clampedZoom * 100))
  syncLabels()
}

function zoomAtViewportCenter(multiplier: number) {
  const host = hostRef.value
  if (!host) {
    return
  }

  applyZoom(zoom.value * multiplier, {
    x: host.clientWidth / 2,
    y: host.clientHeight / 2,
  })
}

function getPinchDistance() {
  const values = Array.from(pointers.values())
  const first = values[0]
  const second = values[1]
  if (!first || !second) {
    return null
  }

  return Math.hypot(first.x - second.x, first.y - second.y)
}

function getPinchCenter() {
  const values = Array.from(pointers.values())
  const first = values[0]
  const second = values[1]
  if (!first || !second) {
    return null
  }

  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  const rect = getCanvas()?.getBoundingClientRect()
  if (!rect) {
    return
  }

  const center = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  const factor = event.deltaY > 0 ? 0.9 : 1.1
  applyZoom(zoom.value * factor, center)
}

function handlePointerDown(event: PointerEvent) {
  const canvas = getCanvas()
  if (!canvas) {
    return
  }

  if (pointers.size === 0) {
    suppressSeatClick = false
    pointerStart = { x: event.offsetX, y: event.offsetY }
  }

  canvas.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY })
  isDragging = true
  lastPointer = { x: event.offsetX, y: event.offsetY }
  lastPinchDistance = getPinchDistance()
}

function handlePointerMove(event: PointerEvent) {
  const layer = getWorldLayer()
  if (!layer || !isDragging) {
    return
  }

  pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY })

  if (pointerStart) {
    const moveX = Math.abs(event.offsetX - pointerStart.x)
    const moveY = Math.abs(event.offsetY - pointerStart.y)
    if (Math.max(moveX, moveY) > tapMoveThreshold) {
      suppressSeatClick = true
    }
  }

  if (pointers.size >= 2) {
    suppressSeatClick = true
    const nextDistance = getPinchDistance()
    const center = getPinchCenter()
    if (nextDistance && lastPinchDistance && center) {
      applyZoom(zoom.value * (nextDistance / lastPinchDistance), center)
    }
    lastPinchDistance = nextDistance
    return
  }

  if (!lastPointer) {
    lastPointer = { x: event.offsetX, y: event.offsetY }
    return
  }

  layer.x += event.offsetX - lastPointer.x
  layer.y += event.offsetY - lastPointer.y
  lastPointer = { x: event.offsetX, y: event.offsetY }
}

function handlePointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId)
  isDragging = pointers.size > 0
  lastPointer = null
  lastPinchDistance = getPinchDistance()

  if (pointers.size === 0) {
    window.setTimeout(() => {
      suppressSeatClick = false
      pointerStart = null
    }, 0)
  }
}

async function mountPixi() {
  const host = hostRef.value
  if (!host) {
    return
  }

  const nextApp = new Application()
  await nextApp.init({
    resizeTo: host,
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
  })

  if (isDisposed || !hostRef.value) {
    nextApp.destroy({ removeView: true }, { children: true, texture: true, textureSource: true })
    return
  }

  app = nextApp
  worldLayer = createLayer()
  sectionLayer = createLayer()
  seatLayer = createLayer()
  labelLayer = createLayer()
  worldLayer.addChild(sectionLayer, seatLayer, labelLayer)
  nextApp.stage.addChild(worldLayer)
  host.appendChild(nextApp.canvas)
  nextApp.canvas.className = 'h-full w-full touch-none select-none'
  nextApp.canvas.addEventListener('wheel', handleWheel, { passive: false })
  nextApp.canvas.addEventListener('pointerdown', handlePointerDown)
  nextApp.canvas.addEventListener('pointermove', handlePointerMove)
  nextApp.canvas.addEventListener('pointerup', handlePointerUp)
  nextApp.canvas.addEventListener('pointercancel', handlePointerUp)
  drawScene()
  fitToModel()
}

function destroyPixi() {
  isDisposed = true
  const canvas = getCanvas()
  if (canvas) {
    canvas.removeEventListener('wheel', handleWheel)
    canvas.removeEventListener('pointerdown', handlePointerDown)
    canvas.removeEventListener('pointermove', handlePointerMove)
    canvas.removeEventListener('pointerup', handlePointerUp)
    canvas.removeEventListener('pointercancel', handlePointerUp)
  }

  app?.destroy({ removeView: true }, { children: true, texture: true, textureSource: true })
  app = null
  worldLayer = null
  sectionLayer = null
  seatLayer = null
  labelLayer = null
  pointers.clear()
  isDragging = false
  lastPointer = null
  lastPinchDistance = null
  pointerStart = null
  suppressSeatClick = false
  areLabelsVisible = false
  viewportSignature = ''
}

onMounted(() => {
  isDisposed = false
  void mountPixi()
})

onBeforeUnmount(() => {
  destroyPixi()
})

watch(() => props.model, () => {
  drawScene()
  const nextSignature = createViewportSignature(props.model)
  if (nextSignature !== viewportSignature) {
    fitToModel()
  }
}, { deep: false })

defineExpose({
  fitToModel,
  applyZoom,
  zoomAtViewportCenter,
})
</script>

<template>
  <div
    ref="hostRef"
    class="h-full min-h-0 w-full overflow-hidden"
    aria-hidden="true"
  />
</template>
