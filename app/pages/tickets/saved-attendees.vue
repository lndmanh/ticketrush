<script setup lang="ts">
import SavedAttendeesManager from '~/components/saved-attendees/SavedAttendeesManager.vue'

definePageMeta({
  title: 'Saved Attendees',
  breadcrumb: 'Saved Attendees',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <SavedAttendeesManager />
</template>
