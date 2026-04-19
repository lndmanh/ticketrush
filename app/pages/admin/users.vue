<template>
  <div class="space-y-6">
    <AdminUsersManager />
  </div>
</template>

<script setup lang="ts">
import AdminUsersManager from '@/components/admin/users/AdminUsersManager.vue'

definePageMeta({
  title: 'Users Management',
  breadcrumb: 'Users',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>
