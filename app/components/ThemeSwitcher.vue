<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue'
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

const colorMode = useColorMode()

const themeOptions = [
  {
    value: 'light' as const,
    label: $t('common.light'),
    icon: Sun,
    action: () => colorMode.preference = 'light',
  },
  {
    value: 'dark' as const,
    label: $t('common.dark'),
    icon: Moon,
    action: () => colorMode.preference = 'dark',
  },
  {
    value: 'system' as const,
    label: $t('common.system'),
    icon: Monitor,
    action: () => colorMode.preference = 'system',
  },
]
</script>

<template>
  <DropdownMenuItem
    v-for="option in themeOptions"
    :key="option.value"
    :class="[
      'flex items-center gap-2 cursor-pointer',
      colorMode.preference === option.value && 'bg-accent text-accent-foreground',
    ]"
    @click="option.action"
  >
    <component
      :is="option.icon"
      class="h-4 w-4"
    />
    {{ option.label }}
    <span
      v-if="colorMode.preference === option.value"
      class="ml-auto text-xs"
    >✓</span>
  </DropdownMenuItem>
</template>
