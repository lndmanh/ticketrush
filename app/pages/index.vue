<script setup lang="ts">
const { data: eventsResponse } = await useFetch('/api/events')

const events = computed(() => eventsResponse.value?.data?.slice(0, 3) ?? [])
</script>

<template>
  <main class="space-y-10 pb-16 pt-6 md:space-y-16 md:pb-24 md:pt-10">
    <section class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
      <div class="space-y-6 px-1 md:px-0">
        <span class="section-eyebrow">
          TicketRush live commerce
        </span>
        <div class="space-y-5">
          <h1 class="display-title max-w-4xl text-balance">
            A softer, faster ticketing experience for sold-out nights.
          </h1>
          <p class="max-w-[42rem] text-base leading-8 text-muted-foreground md:text-lg">
            Built for event teams who need flash-sale resilience, beautifully mapped seating, and a checkout flow that feels calm even when demand spikes.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <Button
            as-child
            size="lg"
            class="rounded-full px-6"
          >
            <NuxtLink to="/events">
              Browse events
            </NuxtLink>
          </Button>
          <Button
            as-child
            variant="outline"
            size="lg"
            class="rounded-full px-6"
          >
            <NuxtLink to="/admin">
              Organizer console
            </NuxtLink>
          </Button>
        </div>
      </div>

      <div class="soft-grid md:grid-cols-2">
        <TicketSummaryMetric
          label="Peak ready"
          value="10 min"
          hint="Seat locks expire automatically to keep inventory moving."
        />
        <TicketSummaryMetric
          label="Waiting room"
          value="Batch admit"
          hint="Queue windows meter access before customers touch inventory."
        />
        <TicketSummaryMetric
          label="Operator view"
          value="Live sales"
          hint="Admin dashboards track occupancy, revenue, and audience mix."
        />
        <TicketSummaryMetric
          label="Digital delivery"
          value="QR tickets"
          hint="Every order turns into issued passes instantly after confirmation."
        />
      </div>
    </section>

    <section class="space-y-6">
      <div class="flex items-end justify-between gap-4">
        <div class="space-y-3">
          <span class="section-eyebrow">
            Featured releases
          </span>
          <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
            Sale windows worth being early for.
          </h2>
        </div>

        <Button
          as-child
          variant="ghost"
          class="rounded-full"
        >
          <NuxtLink to="/events">
            View all
          </NuxtLink>
        </Button>
      </div>

      <div class="soft-grid lg:grid-cols-3">
        <TicketEventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
        />
      </div>
    </section>
  </main>
</template>
