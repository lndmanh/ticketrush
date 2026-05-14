<template>
  <div>
    {{ $t('auth.redirecting') }}
  </div>
</template>

<script lang="ts" setup>
// auto redirect to /auth/login
useHead({
  title: 'auth.login_title',
})

onMounted(() => {
  navigateTo('/auth/login')
})

definePageMeta({
  title: 'auth.login_title',
  breadcrumb: 'auth.login_breadcrumb',
})
</script>
