<script setup lang="ts">
const { data: eventsResponse } = await useFetch('/api/events')

const events = computed(() => eventsResponse.value?.data ?? [])

definePageMeta({
  title: 'Events',
  breadcrumb: 'Events',
})
</script>

<template>
  <main class="space-y-8 pb-16 pt-6 md:space-y-12 md:pb-24">
    <section class="space-y-4">
      <span class="section-eyebrow">
        Live catalog
      </span>
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-3">
          <h1 class="display-title text-balance">
            Events now selling through TicketRush.
          </h1>
          <p class="max-w-[44rem] text-base leading-8 text-muted-foreground">
            Browse reserved-seat drops, high-demand shows, and queue-protected launches from one calm storefront.
          </p>
        </div>
        <Button
          as-child
          variant="outline"
          class="rounded-full"
        >
          <NuxtLink to="/admin/events">
            Open organizer tools
          </NuxtLink>
        </Button>
      </div>
    </section>

    <section class="soft-grid lg:grid-cols-2 xl:grid-cols-3">
      <TicketEventCard
        v-for="event in events"
        :key="event.id"
        :event="event"
      />
    </section>
  </main>
</template>
