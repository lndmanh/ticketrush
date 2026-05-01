<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Clock3, MapPin, RefreshCw, ShoppingBag, Ticket, TimerReset, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface SessionSeatMapSeat {
  id: number
  venueSectionId: number | null
  ticketTypeId: number | null
  sectionNameSnapshot: string
  rowLabelSnapshot: string | null
  seatLabelSnapshot: string
  displayX: number
  displayY: number
  priceCents: number
  currency: string
  status: 'available' | 'locked' | 'sold' | 'unavailable'
}

interface SessionSeatMapTicketType {
  id: number
  venueSectionId: number | null
  name: string
  description: string | null
  priceCents: number
  currency: string
  capacity: number
  color: string
  isReservedSeating: boolean
  sortOrder: number
}

interface SessionSeatMapResponse {
  seats: SessionSeatMapSeat[]
  ticketTypes: SessionSeatMapTicketType[]
}

interface EventSessionDetailResponse {
  event: {
    publicId: string
    slug: string
    title: string
    subtitle: string | null
    description: string
    status: string
    coverImage: string | null
  } | null
  session: {
    publicId: string
    label: string
    status: string
    startsAt: string | Date
    endsAt: string | Date | null
    salesStartAt: string | Date
    salesEndAt: string | Date
  } | null
  venue: {
    venue: {
      name: string
      city: string
      address: string
      country: string
    }
  } | null
  ticketTypes: SessionSeatMapTicketType[]
}

interface GateResponse {
  shouldQueue: boolean
  sessionPublicId: string
  eventId: number
}

interface HoldResponse {
  data: {
    hold: {
      publicId: string
    }
  }
}

interface CheckoutStartResponse {
  data: {
    publicId: string
  }
}

const route = useRoute()
const slug = computed(() => route.params.slug.toString())
const sessionPublicId = computed(() => route.params.sessionId.toString())
const passToken = computed(() => typeof route.query.pass === 'string' ? route.query.pass : undefined)

const { data: detailResponse } = await useFetch<{ data: EventSessionDetailResponse }>(() => `/api/event-sessions/${sessionPublicId.value}`)
const detail = computed(() => detailResponse.value?.data ?? null)
const event = computed(() => detail.value?.event ?? null)
const session = computed(() => detail.value?.session ?? null)

const { data: gateResponse } = await useFetch<{ data: GateResponse }>(() => `/api/event-sessions/${sessionPublicId.value}/gate`, {
  query: computed(() => passToken.value ? { pass: passToken.value } : {}),
})

if (gateResponse.value?.data.shouldQueue) {
  await navigateTo({
    path: `/waiting-room/${sessionPublicId.value}`,
    query: { slug: slug.value },
  })
}

const { data: seatMapResponse, refresh: refreshSeatMap } = await useFetch<{ data: SessionSeatMapResponse }>(() => `/api/event-sessions/${sessionPublicId.value}/seatmap`)
const seatMap = computed(() => seatMapResponse.value?.data ?? null)
const selectedSeatIds = ref<number[]>([])
const isSubmitting = ref(false)
const lastSyncedAt = ref(new Date())
let seatRefreshIntervalId: number | null = null

const inventorySummary = computed(() => {
  const seats = seatMap.value?.seats ?? []

  return {
    available: seats.filter(seat => seat.status === 'available').length,
    locked: seats.filter(seat => seat.status === 'locked').length,
    sold: seats.filter(seat => seat.status === 'sold').length,
  }
})

