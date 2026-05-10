<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="alert-box-actions"
    :class="cn('flex items-center gap-2 shrink-0', props.class)"
  >
    <slot />
  </div>
</template>
