<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="alert-box-content"
    :class="cn('flex flex-1 flex-col gap-1', props.class)"
  >
    <slot />
  </div>
</template>
