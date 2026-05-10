<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="alert-box-title"
    :class="cn('font-medium leading-snug tracking-tight', props.class)"
  >
    <slot />
  </div>
</template>
