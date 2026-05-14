<script setup lang="ts">
definePageMeta({
  title: 'dashboard.page_title',
  breadcrumb: 'dashboard.breadcrumb',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <span>
    {{ $t('dashboard.placeholder') }}
  </span>
</template>
