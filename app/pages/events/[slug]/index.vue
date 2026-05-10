<script setup lang="ts">
import { ArrowDown, ArrowRight, CalendarRange, CheckCircle2, Clock3, MapPin, ShieldCheck, Ticket } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDisplayDateLocale, getLocalizedCityName, getLocalizedEventDisplay, getLocalizedVenueName } from '@/lib/localizedEvents'
import { apiRoutes } from '#shared/apiRoutes'

const route = useRoute()
const { locale, t } = useI18n()
const localePath = useLocalePath()
const slug = computed(() => route.params.slug.toString())

const eventDetailCopy = computed(() => {
  if (locale.value === 'vi') {
    return {
      bookTickets: 'Đặt vé',
      viewSessions: 'Xem suất diễn',
      seeAllSessions: 'Xuống phần suất diễn',
      ticketsComingSoon: 'Vé sắp mở bán',
      scheduleComingSoon: 'Lịch diễn sắp công bố',
      scheduleComingSoonDesc: 'Sự kiện chưa có suất diễn công khai. Hãy quay lại sớm để xem lịch, đợt bán vé và chọn chỗ ngồi.',
      pricingNotAnnounced: 'Giá vé chưa được công bố',
      fromPrice: (price: string, currency: string) => `Từ ${price} ${currency}`,
      ticketReleasesLive: (count: number) => `${count} đợt bán vé đang mở`,
      sessions: 'Suất diễn',
      selectSessionTitle: 'Chọn suất diễn',
      selectSessionDesc: 'Chọn ngày và giờ để xem chỗ ngồi còn trống và đặt vé.',
      bookingEyebrow: 'Đặt vé',
      bookingTitle: 'Lên kế hoạch tham dự',
      dateRangeLabel: 'Khoảng ngày',
      locationLabel: 'Địa điểm',
      ticketReleasesLabel: 'Đợt bán vé',
      capacityMetric: 'Sức chứa',
      tba: 'Sẽ thông báo',
      trustSecureCheckout: 'Thanh toán an toàn và tình trạng ghế theo thời gian thực',
      trustInstantConfirmation: 'Xác nhận vé ngay sau khi mua',
      trustSalesWindows: 'Khung giờ bán vé tự động cập nhật',
    }
  }

  return {
    bookTickets: 'Book tickets',
    viewSessions: 'View sessions',
    seeAllSessions: 'Jump to sessions',
    ticketsComingSoon: 'Tickets coming soon',
    scheduleComingSoon: 'Schedule coming soon',
    scheduleComingSoonDesc: 'We do not have public sessions for this event yet. Check back soon for dates, ticket releases, and seat selection.',
    pricingNotAnnounced: 'Pricing not announced yet',
    fromPrice: (price: string, currency: string) => `From ${price} ${currency}`,
    ticketReleasesLive: (count: number) => `${count} ticket release${count === 1 ? '' : 's'} live`,
    sessions: 'Sessions',
    selectSessionTitle: 'Select a Session',
    selectSessionDesc: 'Choose a date and time to view available seats and book tickets.',
    bookingEyebrow: 'Booking',
    bookingTitle: 'Plan your night',
    dateRangeLabel: 'Date Range',
    locationLabel: 'Location',
    ticketReleasesLabel: 'Ticket Releases',
    capacityMetric: 'Capacity',
    tba: 'TBA',
    trustSecureCheckout: 'Secure checkout and live seat availability',
    trustInstantConfirmation: 'Instant ticket confirmation after purchase',
    trustSalesWindows: 'Sales windows update automatically',
  }
})

const { data: detailResponse } = await useAPI(() => apiRoutes.event(slug.value))

const detail = computed(() => detailResponse.value?.success ? detailResponse.value.data : null)
const event = computed(() => detail.value?.event ?? null)
const venue = computed(() => detail.value?.venue?.venue ?? null)
const localizedEvent = computed(() => event.value ? getLocalizedEventDisplay(event.value, locale.value) : null)
const localizedVenueName = computed(() => getLocalizedVenueName(venue.value?.name, locale.value))
const localizedCityName = computed(() => getLocalizedCityName(venue.value?.city, locale.value))

const sortedSessions = computed(() => {
  return [...(detail.value?.sessions ?? [])].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })
})

