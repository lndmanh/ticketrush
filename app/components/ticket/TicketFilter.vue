<script setup lang="ts">
import { CalendarRange } from '@lucide/vue'

export type TicketDateRangeFilter = 'last_24h' | 'last_7_days' | 'last_30_days' | 'all_time'

const props = defineProps<{
  selectedRange: TicketDateRangeFilter
  totalTickets: number
  filteredTickets: number
}>()

const dateRangeOptions: { value: TicketDateRangeFilter, label: string }[] = [
  { value: 'last_24h', label: 'tickets.filter_range_last_24h' },
  { value: 'last_7_days', label: 'tickets.filter_range_last_7_days' },
  { value: 'last_30_days', label: 'tickets.filter_range_last_30_days' },
  { value: 'all_time', label: 'tickets.filter_range_all_time' },
]

const emit = defineEmits<{
  (event: 'update:selectedRange', value: TicketDateRangeFilter): void
}>()

const selectedRangeModel = computed({
  get: () => props.selectedRange,
  set: (value: TicketDateRangeFilter) => emit('update:selectedRange', value),
})
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
        <Select v-model="selectedRangeModel">
          <SelectTrigger
            id="ticket-date-filter"
            class="h-10 rounded-full border-border/70 bg-background/80 pl-9 text-sm font-semibold text-foreground shadow-inner shadow-black/10 focus:border-primary/50 focus:ring-primary/20"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem
              v-for="option in dateRangeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ $t(option.label) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </section>
</template>
