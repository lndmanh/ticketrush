<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <div class="dashboard-stat h-full">
    <div class="flex h-full flex-col justify-between gap-5">
      <span class="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {{ label }}
      </span>
      <div class="space-y-2">
        <p class="metric-value">
          {{ value }}
        </p>
        <p
          v-if="hint"
          class="max-w-[34ch] text-sm leading-6 text-muted-foreground"
        >
          {{ hint }}
        </p>
      </div>
    </div>
  </div>
</template>
