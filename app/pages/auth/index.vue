<script lang="ts" setup>
// auto redirect to /auth/login
const { t } = useI18n()

useSeo({
  title: computed(() => t('auth.login_title')),
  description: computed(() => t('auth.login_description')),
  type: 'website',
})

onMounted(() => {
  navigateTo('/auth/login')
})

definePageMeta({
  title: 'auth.login_title',
  breadcrumb: 'auth.login_breadcrumb',
})
</script>

<template>
  <div>
    Navigating...
  </div>
</template>
