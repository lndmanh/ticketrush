<script setup lang="ts">
const { data: ticketsResponse } = await useFetch('/api/tickets')
const tickets = computed(() => ticketsResponse.value?.data ?? [])

definePageMeta({
  title: 'My tickets',
  breadcrumb: 'Tickets',
  middleware: ['auth'],
})
</script>

<template>
  <main class="space-y-8 pb-16 pt-6 md:space-y-12 md:pb-24">
    <section class="space-y-4">
      <span class="section-eyebrow">
        Ticket wallet
      </span>
      <div class="space-y-3">
        <h1 class="display-title md:text-5xl">
          Your issued passes, ready whenever doors open.
        </h1>
        <p class="max-w-[40rem] text-base leading-8 text-muted-foreground">
          Every confirmed order lands here with its digital QR token and purchase metadata.
        </p>
      </div>
    </section>

    <section
      v-if="tickets.length > 0"
      class="soft-grid lg:grid-cols-2"
    >
      <NuxtLink
        v-for="ticket in tickets"
        :key="ticket.id"
        :to="`/tickets/${ticket.publicId}`"
        class="surface-shell block"
      >
        <div class="surface-core space-y-5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="section-eyebrow">
                {{ ticket.status }}
              </p>
              <h2 class="text-2xl font-semibold tracking-[-0.05em]">
                {{ ticket.event?.title || ticket.publicId }}
              </h2>
              <p class="text-sm text-muted-foreground">
                {{ ticket.attendeeEmail }}
              </p>
            </div>
            <div class="font-mono text-xs text-muted-foreground">
              {{ new Date(ticket.issuedAt).toLocaleString() }}
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <TicketSummaryMetric
              label="Ticket"
              :value="ticket.publicId"
            />
            <TicketSummaryMetric
              label="Seat"
              :value="ticket.orderItem?.seatLabel || 'GA'"
            />
            <TicketSummaryMetric
              label="Event time"
              :value="ticket.event?.startsAt ? new Date(ticket.event.startsAt).toLocaleDateString() : 'TBA'"
            />
          </div>
        </div>
      </NuxtLink>
    </section>

    <section
      v-else
      class="surface-shell"
    >
      <div class="surface-core flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow">
            Empty wallet
          </span>
          <h2 class="text-3xl font-semibold tracking-[-0.05em]">
            Your first issued ticket will appear here.
          </h2>
          <p class="max-w-[36rem] text-sm leading-7 text-muted-foreground">
            Once you confirm a checkout, TicketRush stores the QR pass, seat assignment, and event timing in this wallet automatically.
          </p>
        </div>

        <Button
          as-child
          class="rounded-full"
        >
          <NuxtLink to="/events">
            Browse events
          </NuxtLink>
        </Button>
      </div>
    </section>
  </main>
</template>
