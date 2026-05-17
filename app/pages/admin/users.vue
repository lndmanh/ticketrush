<template>
  <div class="space-y-6">
    <AdminUsersManager />
  </div>
</template>

<script setup lang="ts">
import AdminUsersManager from '@/components/admin/users/AdminUsersManager.vue'

definePageMeta({
  title: 'admin.users.title',
  breadcrumb: 'admin.users_breadcrumb',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

const { t } = useI18n()

useSeo({
  title: computed(() => t('admin.users.title')),
  description: computed(() => t('admin.users.desc')),
  type: 'website',
})
</script>
