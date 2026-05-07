<script setup lang="ts">
import QRCode from 'qrcode.vue'
import { CalendarRange, Mail, MapPin, Ticket, UserRound } from '@lucide/vue'

const route = useRoute()
const ticketId = computed(() => route.params.id.toString())
const { data: ticketResponse } = await useFetch(() => `/api/tickets/${ticketId.value}`)

const ticketBundle = computed(() => ticketResponse.value?.data ?? null)

const ticketSessionStartsAt = computed(() => ticketBundle.value?.eventSession?.startsAt ?? null)
const eventTitle = computed(() => ticketBundle.value?.event?.title || ticketBundle.value?.ticket.publicId || 'Ticket')
const seatLabel = computed(() => ticketBundle.value?.orderItem?.seatLabel || 'GA')
const sectionLabel = computed(() => ticketBundle.value?.orderItem?.sectionLabel || 'General admission')
const rowLabel = computed(() => ticketBundle.value?.orderItem?.rowLabel || 'Open floor')
const issuedAtLabel = computed(() => {
  const issuedAt = ticketBundle.value?.ticket.issuedAt
  if (!issuedAt) {
    return '—'
  }

  return new Date(issuedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})
const sessionTimeLabel = computed(() => {
  if (!ticketSessionStartsAt.value) {
    return 'Time to be announced'
  }

  return new Date(ticketSessionStartsAt.value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})
const orderTotalLabel = computed(() => {
  const amountCents = ticketBundle.value?.order?.amountCents
  if (typeof amountCents !== 'number') {
    return '—'
  }

  return `${Intl.NumberFormat('en-US').format(amountCents / 100)} VND`
})

definePageMeta({
  title: 'Ticket detail',
  breadcrumb: 'Ticket',
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="ticketBundle"
    class="mx-auto w-full max-w-6xl space-y-6 pb-8 pt-6"
  >
    <section class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="max-w-3xl space-y-3">
        <Badge
          variant="secondary"
          class="w-fit"
        >
          {{ ticketBundle.ticket.status }} pass
        </Badge>
        <h1 class="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {{ eventTitle }}
        </h1>
        <p class="max-w-[60ch] text-sm leading-7 text-muted-foreground">
          Keep this QR ready at the door. The essentials below match the pass details scanned by the venue team.
        </p>
      </div>

      <Button
        as-child
        variant="outline"
      >
        <NuxtLink to="/tickets">
          Back to wallet
        </NuxtLink>
      </Button>
    </section>

    <section class="grid gap-6 lg:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.15fr)] lg:items-start">
      <Card class="overflow-hidden py-0">
        <CardContent class="space-y-6 p-6 text-center md:p-8">
          <div class="space-y-2">
            <div class="mx-auto flex size-10 items-center justify-center rounded-full border bg-muted/40">
              <Ticket class="size-4 text-muted-foreground" />
            </div>
            <div>
              <p class="font-mono text-sm text-muted-foreground">
                {{ ticketBundle.ticket.publicId }}
              </p>
              <h2 class="mt-1 text-xl font-semibold tracking-tight">
                Digital entry pass
              </h2>
            </div>
          </div>

          <div class="mx-auto w-full max-w-[17rem] rounded-2xl border bg-background p-4 shadow-sm">
            <QRCode
              :value="ticketBundle.ticket.qrToken"
              :size="220"
              level="H"
              class="mx-auto aspect-square w-full rounded-xl bg-white p-2"
            />
          </div>

          <div class="space-y-2 rounded-lg border bg-muted/30 p-3 text-left">
            <p class="text-xs font-medium text-muted-foreground">
              QR token
            </p>
            <p class="break-all font-mono text-xs leading-5 text-muted-foreground">
              {{ ticketBundle.ticket.qrToken }}
            </p>
          </div>
        </CardContent>
      </Card>

      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Entry details
            </CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
            <div class="flex gap-3 rounded-lg border bg-muted/20 p-4">
              <UserRound class="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p class="text-xs text-muted-foreground">
                  Attendee
                </p>
                <p class="font-medium">
                  {{ ticketBundle.ticket.attendeeName }}
                </p>
              </div>
            </div>
            <div class="flex gap-3 rounded-lg border bg-muted/20 p-4">
              <Mail class="mt-0.5 size-4 text-muted-foreground" />
              <div class="min-w-0">
                <p class="text-xs text-muted-foreground">
                  Email
                </p>
                <p class="truncate font-medium">
                  {{ ticketBundle.ticket.attendeeEmail }}
                </p>
              </div>
            </div>
            <div class="flex gap-3 rounded-lg border bg-muted/20 p-4">
              <MapPin class="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p class="text-xs text-muted-foreground">
                  Seat
                </p>
                <p class="font-medium">
                  {{ sectionLabel }} · {{ rowLabel }} · {{ seatLabel }}
                </p>
              </div>
            </div>
            <div class="flex gap-3 rounded-lg border bg-muted/20 p-4">
              <CalendarRange class="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p class="text-xs text-muted-foreground">
                  Session
                </p>
                <p class="font-medium">
                  {{ sessionTimeLabel }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Order summary
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 text-sm">
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <p class="text-xs text-muted-foreground">
                  Issued
                </p>
                <p class="font-medium">
                  {{ issuedAtLabel }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">
                  Status
                </p>
                <p class="font-medium">
                  {{ ticketBundle.ticket.status }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">
                  Total
                </p>
                <p class="font-medium">
                  {{ orderTotalLabel }}
                </p>
              </div>
            </div>

            <div class="rounded-lg border bg-muted/20 p-4 text-muted-foreground">
              <p class="font-medium text-foreground">
                Admission notes
              </p>
              <p class="mt-2 leading-7">
                Bring this QR code and the attendee email used during checkout. Venue staff may ask you to show both before entry.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </main>

  <main
    v-else
    class="flex min-h-[60dvh] items-center justify-center py-12"
  >
    <Card class="w-full max-w-2xl">
      <CardContent class="space-y-6 p-6 md:p-8">
        <div class="space-y-3">
          <Badge
            variant="secondary"
            class="w-fit"
          >
            Ticket missing
          </Badge>
          <h2 class="text-3xl font-semibold tracking-tight">
            We could not find that ticket.
          </h2>
          <p class="max-w-[36rem] text-sm leading-7 text-muted-foreground">
            The pass may have been removed, or this link may not belong to your account.
          </p>
        </div>

        <Button as-child>
          <NuxtLink to="/tickets">
            Return to wallet
          </NuxtLink>
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
