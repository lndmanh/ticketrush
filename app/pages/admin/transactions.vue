<template>
  <AdminTransactionsManager />
</template>

<script setup lang="ts">
import AdminTransactionsManager from '@/components/admin/transactions/AdminTransactionsManager.vue'

const { t } = useI18n()

definePageMeta({
  title: 'admin.transactions.title',
  breadcrumb: 'admin.transactions.breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

useSeo({
  title: computed(() => t('admin.transactions.title')),
  description: computed(() => t('admin.transactions.desc')),
  type: 'website',
})
</script>