const venueName = computed(() => detail.value?.venue?.venue.name || 'Venue pending')
const venueCity = computed(() => detail.value?.venue?.venue.city || 'Location incoming')
const sessionTimeLabel = computed(() => {
  if (!session.value) {
    return 'Session time pending'
  }

  return new Date(session.value.startsAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})
const selectedSeats = computed(() => {
  return (seatMap.value?.seats ?? []).filter(seat => selectedSeatIds.value.includes(seat.id))
})

const totalValue = computed(() => {
  return selectedSeats.value.reduce((total, seat) => total + seat.priceCents, 0)
})

function getErrorData(error: object) {
  if ('data' in error && typeof error.data === 'object' && error.data !== null) {
    return error.data
  }

  return null
}

function getErrorStatusCode(error: object) {
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  const data = getErrorData(error)
  if (data && 'statusCode' in data && typeof data.statusCode === 'number') {
    return data.statusCode
  }

  return null
}

function getErrorMessage(error: object, fallback: string) {
  const data = getErrorData(error)
  if (data && 'statusMessage' in data && typeof data.statusMessage === 'string') {
    return data.statusMessage
  }

  if (data && 'message' in data && typeof data.message === 'string') {
    return data.message
  }

  if ('message' in error && typeof error.message === 'string') {
    return error.message
  }

  return fallback
}

function formatCurrency(value: number, currency = 'VND') {
  return `${Intl.NumberFormat('en-US').format(value / 100)} ${currency}`
}

function toggleSeat(seatId: number) {
  if (selectedSeatIds.value.includes(seatId)) {
    selectedSeatIds.value = selectedSeatIds.value.filter(id => id !== seatId)
    return
  }

  if (selectedSeatIds.value.length >= 10) {
    return
  }

  selectedSeatIds.value = [...selectedSeatIds.value, seatId]
}

async function reserveSeats() {
  if (!session.value || selectedSeatIds.value.length === 0) {
    return
  }

  isSubmitting.value = true

  try {
    const holdResponse = await $fetch<HoldResponse>(`/api/event-sessions/${sessionPublicId.value}/holds`, {
      method: 'POST',
      body: {
        eventSeatIds: selectedSeatIds.value,
        idempotencyKey: crypto.randomUUID(),
        passToken: passToken.value,
      },
    })

    const holdPublicId = holdResponse.data.hold.publicId
    const checkoutResponse = await $fetch<CheckoutStartResponse>('/api/checkout/start', {
      method: 'POST',
      body: {
        holdPublicId,
      },
    })

    await navigateTo(`/checkout/${checkoutResponse.data.publicId}?hold=${holdPublicId}`)
  }
  catch (error) {
    if (error && typeof error === 'object') {
      const statusCode = getErrorStatusCode(error)
      const message = getErrorMessage(error, 'We could not open checkout. Please try again.')

      if (statusCode === 409) {
        toast.error('Some of the selected seats are no longer available. We refreshed the map for you.')
        return
      }

      if (statusCode === 403) {
        toast.error(message)
        await navigateTo({
          path: `/waiting-room/${sessionPublicId.value}`,
          query: { slug: slug.value },
        })
        return
      }

      toast.error(message)
      return
    }

    toast.error('We could not open checkout. Please try again.')
  }
  finally {
    isSubmitting.value = false
    await refreshSeatMap()
    lastSyncedAt.value = new Date()
  }
}

watch(seatMap, (value) => {
  const availableSeatIds = new Set(
    (value?.seats ?? [])
      .filter(seat => seat.status === 'available')
      .map(seat => seat.id),
  )

  const nextSelectedSeatIds = selectedSeatIds.value.filter(seatId => availableSeatIds.has(seatId))
  if (nextSelectedSeatIds.length !== selectedSeatIds.value.length) {
    selectedSeatIds.value = nextSelectedSeatIds
    toast.error('One or more selected seats were taken by another customer.')
  }
}, { deep: true })

onMounted(() => {
  seatRefreshIntervalId = window.setInterval(async () => {
    await refreshSeatMap()
    lastSyncedAt.value = new Date()
  }, 5000)
})

onUnmounted(() => {
  if (seatRefreshIntervalId !== null) {
    window.clearInterval(seatRefreshIntervalId)
  }
})

definePageMeta({
  title: 'Choose seats',
  breadcrumb: 'Seat selection',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="detail && event && session && seatMap"
    class="space-y-6 pb-16 pt-6 md:space-y-8 md:pb-24"
  >
    <section class="grid gap-4 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
      <div class="space-y-4">
        <Card class="overflow-hidden py-0">
          <CardContent class="grid gap-0 p-0 lg:grid-cols-[1.02fr_0.98fr]">
            <div class="flex min-h-[18rem] flex-col justify-between bg-muted/40 p-6 md:p-8">
              <div class="space-y-4">
                <div class="inline-flex w-fit rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  Seat selection · {{ session.label }}
                </div>
                <div class="space-y-2">
                  <h1 class="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
                    {{ event.title }}
                  </h1>
                  <p class="max-w-[60ch] text-sm leading-7 text-muted-foreground md:text-base">
                    Seats are held for 10 minutes. Choose seats for this session before continuing to checkout.
                  </p>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <Card class="py-3">
                  <CardContent class="flex items-start gap-3 px-4">
                    <MapPin class="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p class="text-xs text-muted-foreground">
                        Venue
                      </p>
                      <p class="text-sm font-medium text-foreground">
                        {{ venueName }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ venueCity }}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card class="py-3">
                  <CardContent class="flex items-start gap-3 px-4">
                    <TimerReset class="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p class="text-xs text-muted-foreground">
                        Session time
                      </p>
                      <p class="text-sm font-medium text-foreground">
                        {{ sessionTimeLabel }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        Map refreshes every 5 seconds
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <CardContent class="space-y-4 p-6 md:p-8">
              <div class="grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <Card class="py-3">
                  <CardContent class="px-4">
                    <p class="text-xs text-muted-foreground">
                      Available
                    </p>
                    <p class="text-sm font-medium text-foreground">
                      {{ inventorySummary.available }}
                    </p>
                  </CardContent>
                </Card>
                <Card class="py-3">
                  <CardContent class="px-4">
                    <p class="text-xs text-muted-foreground">
                      Held
                    </p>
                    <p class="text-sm font-medium text-foreground">
                      {{ inventorySummary.locked }}
                    </p>
                  </CardContent>
                </Card>
                <Card class="py-3">
                  <CardContent class="px-4">
                    <p class="text-xs text-muted-foreground">
                      Sold
                    </p>
                    <p class="text-sm font-medium text-foreground">
                      {{ inventorySummary.sold }}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Seat map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TicketEventSeatMapExperience
              :seats="seatMap.seats"
              :ticket-types="seatMap.ticketTypes"
              :selected-seat-ids="selectedSeatIds"
              :interactive="true"
              :action-label="null"
              @toggle="toggleSeat"
            />
          </CardContent>
        </Card>
      </div>

      <Card class="xl:sticky xl:top-8">
        <CardHeader class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="flex size-10 items-center justify-center rounded-full border bg-muted/40">
              <ShoppingBag class="size-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Selection summary</CardTitle>
              <p class="text-sm text-muted-foreground">
                Choose up to 10 seats, then continue straight to checkout.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent class="space-y-4">
          <div class="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            <Card class="py-3">
              <CardContent class="flex items-start gap-3 px-4">
                <Users class="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p class="text-xs text-muted-foreground">
                    Selected
                  </p>
                  <p class="text-sm font-medium text-foreground">
                    {{ selectedSeatIds.length }} seats
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card class="py-3">
              <CardContent class="flex items-start gap-3 px-4">
                <Clock3 class="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p class="text-xs text-muted-foreground">
                    Hold window
                  </p>
                  <p class="text-sm font-medium text-foreground">
                    10 minutes
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card class="py-3">
              <CardContent class="flex items-start gap-3 px-4">
                <RefreshCw class="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <p class="text-xs text-muted-foreground">
                    Inventory
                  </p>
                  <p class="text-sm font-medium text-foreground">
                    Live updating
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div class="space-y-3">
            <div
              v-for="seat in selectedSeats"
              :key="seat.id"
              class="rounded-md border p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-foreground">
                    {{ seat.sectionNameSnapshot }} · {{ seat.rowLabelSnapshot }}{{ seat.rowLabelSnapshot ? '-' : '' }}{{ seat.seatLabelSnapshot }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Reserved for checkout after you continue.
                  </p>
                </div>
                <p class="font-mono text-sm font-medium text-foreground">
                  {{ formatCurrency(seat.priceCents, seat.currency) }}
                </p>
              </div>
            </div>

            <div
              v-if="selectedSeats.length === 0"
              class="rounded-md border border-dashed p-4 text-sm text-muted-foreground"
            >
              Pick seats from the map to build your order.
            </div>
          </div>

          <Card class="py-4">
            <CardContent class="space-y-2 px-4">
              <p class="text-xs text-muted-foreground">
                Subtotal
              </p>
              <p class="text-2xl font-semibold tracking-tight text-foreground">
                {{ formatCurrency(totalValue) }}
              </p>
            </CardContent>
          </Card>

          <div class="space-y-3">
            <Button
              class="w-full"
              size="lg"
              :disabled="selectedSeatIds.length === 0"
              :is-loading="isSubmitting"
              @click="reserveSeats"
            >
              Continue to checkout
            </Button>
            <Button
              class="w-full"
              size="lg"
              variant="outline"
              @click="refreshSeatMap"
            >
              Refresh map
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
