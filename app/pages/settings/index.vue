<script setup lang="ts">
definePageMeta({
  title: 'common.settings',
  breadcrumb: 'common.settings',
  middleware: ['auth'],
})

await navigateTo('/settings/profile', { replace: true })
</script>
