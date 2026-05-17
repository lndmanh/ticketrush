<script setup lang="ts">
import 'lenis/dist/lenis.css'

import { VueLenis } from 'lenis/vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

defineOptions({
  inheritAttrs: false,
})

const lenisRef = ref()

// GSAP integration
onMounted(() => {
  gsap.registerPlugin(ScrollTrigger)
})

watchEffect((onInvalidate) => {
  if (!lenisRef.value?.lenis) return
  // Update ScrollTrigger on scroll
  lenisRef.value.lenis.on('scroll', ScrollTrigger.update)

  // Add Lenis raf to GSAP's ticker for smooth animation
  function update(time: number) {
    lenisRef.value?.lenis?.raf(time * 1000)
  }
  gsap.ticker.add(update)

  // Disable lag smoothing for better performance with Lenis
  gsap.ticker.lagSmoothing(0)

  // Cleanup on invalidate
  onInvalidate(() => {
    gsap.ticker.remove(update)
  })
})
</script>

<template>
  <VueLenis
    ref="lenisRef"
    root
    :options="{
      autoRaf: false,
      prevent: (node: Element) => node.closest('[role=dialog], [data-lenis-prevent]') !== null,
    }"
  >
    <slot />
  </VueLenis>
</template>
