<template>
  <div :class="cn('mx-auto w-full max-w-screen-2xl px-6 lg:px-10 pt-3 pb-6', className)">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  className?: string
}>()
</script>
