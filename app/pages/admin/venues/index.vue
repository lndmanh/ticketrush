<script setup lang="ts">
import AdminVenuesManager from '@/components/admin/venues/AdminVenuesManager.vue'

definePageMeta({
  title: 'admin.venues.title',
  breadcrumb: 'nav.venues',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

const { t } = useI18n()

useSeo({
  title: computed(() => t('admin.venues.title')),
  description: computed(() => t('admin.venues.desc')),
  type: 'website',
})
</script>

<template>
  <AdminVenuesManager />
</template>
