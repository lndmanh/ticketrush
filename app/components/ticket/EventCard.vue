<script setup lang="ts">
import { ArrowRight, CalendarRange, MapPin, Ticket } from '@lucide/vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { getEventFallbackImage } from '@/utils/fallbackImages'

interface EventCardProps {
  event: {
    id: number
    publicId: string
    slug: string
    title: string
    subtitle: string | null
    description: string
    coverImage: string | null
    startsAt: string | Date
    endsAt?: string | Date | null
    salesStartAt: string | Date
    status: string
    sessions?: Array<{
      label: string
      startsAt: string | Date
      endsAt?: string | Date | null
    }>
    venue?: {
      name: string
      city: string
      country?: string
      address?: string
    } | null
  }
}

const props = defineProps<EventCardProps>()
const { t, locale } = useI18n()

const localizedVenueName = computed(() => props.event.venue?.name)
const venueDetail = computed(() => {
  const city = props.event.venue?.city
  const country = props.event.venue?.country
  if (city && country) return `${city}, ${country}`
  return city || country || t('event_card.live_badge')
})

const eventDescription = computed(() => props.event.subtitle || props.event.description || t('event_card.default_subtitle'))

const firstSessionStartsAt = computed(() => {
  const sessions = props.event.sessions ?? []
  const firstSession = [...sessions].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })[0]

  return firstSession?.startsAt ?? props.event.startsAt
})

const firstSessionLabel = computed(() => {
  const sessions = props.event.sessions ?? []
  const firstSession = [...sessions].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })[0]

  return firstSession?.label || props.event.slug
})

const startsAtLabel = computed(() => {
  return new Date(firstSessionStartsAt.value).toLocaleString(getDisplayDateLocale(locale.value), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

const statusLabel = computed(() => {
  if (eventTiming.value === 'ongoing') {
    return locale.value === 'vi' ? 'Đang xảy ra' : 'Ongoing'
  }

  if (eventTiming.value === 'past') {
    return locale.value === 'vi' ? 'Đã xảy ra' : 'Past'
  }

  return locale.value === 'vi' ? 'Sắp xảy ra' : 'Upcoming'
})

const eventTiming = computed<'upcoming' | 'ongoing' | 'past'>(() => {
  const now = Date.now()
  const sessions = props.event.sessions ?? []
  const sortedSessions = [...sessions].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })
  const firstSession = sortedSessions[0]
  const lastSession = sortedSessions[sortedSessions.length - 1]
  const startsAt = new Date(firstSession?.startsAt ?? props.event.startsAt).getTime()
  const endsAt = new Date(lastSession?.endsAt ?? props.event.endsAt ?? firstSession?.startsAt ?? props.event.startsAt).getTime()

  if (now < startsAt) {
    return 'upcoming'
  }

  if (now > endsAt) {
    return 'past'
  }

  return 'ongoing'
})
const sessionCountLabel = computed(() => {
  const count = props.event.sessions?.length ?? 0
  if (count === 0) {
    return t('event_card.schedule_pending')
  }

  return t(count === 1 ? 'event_card.session_count_one' : 'event_card.session_count_many', { count })
})

// Dynamic status badge color
const statusBadgeClass = computed(() => {
  if (eventTiming.value === 'ongoing') return 'border-emerald-200/60 bg-emerald-600/90 text-white shadow-emerald-950/30 ring-1 ring-white/25'
  if (eventTiming.value === 'past') return 'border-zinc-200/60 bg-zinc-800/90 text-white shadow-black/30 ring-1 ring-white/20'
  if (eventTiming.value === 'upcoming') return 'border-sky-100/70 bg-sky-600/95 text-white shadow-sky-950/35 ring-1 ring-white/25'
  return 'border-white/35 bg-black/75 text-white shadow-black/30 ring-1 ring-white/20'
})
</script>

<template>
  <NuxtLink
    :to="`/events/${event.slug}`"
    class="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <article class="card-shine relative flex h-full min-h-[30rem] overflow-hidden rounded-2xl border border-white/8 bg-card text-card-foreground shadow-sm transition-all duration-500 group-hover:-translate-y-2 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/20">
      <!-- Top accent line with gradient -->
      <div class="absolute inset-x-0 top-0 z-20 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div class="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <div class="relative flex w-full flex-col justify-between overflow-hidden">
        <div class="absolute inset-0">
          <img
            :src="event.coverImage || getEventFallbackImage(event.slug, 1200, 900)"
            :alt="event.title"
            class="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.06]"
          >
          <!-- Layered gradient for depth -->
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.95),rgba(0,0,0,0.5),rgba(0,0,0,0.08))]" />
          <!-- Subtle primary color tint at bottom -->
          <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/12 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>

        <div class="relative z-10 flex min-h-[30rem] flex-col justify-between gap-8 p-5 md:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <!-- Dynamic status badge -->
            <span
              class="inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] capitalize shadow-lg backdrop-blur-xl transition-all duration-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
              :class="statusBadgeClass"
            >
              {{ statusLabel }}
            </span>

            <span class="inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-black/70 px-3 py-1.5 font-mono text-[11px] font-semibold text-white shadow-lg shadow-black/25 ring-1 ring-white/15 backdrop-blur-xl [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
              <CalendarRange class="size-3.5" />
              {{ startsAtLabel }}
            </span>
          </div>

          <div class="space-y-4">
            <div class="max-w-2xl space-y-3">
              <h3 class="text-balance text-3xl font-bold leading-[1.02] tracking-[-0.06em] text-white md:text-4xl">
                {{ event.title }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <span class="inline-flex max-w-full items-center rounded-full border border-white/30 bg-black/68 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-black/20 ring-1 ring-white/10 backdrop-blur-xl [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
                  {{ $t('event_card.first_session') }} · {{ firstSessionLabel }}
                </span>
              </div>
              <p class="line-clamp-2 max-w-[36rem] break-words text-sm leading-6 text-white/75 md:text-base md:leading-7">
                {{ eventDescription }}
              </p>
            </div>

            <!-- Glassmorphism info footer -->
            <div class="rounded-2xl border border-white/10 bg-black/40 p-4 shadow-2xl shadow-black/20 backdrop-blur-md transition-all duration-300 group-hover:border-white/20 group-hover:bg-black/50">
              <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div class="min-w-0 space-y-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <MapPin class="mt-0.5 size-4 shrink-0 text-white/50" />
                    <div class="min-w-0">
                      <p class="text-[10px] uppercase tracking-[0.2em] text-white/50">
                        {{ $t('event_card.venue_label') }}
                      </p>
                      <p class="truncate text-sm font-medium leading-6 text-white/90 md:text-base">
                        {{ localizedVenueName || $t('event_card.venue_tba') }}
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <span class="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/70">
                      {{ venueDetail }}
                    </span>
                    <span class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/70">
                      <Ticket class="size-3.5" />
                      {{ sessionCountLabel }}
                    </span>
                  </div>
                </div>

                <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white/18 group-hover:translate-x-0.5">
                  {{ $t('event_card.view_event') }}
                  <ArrowRight class="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  </NuxtLink>
</template>
