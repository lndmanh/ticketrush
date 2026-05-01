<script setup lang="ts">
import AdminVenuesManager from '@/components/admin/venues/AdminVenuesManager.vue'

definePageMeta({
  title: 'Venues',
  breadcrumb: 'Venues',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <AdminVenuesManager />
</template>