const dateRangeLabel = computed(() => {
  if (sortedSessions.value.length === 0) {
    return eventDetailCopy.value.tba
  }

  const firstSession = sortedSessions.value[0]
  const lastSession = sortedSessions.value[sortedSessions.value.length - 1]
  const firstDate = new Date(firstSession.startsAt)
  const lastDate = new Date(lastSession.startsAt)

  if (firstDate.toDateString() === lastDate.toDateString()) {
    return firstDate.toLocaleDateString(getDisplayDateLocale(locale.value), {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const dateLocale = getDisplayDateLocale(locale.value)
  return `${firstDate.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} – ${lastDate.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}`
})

const venueLabel = computed(() => {
  if (!venue.value) {
    return eventDetailCopy.value.tba
  }

  return [localizedVenueName.value, localizedCityName.value].filter(Boolean).join(', ')
})

const releaseCount = computed(() => {
  return sortedSessions.value.reduce((total, session) => total + session.ticketTypes.length, 0)
})

const totalTicketCapacity = computed(() => {
  return sortedSessions.value.reduce((sessionTotal, session) => {
    return sessionTotal + session.ticketTypes.reduce((ticketTotal, ticketType) => ticketTotal + ticketType.capacity, 0)
  }, 0)
})

const hasTicketCapacity = computed(() => totalTicketCapacity.value > 0)

const lowestTicket = computed(() => {
  return sortedSessions.value
    .flatMap(session => session.ticketTypes)
    .sort((first, second) => first.priceCents - second.priceCents)[0] ?? null
})

const firstBookableSession = computed(() => {
  const now = Date.now()

  return sortedSessions.value.find((session) => {
    const salesStartAt = new Date(session.salesStartAt).getTime()
    const salesEndAt = new Date(session.salesEndAt).getTime()

    return (session.status === 'published' || session.status === 'on_sale')
      && salesStartAt <= now
      && salesEndAt >= now
      && session.ticketTypes.length > 0
  }) ?? null
})

const primaryCtaPath = computed(() => {
  if (firstBookableSession.value && event.value) {
    return localePath(`/events/${event.value.slug}/sessions/${firstBookableSession.value.publicId}/seats`)
  }

  return '#sessions'
})

const primaryCtaLabel = computed(() => firstBookableSession.value ? eventDetailCopy.value.bookTickets : eventDetailCopy.value.viewSessions)

const ticketAvailabilityLabel = computed(() => {
  if (releaseCount.value === 0) {
    return sortedSessions.value.length > 0 ? eventDetailCopy.value.ticketsComingSoon : eventDetailCopy.value.scheduleComingSoon
  }

  return eventDetailCopy.value.ticketReleasesLive(releaseCount.value)
})

const startingPriceLabel = computed(() => {
  if (!lowestTicket.value) {
    return eventDetailCopy.value.pricingNotAnnounced
  }

  return eventDetailCopy.value.fromPrice(Intl.NumberFormat(getDisplayDateLocale(locale.value)).format(lowestTicket.value.priceCents / 100), lowestTicket.value.currency)
})

const eventStatusLabel = computed(() => {
  const status = event.value?.status
  if (!status) return ''

  const key = `event_card.status_${status}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
})

const heroImage = computed(() => {
  return event.value?.coverImage || `https://picsum.photos/seed/${slug.value}/1600/1100`
})

if (!event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Event not found.' })
}

definePageMeta({
  title: 'Event detail',
  breadcrumb: 'Event',
})
</script>

<template>
  <AppLayout
    v-if="event"
    :hide-header="true"
    class-name="relative gap-8 overflow-hidden md:gap-10 max-w-[90rem] px-4 mt-16 pb-3 sm:px-6 lg:px-10"
  >
    <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_14%_10%,hsl(var(--primary)/0.24),transparent_34%),radial-gradient(circle_at_86%_0%,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_68%)]" />

    <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div class="space-y-6">
        <div class="surface-shell overflow-hidden">
          <div class="surface-core relative min-h-[28rem] overflow-hidden p-0 md:min-h-[31rem]">
            <img
              :src="heroImage"
              :alt="localizedEvent?.title || event.title"
              class="absolute inset-0 h-full w-full scale-105 object-cover object-center blur-2xl opacity-35"
              aria-hidden="true"
            >
            <img
              :src="heroImage"
              :alt="localizedEvent?.title || event.title"
              class="absolute inset-0 h-full w-full object-cover object-center brightness-[0.78] contrast-[1.12] saturate-[1.18]"
            >
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(124,58,237,0.24),transparent_36%),radial-gradient(circle_at_86%_14%,rgba(56,189,248,0.18),transparent_34%)]" />
            <div class="absolute inset-0 bg-[linear-gradient(160deg,rgba(0,0,0,0.08),rgba(0,0,0,0.48)_44%,rgba(0,0,0,0.94))]" />
            <div class="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary via-sky-400 to-transparent" />
            <div class="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8 lg:p-10">
              <div class="mb-5 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  class="border-white/15 bg-black/70 font-mono text-[10px] uppercase tracking-[0.16em] text-white shadow-lg shadow-black/20 backdrop-blur-xl"
                >
                  {{ eventStatusLabel }}
                </Badge>
                <Badge
                  variant="outline"
                  class="border-white/15 bg-black/70 text-white shadow-lg shadow-black/20 backdrop-blur-xl"
                >
                  {{ venueLabel }}
                </Badge>
              </div>
              <h1 class="max-w-5xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.07em] text-white md:text-6xl lg:text-7xl">
                {{ localizedEvent?.title || event.title }}
              </h1>
              <p class="mt-5 max-w-2xl text-sm leading-6 text-white/78 md:text-base md:leading-7">
                {{ localizedEvent?.subtitle || localizedEvent?.description || event.subtitle || event.description }}
              </p>

              <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  as-child
                  variant="outline"
                  size="lg"
                  class="rounded-full border-white/20 bg-black/55 text-white shadow-lg shadow-black/20 backdrop-blur-xl hover:bg-black/70 hover:text-white"
                >
                  <NuxtLink to="#sessions">
                    {{ eventDetailCopy.seeAllSessions }}
                    <ArrowDown class="ml-2 size-4" />
                  </NuxtLink>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <section
          id="sessions"
          class="space-y-6 scroll-mt-24"
        >
          <div class="rounded-[1.5rem] border border-border/70 bg-card/70 p-5 shadow-sm md:p-6">
            <div class="space-y-3">
              <span class="section-eyebrow">
                {{ eventDetailCopy.sessions }}
              </span>
              <div class="space-y-2">
                <h2 class="text-3xl font-semibold tracking-[-0.05em] md:text-4xl">
                  {{ eventDetailCopy.selectSessionTitle }}
                </h2>
                <p class="max-w-[42rem] text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                  {{ eventDetailCopy.selectSessionDesc }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid gap-4">
            <TicketEventSessionCard
              v-for="session in sortedSessions"
              :key="session.publicId"
              :session="session"
              :ticket-types="session.ticketTypes"
              :event-slug="event.slug"
            />
          </div>

          <Card
            v-if="sortedSessions.length === 0"
            class="border-dashed bg-card/70"
          >
            <CardContent class="p-8 text-center">
              <p class="text-lg font-semibold tracking-[-0.03em] text-foreground">
                {{ eventDetailCopy.scheduleComingSoon }}
              </p>
              <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {{ eventDetailCopy.scheduleComingSoonDesc }}
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

      <aside class="space-y-6 lg:sticky lg:top-24">
        <Card class="overflow-hidden border-primary/15 bg-card/82 shadow-2xl shadow-black/10 backdrop-blur-xl">
          <div class="h-1 bg-gradient-to-r from-primary via-sky-400 to-transparent" />
          <CardHeader>
            <p class="section-eyebrow w-fit">
              {{ eventDetailCopy.bookingEyebrow }}
            </p>
            <CardTitle class="mt-3 text-2xl tracking-[-0.05em]">
              {{ eventDetailCopy.bookingTitle }}
            </CardTitle>
            <p class="text-sm leading-6 text-muted-foreground">
              {{ startingPriceLabel }}
            </p>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="flex items-start gap-4 rounded-[1.25rem] border border-border/80 bg-background/74 p-4">
              <CalendarRange class="mt-0.5 size-4 text-primary" />
              <div>
                <p class="text-sm font-medium leading-none">
                  {{ eventDetailCopy.dateRangeLabel }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ dateRangeLabel }}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4 rounded-[1.25rem] border border-border/80 bg-background/74 p-4">
              <MapPin class="mt-0.5 size-4 text-primary" />
              <div>
                <p class="text-sm font-medium leading-none">
                  {{ eventDetailCopy.locationLabel }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ localizedVenueName || eventDetailCopy.tba }}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-4 rounded-[1.25rem] border border-border/80 bg-background/74 p-4">
              <Ticket class="mt-0.5 size-4 text-primary" />
              <div>
                <p class="text-sm font-medium leading-none">
                  {{ eventDetailCopy.ticketReleasesLabel }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ ticketAvailabilityLabel }}
                </p>
              </div>
            </div>
            <div
              class="grid gap-3"
              :class="hasTicketCapacity ? 'grid-cols-2' : 'grid-cols-1'"
            >
              <div class="rounded-[1.15rem] border border-border/70 bg-secondary/30 p-4">
                <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {{ eventDetailCopy.sessions }}
                </p>
                <p class="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-foreground">
                  {{ sortedSessions.length }}
                </p>
              </div>
              <div
                v-if="hasTicketCapacity"
                class="rounded-[1.15rem] border border-border/70 bg-secondary/30 p-4"
              >
                <p class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {{ eventDetailCopy.capacityMetric }}
                </p>
                <p class="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-foreground">
                  {{ totalTicketCapacity }}
                </p>
              </div>
            </div>
            <Button
              as-child
              size="lg"
              class="mt-1 rounded-full"
            >
              <NuxtLink :to="primaryCtaPath">
                {{ primaryCtaLabel }}
                <ArrowRight class="ml-2 size-4" />
              </NuxtLink>
            </Button>
            <div class="grid gap-2 border-t pt-4 text-sm text-muted-foreground">
              <p class="inline-flex items-center gap-2">
                <ShieldCheck class="size-4 text-primary" />
                {{ eventDetailCopy.trustSecureCheckout }}
              </p>
              <p class="inline-flex items-center gap-2">
                <CheckCircle2 class="size-4 text-primary" />
                {{ eventDetailCopy.trustInstantConfirmation }}
              </p>
              <p class="inline-flex items-center gap-2">
                <Clock3 class="size-4 text-primary" />
                {{ eventDetailCopy.trustSalesWindows }}
              </p>
            </div>
          </CardContent>
        </Card>
      </aside>
    </section>
  </AppLayout>
</template>
