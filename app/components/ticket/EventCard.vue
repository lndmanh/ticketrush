<script setup lang="ts">
import { ArrowRight, CalendarRange, MapPin, Ticket } from '@lucide/vue'

interface EventCardProps {
  event: {
    id: number
    slug: string
    title: string
    subtitle: string | null
    coverImage: string | null
    startsAt: string | Date
    salesStartAt: string | Date
    status: string
    sessions?: Array<{
      startsAt: string | Date
    }>
    venue?: {
      name: string
      city: string
    } | null
  }
}

const props = defineProps<EventCardProps>()

const firstSessionStartsAt = computed(() => {
  const sessions = props.event.sessions ?? []
  const firstSession = [...sessions].sort((first, second) => {
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
  })[0]

  return firstSession?.startsAt ?? props.event.startsAt
})

const startsAtLabel = computed(() => {
  return new Date(firstSessionStartsAt.value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

const statusLabel = computed(() => props.event.status.replaceAll('_', ' '))
const sessionCountLabel = computed(() => {
  const count = props.event.sessions?.length ?? 0
  if (count === 0) {
    return 'Schedule pending'
  }

  return `${count} session${count === 1 ? '' : 's'}`
})

// Dynamic status badge color
const statusBadgeClass = computed(() => {
  const status = props.event.status
  if (status === 'on_sale') return 'border-amber-400/30 bg-amber-400/18 text-amber-300'
  if (status === 'published') return 'border-emerald-400/30 bg-emerald-400/18 text-emerald-300'
  if (status === 'sold_out') return 'border-rose-400/30 bg-rose-400/18 text-rose-300'
  return 'border-white/15 bg-white/10 text-white/75'
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
            :src="event.coverImage || `https://picsum.photos/seed/${event.slug}/1200/900`"
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
              class="inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] capitalize backdrop-blur-md transition-all duration-300"
              :class="statusBadgeClass"
            >
              {{ statusLabel }}
            </span>

            <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur-md">
              <CalendarRange class="size-3.5" />
              {{ startsAtLabel }}
            </span>
          </div>

          <div class="space-y-4">
            <div class="max-w-2xl space-y-3">
              <h3 class="text-balance text-3xl font-bold leading-[1.02] tracking-[-0.06em] text-white md:text-4xl">
                {{ event.title }}
              </h3>
              <p
                v-if="event.subtitle"
                class="line-clamp-2 max-w-[36rem] break-words text-sm leading-6 text-white/75 md:text-base md:leading-7"
              >
                {{ event.subtitle }}
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
                        Venue
                      </p>
                      <p class="truncate text-sm font-medium leading-6 text-white/90 md:text-base">
                        {{ event.venue?.name || 'Venue to be announced' }}
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <span class="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/70">
                      {{ event.venue?.city || 'Live' }}
                    </span>
                    <span class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/70">
                      <Ticket class="size-3.5" />
                      {{ sessionCountLabel }}
                    </span>
                  </div>
                </div>

                <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white/18 group-hover:translate-x-0.5">
                  View event
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
