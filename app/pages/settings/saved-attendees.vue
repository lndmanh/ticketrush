<script setup lang="ts">
import SavedAttendeesManager from '~/components/saved-attendees/SavedAttendeesManager.vue'

definePageMeta({
  title: 'settings.saved_attendees_title',
  breadcrumb: 'settings.saved_attendees_title',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <SavedAttendeesManager />
</template>
