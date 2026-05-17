<script setup lang="ts">
definePageMeta({
  title: 'settings.page_title',
  breadcrumb: 'settings.breadcrumb',
  middleware: ['auth'],
})

const { t } = useI18n()

useSeo({
  title: computed(() => t('settings.page_title')),
  description: computed(() => t('settings.page_description')),
  type: 'website',
})

await navigateTo('/settings/profile', { replace: true })
</script>
