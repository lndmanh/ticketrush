<script setup lang="ts">
import 'pixi.js/unsafe-eval'
import { Application, Container, FillGradient, Graphics, Rectangle, Text } from 'pixi.js'
import type { SeatMapRenderModel, SeatMapRenderSeat } from '@/lib/seatmapRender'
import { colorToRgb } from '@/lib/seatmapLayout'

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
let stageLayer: Container | null = null
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
const pointers = new Map<number, { x: number, y: number }>()
const zoom = ref(1)

function normalizeHexColor(value: string) {
  const trimmed = value.trim()

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map(character => `${character}${character}`).join('')}`.toUpperCase()
  }

  return '#334155'
}

function getHexColorNumber(value: string) {
  const parsed = Number.parseInt(normalizeHexColor(value).slice(1), 16)

  return Number.isFinite(parsed) ? parsed : 0x334155
}

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
    const padding = 14
    const width = Math.max(section.bounds.width + padding * 2, 120)
    const height = Math.max(section.bounds.height + padding * 2, 64)
    const sectionColor = getHexColorNumber(section.color)
    const sectionRgb = colorToRgb(section.color) ?? '51, 65, 85'
    const panelX = section.bounds.minX - padding
    const panelY = section.bounds.minY - padding
    const panelGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: `rgba(${sectionRgb}, 0.2)` },
        { offset: 0.58, color: `rgba(${sectionRgb}, 0.04)` },
        { offset: 1, color: 'rgba(255,255,255,0)' },
      ],
      textureSpace: 'local',
    })
    const panel = new Graphics()
      .roundRect(panelX, panelY, width, height, 22)
      .fill({ fill: panelGradient })
      .stroke({ width: 1, color: sectionColor, alpha: 0.34 })

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
    sectionLabel.x = section.bounds.minX - padding + 18
    sectionLabel.y = section.bounds.minY - padding + 16
    sectionLabel.eventMode = 'none'
    sectionLayer.addChild(sectionLabel)

    const availabilityLabel = new Text({
      text: section.availability.label,
      style: {
        fill: '#475569',
        fontFamily: 'Geist, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: '600',
      },
    })
    availabilityLabel.anchor.set(1, 0)
    availabilityLabel.x = section.availability.x
    availabilityLabel.y = section.availability.y - padding + 18
    availabilityLabel.eventMode = 'none'
    sectionLayer.addChild(availabilityLabel)

    for (const rowLabel of section.rowLabels) {
      const label = new Text({
        text: rowLabel.label,
        style: {
          fill: '#64748B',
          fontFamily: 'Geist, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: '600',
        },
      })
      label.anchor.set(1, 0.5)
      label.x = rowLabel.x
      label.y = rowLabel.y
      label.eventMode = 'none'
      sectionLayer.addChild(label)
    }
  }
}

function drawStage() {
  destroyChildren(stageLayer)
  if (!stageLayer) {
    return
  }

  const padding = 24
  const stage = props.model.stage
  const x = props.model.bounds.minX - padding
  const y = stage.bounds.minY
  const width = props.model.bounds.width + padding * 2
  const height = stage.bounds.height
  const radius = 22
  const band = new Graphics()
    .roundRect(x, y, width, height, radius)
    .fill({ color: 0x101827, alpha: 0.96 })
    .stroke({ width: 1, color: 0x475569, alpha: 0.42 })

  stageLayer.addChild(band)

  const glow = new Graphics()
    .roundRect(x + 5, y + 5, width - 10, Math.max(height - 10, 1), radius - 5)
    .fill({ color: 0x1E293B, alpha: 0.58 })
    .stroke({ width: 1, color: 0xFFFFFF, alpha: 0.1 })
  glow.eventMode = 'none'
  stageLayer.addChild(glow)

  const highlight = new Graphics()
    .roundRect(x + 10, y + 7, width - 20, Math.max(height * 0.32, 1), 14)
    .fill({ color: 0xFFFFFF, alpha: 0.08 })
  highlight.eventMode = 'none'
  stageLayer.addChild(highlight)

  const shadow = new Graphics()
    .roundRect(x + 12, y + height - 10, width - 24, 3, 2)
    .fill({ color: 0x020617, alpha: 0.38 })
  shadow.eventMode = 'none'
  stageLayer.addChild(shadow)

  const labelCenterX = props.model.bounds.minX + (props.model.bounds.width / 2)
  const labelCenterY = y + (height / 2)
  const accentWidth = Math.min(Math.max(width * 0.18, 56), 120)
  const accentGap = 56
  const accentLeft = new Graphics()
    .roundRect(labelCenterX - accentGap - accentWidth, labelCenterY - 1, accentWidth, 2, 1)
    .fill({ color: 0x94A3B8, alpha: 0.42 })
  accentLeft.eventMode = 'none'
  stageLayer.addChild(accentLeft)

  const accentRight = new Graphics()
    .roundRect(labelCenterX + accentGap, labelCenterY - 1, accentWidth, 2, 1)
    .fill({ color: 0x94A3B8, alpha: 0.42 })
  accentRight.eventMode = 'none'
  stageLayer.addChild(accentRight)

  const stageLabel = new Text({
    text: stage.label.toUpperCase(),
    style: {
      fill: '#F8FAFC',
      fontFamily: 'Geist, system-ui, sans-serif',
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 4,
    },
  })
  stageLabel.anchor.set(0.5)
  stageLabel.x = labelCenterX
  stageLabel.y = labelCenterY
  stageLabel.eventMode = 'none'
  stageLayer.addChild(stageLabel)
}

function drawSeats() {
  destroyChildren(seatLayer)
  if (!seatLayer) {
    return
  }

  for (const renderSeat of props.model.seats) {
    const x = -renderSeat.width / 2
    const y = -renderSeat.height / 2
    const statusStrokeColor = getHexColorNumber(renderSeat.color.stroke)
    const seat = new Container()
    const shadow = new Graphics()
      .roundRect(x + 2, y + 3, renderSeat.width, renderSeat.height, renderSeat.cornerRadius)
      .fill({ color: 0x020617, alpha: renderSeat.selected ? 0.2 : 0.12 })

    shadow.eventMode = 'none'
    seat.addChild(shadow)

    if (renderSeat.selected) {
      const selectedAura = new Graphics()
        .roundRect(x - 4, y - 4, renderSeat.width + 8, renderSeat.height + 8, renderSeat.cornerRadius + 4)
        .stroke({ width: 3, color: 0x38BDF8, alpha: 0.5 })
      selectedAura.eventMode = 'none'
      seat.addChild(selectedAura)
    }

    const marker = new Graphics()
      .roundRect(x, y, renderSeat.width, renderSeat.height, renderSeat.cornerRadius)
      .fill({ color: renderSeat.color.hexNumber })
      .stroke({ width: renderSeat.selected ? 2 : 1, color: statusStrokeColor, alpha: renderSeat.selected ? 0.55 : 0.36 })
    marker.eventMode = 'none'
    seat.addChild(marker)

    const markerText = `${renderSeat.rowLabel}${renderSeat.label}`
    const markerLabel = new Text({
      text: markerText,
      style: {
        fill: renderSeat.color.text,
        fontFamily: 'Geist, system-ui, sans-serif',
        fontSize: markerText.length > 4 ? 12 : 14,
        fontWeight: '800',
      },
    })
    markerLabel.anchor.set(0.5)
    markerLabel.eventMode = 'none'
    seat.addChild(markerLabel)

    const hoverWash = new Graphics()
      .roundRect(x, y, renderSeat.width, renderSeat.height, renderSeat.cornerRadius)
      .fill({ color: 0xFFFFFF, alpha: 0.1 })
    hoverWash.alpha = 0
    hoverWash.eventMode = 'none'
    seat.addChild(hoverWash)

    seat.x = renderSeat.x
    seat.y = renderSeat.y
    seat.hitArea = new Rectangle(x, y, renderSeat.width, renderSeat.height)
    seat.eventMode = 'static'
    seat.cursor = 'pointer'
    let isHovering = false
    seat.on('pointerover', () => {
      isHovering = true
      seat.scale.set(1.08)
      hoverWash.alpha = 1
      shadow.alpha = 1
    })
    seat.on('pointerout', () => {
      isHovering = false
      seat.scale.set(1)
      hoverWash.alpha = 0
      shadow.alpha = 1
    })
    seat.on('pointerdown', () => {
      seat.scale.set(0.98)
      hoverWash.alpha = 0.72
    })
    seat.on('pointerup', (event) => {
      if (isHovering && event.pointerType === 'mouse') {
        seat.scale.set(1.08)
        hoverWash.alpha = 1
        return
      }

      seat.scale.set(1)
      hoverWash.alpha = 0
    })
    seat.on('pointerupoutside', () => {
      seat.scale.set(1)
      hoverWash.alpha = 0
    })
    seat.on('pointertap', () => {
      if (!suppressSeatClick) {
        emit('seatClick', renderSeat)
      }
    })
    seatLayer.addChild(seat)
  }
}

function drawLabels() {
  return
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
  drawStage()
  drawSections()
  drawSeats()
  syncLabels(true)
}

function fitToModel() {
  const host = hostRef.value
  const layer = getWorldLayer()
  if (!host || !layer) {
    return
  }

  const padding = 72
  const width = Math.max(props.model.bounds.width + padding * 2, 1)
  const height = Math.max(props.model.bounds.height + padding * 2, 1)
  const nextZoom = Math.min(host.clientWidth / width, host.clientHeight / height, 2)
  zoom.value = Math.min(Math.max(nextZoom, 0.2), 4)
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
  stageLayer = createLayer()
  sectionLayer = createLayer()
  seatLayer = createLayer()
  labelLayer = createLayer()
  worldLayer.addChild(stageLayer, sectionLayer, seatLayer, labelLayer)
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
  stageLayer = null
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
