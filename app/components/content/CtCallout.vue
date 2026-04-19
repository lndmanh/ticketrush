<template>
  <Alert
    :icon
    :to
    :target
  >
    <slot />
  </Alert>
</template>

<script setup lang="ts">
import type { Target } from '~~/types'

defineProps<{
  icon?: string
  to?: string
  target?: Target
}>()
</script>
