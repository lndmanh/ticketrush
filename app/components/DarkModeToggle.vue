<template>
  <Button
    variant="ghost"
    size="icon"
    @click="toggleDark"
  >
    <SunIcon
      class="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
      :size="18"
    />
    <MoonIcon
      class="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
      :size="18"
    />
    <span class="sr-only">Toggle theme</span>
  </Button>
</template>

<script setup lang="ts">
import { SunIcon, MoonIcon } from '@lucide/vue'

const colorMode = useColorMode()
function toggleDark() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>
