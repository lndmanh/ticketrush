<script setup lang="ts">
import AdminEventsManager from '@/components/admin/events/AdminEventsManager.vue'

definePageMeta({
  title: 'admin.events.title',
  breadcrumb: 'admin.events.title',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <AdminEventsManager />
</template>
