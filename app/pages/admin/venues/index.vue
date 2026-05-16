<script setup lang="ts">
import AdminVenuesManager from '@/components/admin/venues/AdminVenuesManager.vue'

definePageMeta({
  title: 'nav.venues',
  breadcrumb: 'nav.venues',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <AdminVenuesManager />
</template>
