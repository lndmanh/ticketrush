<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})

await navigateTo('/settings/account', { replace: true })
</script>
