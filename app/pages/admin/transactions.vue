<template>
  <AdminTransactionsManager />
</template>

<script setup lang="ts">
import AdminTransactionsManager from '@/components/admin/transactions/AdminTransactionsManager.vue'

definePageMeta({
  title: 'admin.transactions.title',
  breadcrumb: 'admin.transactions.breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

useSeo({
  title: $t('admin.transactions.title'),
  description: $t('admin.transactions.description'),
})
</script>
