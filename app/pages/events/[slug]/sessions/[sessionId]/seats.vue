<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Clock3, RefreshCw, ShoppingBag, Users } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'

const route = useRoute()
const slug = computed(() => route.params.slug.toString())
const sessionPublicId = computed(() => route.params.sessionId.toString())
const passToken = computed(() => typeof route.query.pass === 'string' ? route.query.pass : undefined)

const { data: detailResponse } = await useAPI(() => apiRoutes.eventSession(sessionPublicId.value))
const detail = computed(() => detailResponse.value?.success ? detailResponse.value.data : null)
const event = computed(() => detail.value?.event ?? null)
const session = computed(() => detail.value?.session ?? null)

const { data: gateResponse } = await useAPI(() => apiRoutes.eventSessionGate(sessionPublicId.value), {
  query: computed(() => passToken.value ? { pass: passToken.value } : {}),
})

if (gateResponse.value?.success && gateResponse.value.data.shouldQueue) {
  await navigateTo({
    path: `/waiting-room/${sessionPublicId.value}`,
    query: { slug: slug.value },
  })
}

const { data: seatMapResponse, refresh: refreshSeatMap } = await useAPI(() => apiRoutes.eventSessionSeatmap(sessionPublicId.value))
const seatMap = computed(() => seatMapResponse.value?.success ? seatMapResponse.value.data : null)
const selectedSeatIds = ref<number[]>([])
const isSubmitting = ref(false)
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
    const holdResponse = await apiRequest(apiRoutes.eventSessionHolds(sessionPublicId.value), {
      method: 'POST',
      body: {
        eventSeatIds: selectedSeatIds.value,
        idempotencyKey: crypto.randomUUID(),
        passToken: passToken.value,
      },
    })
    if (!holdResponse.success) {
      throw holdResponse
    }

    const holdPublicId = holdResponse.data.hold.publicId
    const checkoutResponse = await apiRequest(apiRoutes.CHECKOUT_START, {
      method: 'POST',
      body: {
        holdPublicId,
      },
    })
    if (!checkoutResponse.success) {
      throw checkoutResponse
    }

    await navigateTo(`/checkout/${checkoutResponse.data.publicId}?hold=${holdPublicId}`)
  }
  catch (error) {
    const parsedError = parseApiError(error, 'We could not open checkout. Please try again.')

    const statusCode = parsedError.status
    const message = parsedError.message

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

    toast.error('We could not open checkout. Please try again.')
  }
  finally {
    isSubmitting.value = false
    await refreshSeatMap()
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
  layout: 'dashboard',
  middleware: ['auth'],
})
</script>

<template>
  <main
    v-if="detail && event && session && seatMap"
    class="space-y-6 pb-8 pt-6"
  >
    <section class="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
      <div class="space-y-4">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">
              {{ event.title }}
            </h1>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ session.label }} &middot; {{ venueName }}, {{ venueCity }} &middot; {{ sessionTimeLabel }}
            </p>
          </div>
          <div class="flex gap-4 rounded-lg border bg-muted/40 p-3 text-sm">
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Available</span>
              <span class="font-medium">{{ inventorySummary.available }}</span>
            </div>
            <div class="w-px bg-border" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Held</span>
              <span class="font-medium">{{ inventorySummary.locked }}</span>
            </div>
            <div class="w-px bg-border" />
            <div class="flex flex-col">
              <span class="text-xs text-muted-foreground">Sold</span>
              <span class="font-medium">{{ inventorySummary.sold }}</span>
            </div>
          </div>
        </div>

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
