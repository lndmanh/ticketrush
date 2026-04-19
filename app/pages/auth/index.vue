<template>
  <div>
    Navigating...
  </div>
</template>

<script lang="ts" setup>
// auto redirect to /auth/login
useHead({
  title: 'Login',
})

onMounted(() => {
  navigateTo('/auth/login')
})

definePageMeta({
  title: 'Login',
  breadcrumb: 'Login',
})
</script>
