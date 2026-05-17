<template>
  <div class="space-y-6">
    <AdminUsersManager />
  </div>
</template>

<script setup lang="ts">
import AdminUsersManager from '@/components/admin/users/AdminUsersManager.vue'

definePageMeta({
  title: 'admin.users.title',
  breadcrumb: 'admin.users.title',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>
