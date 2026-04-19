<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    leave-active-class="transition-all duration-300 ease-in"
    enter-from-class="opacity-0 translate-y-8 scale-75"
    leave-to-class="opacity-0 translate-y-8 scale-75"
  >
    <div
      v-if="showBackToTop"
      class="fixed bottom-8 right-8 z-50 flex items-center justify-center"
    >
      <button
        class="group relative flex h-12 w-12 items-center justify-center rounded-full bg-muted/10 backdrop-blur-md shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none border border-border/50 cursor-pointer"
        aria-label="Scroll to top"
        @click="scrollToTop"
      >
        <!-- Progress Ring SVG -->
        <svg
          class="absolute inset-0 h-full w-full -rotate-90 transform"
          viewBox="0 0 36 36"
        >
          <!-- Track -->
          <path
            class="text-muted/20"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          />
          <!-- Progress -->
          <path
            class="text-primary transition-all duration-100 ease-out"
            :stroke-dasharray="`${scrollProgress}, 100`"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
          />
        </svg>

        <ArrowUp class="h-5 w-5 text-foreground transition-transform duration-300 group-hover:-translate-y-0.5" />
      </button>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { ArrowUp } from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'

const showBackToTop = ref(false)
const scrollProgress = ref(0)
let ticking = false

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const updateProgress = () => {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight

  // Calculate progress percentage (0-100)
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
  scrollProgress.value = Math.min(100, Math.max(0, progress))

  showBackToTop.value = scrollTop > 300
  ticking = false
}

const handleScroll = () => {
  if (!ticking) {
    window.requestAnimationFrame(updateProgress)
    ticking = true
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  updateProgress() // Initial check
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
