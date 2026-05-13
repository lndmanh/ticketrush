<script setup lang="ts">
export type TicketStatusFilter = 'all' | 'success' | 'processing' | 'cancelled'

defineProps<{
  modelValue: TicketStatusFilter
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: TicketStatusFilter): void
}>()

const filters: { value: TicketStatusFilter, label: string }[] = [
  { value: 'all', label: 'tickets.filter_status_all' },
  { value: 'success', label: 'tickets.filter_status_success' },
  { value: 'processing', label: 'tickets.filter_status_processing' },
  { value: 'cancelled', label: 'tickets.filter_status_cancelled' },
]
</script>

<template>
  <section class="rounded-[1.5rem] border border-border/70 bg-[#151711]/80 p-2 shadow-inner shadow-white/5 backdrop-blur">
    <div class="grid gap-2 sm:grid-cols-4">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="rounded-full px-4 py-2.5 text-sm font-extrabold tracking-tight transition-all duration-300"
        :class="modelValue === filter.value
          ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-500/25'
          : 'bg-[#303128] text-foreground/85 hover:bg-[#3a3b31] hover:text-foreground'"
        @click="emit('update:modelValue', filter.value)"
      >
        {{ $t(filter.label) }}
      </button>
    </div>
  </section>
</template>
