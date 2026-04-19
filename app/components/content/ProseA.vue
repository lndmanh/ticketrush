<template>
  <NuxtLinkLocale
    :to="href"
    :target="target"
    :external="external"
    class="font-semibold underline underline-offset-4"
  >
    <slot />
  </NuxtLinkLocale>
</template>

<script setup lang="ts">
import type { Target } from '~~/types'

const {
  href = '',
  external = false,
} = defineProps<{
  href?: string
  target?: Target
  external?: boolean
}>()
</script>
