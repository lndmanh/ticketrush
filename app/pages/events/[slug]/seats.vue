<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'

interface EventSessionRedirectResponse {
  event: {
    slug: string
  } | null
  sessions: Array<{
    publicId: string
    startsAt: string | Date
  }>
}

const route = useRoute()
const slug = computed(() => route.params.slug.toString())

const { data: detailResponse } = await useFetch<{ data: EventSessionRedirectResponse }>(() => `/api/events/${slug.value}`)

const firstSession = computed(() => {
  const sessions = detailResponse.value?.data.sessions ?? []
  return [...sessions].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })[0]
})

watchEffect(() => {
  if (!firstSession.value) {
    return
  }

  navigateTo(`/events/${slug.value}/sessions/${firstSession.value.publicId}/seats`, { replace: true })
})

definePageMeta({
  title: 'Choose seats',
  breadcrumb: 'Seat selection',
  middleware: ['auth'],
})
</script>

<template>
  <main class="flex min-h-[60dvh] items-center justify-center py-12">
    <Card class="w-full max-w-xl">
      <CardContent class="space-y-3 p-8 text-center">
        <span class="section-eyebrow mx-auto">
          Finding session
        </span>
        <h1 class="text-3xl font-semibold tracking-[-0.05em]">
          Opening the first available session.
        </h1>
        <p class="text-sm leading-7 text-muted-foreground">
          Seat selection now happens per session so your ticket matches the right date and time.
        </p>
      </CardContent>
    </Card>
  </main>
</template>
