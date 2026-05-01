<script setup lang="ts">
import AdminEventsManager from '@/components/admin/events/AdminEventsManager.vue'

definePageMeta({
  title: 'Events',
  breadcrumb: 'Events',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <AdminEventsManager />
</template>
