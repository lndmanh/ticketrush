<script setup lang="ts">
type TicketTimeFilter = '24h' | '7d' | '30d' | 'all'

defineProps<{
  selectedRange: TicketTimeFilter
  totalTickets: number
  filteredTickets: number
}>()

const emit = defineEmits<{
  (event: 'update:selectedRange', value: TicketTimeFilter): void
}>()

const rangeOptions: Array<{ value: TicketTimeFilter, labelKey: string }> = [
  { value: '24h', labelKey: 'ticket_filter.range_24h' },
  { value: '7d', labelKey: 'ticket_filter.range_7d' },
  { value: '30d', labelKey: 'ticket_filter.range_30d' },
  { value: 'all', labelKey: 'ticket_filter.range_all' },
]

function isTicketTimeFilter(value: string): value is TicketTimeFilter {
  return value === '24h' || value === '7d' || value === '30d' || value === 'all'
}

function updateSelectedRange(value: string) {
  if (!isTicketTimeFilter(value)) {
    return
  }

  emit('update:selectedRange', value)
}
</script>

<template>
  <section class="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-card/72 p-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
    <div class="space-y-1">
      <p class="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
        {{ $t('ticket_filter.title') }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ $t('ticket_filter.showing', { filtered: filteredTickets, total: totalTickets }) }}
      </p>
    </div>

    <div class="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4">
      <Label class="shrink-0 text-sm font-semibold text-muted-foreground">
        {{ $t('ticket_filter.date_label') }}
      </Label>
      <div class="w-full sm:w-60">
        <Select
          :model-value="selectedRange"
          @update:model-value="updateSelectedRange"
        >
          <SelectTrigger class="h-10 rounded-full border-border/70 bg-background/80 px-4 text-sm font-semibold text-foreground shadow-inner shadow-black/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in rangeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ $t(option.labelKey) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </section>
</template>
