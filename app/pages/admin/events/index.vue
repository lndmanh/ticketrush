<script setup lang="ts">
import AdminEventsManager from '@/components/admin/events/AdminEventsManager.vue'

definePageMeta({
  title: 'admin.events.title',
  breadcrumb: 'admin.events_breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

const { t } = useI18n()

useSeo({
  title: computed(() => t('admin.events.title')),
  description: computed(() => t('admin.events.desc')),
  type: 'website',
})
</script>

<template>
  <AdminEventsManager />
</template>
