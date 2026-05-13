<script setup lang="ts">
import { CalendarRange, X } from '@lucide/vue'

defineProps<{
  selectedDate: string
  totalTickets: number
  filteredTickets: number
}>()

const emit = defineEmits<{
  (event: 'update:selectedDate', value: string): void
}>()

function updateSelectedDate(value: string | number) {
  emit('update:selectedDate', String(value))
}

function clearSelectedDate() {
  emit('update:selectedDate', '')
}
</script>

<template>
  <section class="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-card/72 p-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
    <div class="space-y-1">
      <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
        {{ $t('tickets.filter_eyebrow') }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ $t('tickets.filter_count', { filtered: filteredTickets, total: totalTickets }) }}
      </p>
    </div>

    <div class="ml-auto flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
      <label
        for="ticket-date-filter"
        class="text-xs font-medium text-muted-foreground"
      >
        {{ $t('tickets.filter_by_date') }}
      </label>
      <div class="relative min-w-56">
        <CalendarRange class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
        <Input
          id="ticket-date-filter"
          :model-value="selectedDate"
          type="date"
          class="h-10 rounded-full border-border/70 bg-background/80 pl-9 pr-10 text-sm text-foreground shadow-inner shadow-black/10 [color-scheme:dark] focus-visible:border-primary/50 focus-visible:ring-primary/20"
          @update:model-value="updateSelectedDate"
        />
        <button
          v-if="selectedDate"
          type="button"
          class="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          :aria-label="$t('tickets.clear_date_filter')"
          @click="clearSelectedDate"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </div>
  </section>
</template>
