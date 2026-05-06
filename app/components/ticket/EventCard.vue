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
</script>

<template>
  <NuxtLink
    :to="`/events/${event.slug}`"
    class="group block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <article class="relative flex h-full min-h-[30rem] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-md">
      <div class="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <div class="relative flex w-full flex-col justify-between overflow-hidden">
        <div class="absolute inset-0">
          <img
            :src="event.coverImage || `https://picsum.photos/seed/${event.slug}/1200/900`"
            :alt="event.title"
            class="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
          >
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.9),rgba(0,0,0,0.46),rgba(0,0,0,0.12))]" />
        </div>

        <div class="relative z-10 flex min-h-[30rem] flex-col justify-between gap-8 p-5 md:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <Badge
              variant="secondary"
              class="border-white/10 bg-white/15 text-white capitalize backdrop-blur-md hover:bg-white/20"
            >
              {{ statusLabel }}
            </Badge>

            <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur-md">
              <CalendarRange class="size-3.5" />
              {{ startsAtLabel }}
            </span>
          </div>

          <div class="space-y-4">
            <div class="max-w-2xl space-y-3">
              <h3 class="text-balance text-3xl font-semibold leading-[1.02] tracking-[-0.06em] text-white md:text-4xl">
                {{ event.title }}
              </h3>
              <p
                v-if="event.subtitle"
                class="line-clamp-2 max-w-[36rem] break-words text-sm leading-6 text-white/80 md:text-base md:leading-7"
              >
                {{ event.subtitle }}
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-black/40 p-4 text-white shadow-2xl shadow-black/10 backdrop-blur-md transition-colors duration-300 group-hover:border-white/20">
              <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div class="min-w-0 space-y-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <MapPin class="mt-0.5 size-4 shrink-0 text-white/60" />
                    <div class="min-w-0">
                      <p class="text-[11px] uppercase tracking-[0.18em] text-white/60">
                        Venue
                      </p>
                      <p class="truncate text-sm font-medium leading-6 text-white/90 md:text-base">
                        {{ event.venue?.name || 'Venue to be announced' }}
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <span class="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/75">
                      {{ event.venue?.city || 'Live' }}
                    </span>
                    <span class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/75">
                      <Ticket class="size-3.5" />
                      {{ sessionCountLabel }}
                    </span>
                  </div>
                </div>

                <span class="inline-flex items-center gap-1 text-sm font-medium text-white transition-transform duration-300 group-hover:translate-x-1">
                  View event
                  <ArrowRight class="size-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  </NuxtLink>
</template>
