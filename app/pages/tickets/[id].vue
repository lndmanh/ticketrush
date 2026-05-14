<script setup lang="ts">
import QRCode from 'qrcode.vue'
import { CalendarRange, Mail, MapPin, Ticket, UserRound } from '@lucide/vue'
import type { ApiResponse } from '~~/types/api'
import type { TicketDetailData } from '~~/types/ticketing'
import { getDisplayDateLocale } from '@/lib/localizedEvents'

const route = useRoute()
const ticketId = computed(() => route.params.id.toString())
const { locale, t } = useI18n()
const localePath = useLocalePath()
const { data: ticketResponse } = await useAPI<ApiResponse<TicketDetailData>>(() => `/api/tickets/${ticketId.value}`, {
  query: computed(() => ({ locale: locale.value })),
})

const ticketBundle = computed(() => ticketResponse.value?.data ?? null)

const ticketSessionStartsAt = computed(() => ticketBundle.value?.eventSession?.startsAt ?? null)
const eventTitle = computed(() => {
  const event = ticketBundle.value?.event
  return event ? event.title : ticketBundle.value?.ticket.publicId || t('tickets.ticket_label')
})
const seatLabel = computed(() => ticketBundle.value?.orderItem?.seatLabel || t('tickets.ga'))
const sectionLabel = computed(() => {
  const section = ticketBundle.value?.orderItem?.sectionLabel
  return section || t('tickets.detail_general_admission')
})
const rowLabel = computed(() => ticketBundle.value?.orderItem?.rowLabel || t('tickets.detail_open_floor'))
const issuedAtLabel = computed(() => {
  const issuedAt = ticketBundle.value?.ticket.issuedAt
  if (!issuedAt) {
    return t('tickets.detail_unknown')
  }

  return new Date(issuedAt).toLocaleDateString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})
const sessionTimeLabel = computed(() => {
  if (!ticketSessionStartsAt.value) {
    return t('tickets.time_tba')
  }

  return new Date(ticketSessionStartsAt.value).toLocaleString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})
const orderTotalLabel = computed(() => {
  const amountCents = ticketBundle.value?.order?.amountCents
  if (typeof amountCents !== 'number') {
    return t('tickets.detail_unknown')
  }

  return `${Intl.NumberFormat(getDisplayDateLocale(locale.value)).format(amountCents / 100)} VND`
})

const statusLabel = computed(() => {
  const status = ticketBundle.value?.ticket.status
  if (!status) return t('tickets.detail_unknown')

  const key = `tickets.status_${status}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
})

definePageMeta({
  title: 'tickets.detail_page_title',
  breadcrumb: 'tickets.detail_breadcrumb',
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
          {{ $t('tickets.detail_pass_status', { status: statusLabel }) }}
        </Badge>
        <h1 class="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {{ eventTitle }}
        </h1>
        <p class="max-w-[60ch] text-sm leading-7 text-muted-foreground">
          {{ $t('tickets.detail_qr_ready_desc') }}
        </p>
      </div>

      <Button
        as-child
        variant="outline"
      >
        <NuxtLink :to="localePath('/tickets')">
          {{ $t('tickets.back_to_wallet') }}
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
                {{ $t('tickets.digital_entry_pass') }}
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
              {{ $t('tickets.qr_token') }}
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
              {{ $t('tickets.entry_details') }}
            </CardTitle>
          </CardHeader>
          <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
            <div class="flex gap-3 rounded-lg border bg-muted/20 p-4">
              <UserRound class="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p class="text-xs text-muted-foreground">
                  {{ $t('tickets.detail_attendee') }}
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
                  {{ $t('auth.email_label') }}
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
                  {{ $t('tickets.seat_label') }}
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
                  {{ $t('tickets.session_label') }}
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
              {{ $t('tickets.order_summary') }}
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 text-sm">
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <p class="text-xs text-muted-foreground">
                  {{ $t('tickets.detail_issued') }}
                </p>
                <p class="font-medium">
                  {{ issuedAtLabel }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">
                  {{ $t('tickets.detail_status') }}
                </p>
                <p class="font-medium">
                  {{ statusLabel }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">
                  {{ $t('tickets.detail_order_total') }}
                </p>
                <p class="font-medium">
                  {{ orderTotalLabel }}
                </p>
              </div>
            </div>

            <div class="rounded-lg border bg-muted/20 p-4 text-muted-foreground">
              <p class="font-medium text-foreground">
                {{ $t('tickets.admission_notes') }}
              </p>
              <p class="mt-2 leading-7">
                {{ $t('tickets.admission_bring_qr') }} {{ $t('tickets.admission_staff_note') }}
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
            {{ $t('tickets.missing_eyebrow') }}
          </Badge>
          <h2 class="text-3xl font-semibold tracking-tight">
            {{ $t('tickets.missing_title') }}
          </h2>
          <p class="max-w-[36rem] text-sm leading-7 text-muted-foreground">
            {{ $t('tickets.missing_subtitle') }}
          </p>
        </div>

        <Button as-child>
          <NuxtLink :to="localePath('/tickets')">
            {{ $t('tickets.return_to_wallet') }}
          </NuxtLink>
        </Button>
      </CardContent>
    </Card>
  </main>
</template>
