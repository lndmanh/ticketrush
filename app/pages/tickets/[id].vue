<script setup lang="ts">
const route = useRoute()
const ticketId = computed(() => route.params.id.toString())
const { data: ticketResponse } = await useFetch(() => `/api/tickets/${ticketId.value}`)

const ticketBundle = computed(() => ticketResponse.value?.data ?? null)

const ticketSessionStartsAt = computed(() => ticketBundle.value?.eventSession?.startsAt ?? null)

definePageMeta({
  title: 'Ticket detail',
  breadcrumb: 'Ticket',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="ticketBundle"
    class="space-y-8 pb-16 pt-6 md:space-y-12 md:pb-24"
  >
    <section class="grid gap-6 xl:grid-cols-[1fr_0.92fr] xl:items-end">
      <div class="space-y-4">
        <span class="section-eyebrow">
          Ticket detail
        </span>
        <div class="space-y-3">
          <h1 class="display-title md:text-5xl">
            {{ ticketBundle.event?.title || ticketBundle.ticket.publicId }}
          </h1>
          <p class="max-w-[42rem] text-base leading-8 text-muted-foreground">
            Your digital pass is ready for entry. Keep this QR available at the door and review the event details below before arrival.
          </p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <TicketSummaryMetric
          label="Status"
          :value="ticketBundle.ticket.status"
        />
        <TicketSummaryMetric
          label="Seat"
          :value="ticketBundle.orderItem?.seatLabel || 'GA'"
        />
        <TicketSummaryMetric
          label="Issued"
          :value="new Date(ticketBundle.ticket.issuedAt).toLocaleDateString()"
        />
      </div>
    </section>

    <section class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <TicketQrCard
        :payload="ticketBundle.ticket.qrToken"
        :title="ticketBundle.ticket.publicId"
        :subtitle="ticketBundle.ticket.attendeeEmail"
      />

      <div class="surface-shell">
        <div class="surface-core space-y-6">
          <span class="section-eyebrow">
            Ticket details
          </span>
          <div class="grid gap-4 sm:grid-cols-2">
            <TicketSummaryMetric
              label="Attendee"
              :value="ticketBundle.ticket.attendeeName"
            />
            <TicketSummaryMetric
              label="Event"
              :value="ticketBundle.event?.title || 'Unknown'"
            />
            <TicketSummaryMetric
              label="Seat"
              :value="ticketBundle.orderItem?.seatLabel || 'GA'"
            />
            <TicketSummaryMetric
              label="Section"
              :value="ticketBundle.orderItem?.sectionLabel || 'General admission'"
            />
            <TicketSummaryMetric
              label="Row"
              :value="ticketBundle.orderItem?.rowLabel || 'Open floor'"
            />
            <TicketSummaryMetric
              label="Order total"
              :value="ticketBundle.order ? Intl.NumberFormat('en-US').format(ticketBundle.order.amountCents / 100) + ' VND' : '—'"
            />
          </div>

          <div class="rounded-[1.5rem] border border-black/5 bg-white/70 px-5 py-5 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
            <p class="font-medium text-foreground">
              Admission notes
            </p>
            <p class="mt-3 leading-7">
              {{ ticketSessionStartsAt ? `Doors open around ${new Date(ticketSessionStartsAt).toLocaleString()}.` : 'Doors open time will be announced by the organizer.' }}
              Bring this QR code and the attendee email used during checkout.
            </p>
          </div>

          <div class="flex flex-col gap-3 md:flex-row">
            <Button
              as-child
              class="rounded-full"
            >
              <NuxtLink to="/tickets">
                Back to wallet
              </NuxtLink>
            </Button>
            <Button
              as-child
              variant="outline"
              class="rounded-full"
            >
              <NuxtLink to="/events">
                Browse more events
              </NuxtLink>
            </Button>
          </div>
        </div>
      </div>
    </section>
  </main>

  <main
    v-else
    class="flex min-h-[60dvh] items-center justify-center py-12"
  >
    <section class="surface-shell w-full max-w-3xl">
      <div class="surface-core flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div class="space-y-3">
          <span class="section-eyebrow">
            Ticket missing
          </span>
          <h2 class="text-3xl font-semibold tracking-[-0.05em]">
            We could not find that ticket.
          </h2>
          <p class="max-w-[36rem] text-sm leading-7 text-muted-foreground">
            The pass may have been removed, or this link may not belong to your account.
          </p>
        </div>

        <Button
          as-child
          class="rounded-full"
        >
          <NuxtLink to="/tickets">
            Return to wallet
          </NuxtLink>
        </Button>
      </div>
    </section>
  </main>
</template>
