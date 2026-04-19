<template>
  <Card class="divide-y overflow-hidden py-0 gap-0 rounded-lg bg-card shadow-xs [&:not(:first-child)]:mt-5">
    <div
      v-for="(slot, i) in $slots.default?.() ?? []"
      :key="i"
    >
      <component
        :is="slot"
        :in-stack="true"
      />
    </div>
  </Card>
</template>

<script setup lang="ts">
defineSlots()
</script>
