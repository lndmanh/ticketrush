<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    slotClass?: HTMLAttributes['class']
    gradientSize?: number
    gradientColor?: string
    gradientOpacity?: number
    hoverPadding?: number
  }>(),
  {
    class: '',
    slotClass: '',
    gradientSize: 200,
    gradientColor: '#262626',
    gradientOpacity: 0.8,
    hoverPadding: 40,
  },
)

const cardRef = ref<HTMLElement>()
const mouseX = ref(-props.gradientSize * 10)
const mouseY = ref(-props.gradientSize * 10)
const isHovering = ref(false)

function handleMouseMove(e: MouseEvent) {
  if (!cardRef.value) return
  // Coordinates relative to the inner visual card, not the extended zone
  const rect = cardRef.value.getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
  isHovering.value = true
}

function handleMouseLeave() {
  // Don't reset coordinates — gradient fades at last position via CSS transition
  isHovering.value = false
}

onMounted(() => {
  mouseX.value = -props.gradientSize * 10
  mouseY.value = -props.gradientSize * 10
})

const backgroundStyle = computed(() => {
  return `radial-gradient(
    circle at ${mouseX.value}px ${mouseY.value}px,
    ${props.gradientColor} 0%,
    rgba(0, 0, 0, 0) 70%
  )`
})
</script>

<template>
  <!-- Outer: mouse tracking zone, z-0 creates stacking context per card -->
  <div
    class="group/spotlight relative z-0 size-full"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- Invisible hit-zone extension — expands mouse tracking beyond card edges -->
    <div
      class="absolute"
      :style="{ inset: `-${hoverPadding}px` }"
    />
    <!-- Visual card -->
    <div
      ref="cardRef"
      class="relative z-[1] size-full overflow-hidden rounded-3xl"
      :class="[$props.class]"
    >
      <div
        class="relative z-10 h-full"
        :class="[props.slotClass]"
      >
        <slot />
      </div>
      <div
        class="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300"
        :style="{
          background: backgroundStyle,
          opacity: isHovering ? gradientOpacity : 0,
        }"
      />
    </div>
  </div>
</template>
