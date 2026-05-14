<script setup lang="ts">
type TicketStatusFilter = 'all' | 'success' | 'processing' | 'cancelled'

const model = defineModel<TicketStatusFilter>({ required: true })

const statusTabs: Array<{ value: TicketStatusFilter, label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'success', label: 'Thành công' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'cancelled', label: 'Đã hủy' },
]
</script>

<template>
  <div class="grid gap-2 rounded-[1.35rem] border border-border/70 bg-card/72 p-2 shadow-sm backdrop-blur sm:grid-cols-4">
    <button
      v-for="tab in statusTabs"
      :key="tab.value"
      type="button"
      class="rounded-full px-4 py-3 text-sm font-semibold transition-all duration-300"
      :class="model === tab.value ? 'bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:text-emerald-950' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
      @click="model = tab.value"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
