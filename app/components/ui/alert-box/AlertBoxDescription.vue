<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <p
    data-slot="alert-box-description"
    :class="cn('text-sm text-muted-foreground leading-relaxed', props.class)"
  >
    <slot />
  </p>
</template>
