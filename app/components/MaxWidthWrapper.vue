<template>
  <div :class="cn('mx-auto w-full px-4 pt-3 pb-6 sm:px-6 lg:px-10', className)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  className?: string
}>()
</script>
