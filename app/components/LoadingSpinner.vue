<template>
  <div
    class="flex items-center justify-center"
    :class="containerClass"
  >
    <div class="flex flex-col items-center gap-3">
      <Loader2 :class="spinnerClass" />
      <p
        v-if="text"
        class="text-sm text-muted-foreground animate-pulse"
      >
        {{ text }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullHeight?: boolean
}>(), {
  size: 'md',
  fullHeight: false,
})

const containerClass = computed(() => {
  const classes = []

  if (props.fullHeight) {
    classes.push('h-64')
  }
  else {
    classes.push('py-8')
  }

  return classes.join(' ')
})

const spinnerClass = computed(() => {
  const classes = ['animate-spin']

  switch (props.size) {
    case 'sm':
      classes.push('h-4 w-4')
      break
    case 'lg':
      classes.push('h-8 w-8')
      break
    default:
      classes.push('h-6 w-6')
  }

  return classes.join(' ')
})
</script>
