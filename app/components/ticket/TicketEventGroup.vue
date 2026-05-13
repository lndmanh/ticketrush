<script setup lang="ts">
import { CalendarRange, ChevronDown, MapPin, Ticket } from '@lucide/vue'

const props = defineProps<{
  title: string
  subtitle: string | null
  eventTime: string
  coverImage: string | null
  venueName: string | null
  venueCity: string | null
  ticketCount: number
  expanded: boolean
  tone: number
}>()

defineEmits<{
  (event: 'toggle'): void
}>()

const fallbackImage = computed(() => `https://picsum.photos/seed/${encodeURIComponent(props.title)}-${props.tone}/1200/900`)
</script>

<template>
  <section class="space-y-4">
    <button
      type="button"
      class="group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      :aria-expanded="expanded"
      @click="$emit('toggle')"
    >
      <article class="card-shine relative flex min-h-[30rem] overflow-hidden rounded-2xl border border-white/8 bg-card text-card-foreground shadow-sm transition-all duration-500 group-hover:-translate-y-1.5 group-hover:border-primary/40 group-hover:shadow-2xl group-hover:shadow-primary/20">
        <div class="absolute inset-x-0 top-0 z-20 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div class="absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

        <div class="relative flex w-full flex-col justify-between overflow-hidden">
          <div class="absolute inset-0">
            <img
              :src="coverImage || fallbackImage"
              :alt="title"
              class="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.06]"
            >
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(to_top,rgba(0,0,0,0.96),rgba(0,0,0,0.56),rgba(0,0,0,0.12))]" />
            <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/12 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          </div>

          <div class="relative z-10 flex min-h-[30rem] flex-col justify-between gap-8 p-5 md:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <span class="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/18 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300 backdrop-blur-md transition-all duration-300">
                {{ $t('tickets.purchased_event') }}
              </span>

              <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur-md">
                <CalendarRange class="size-3.5" />
                {{ eventTime }}
              </span>
            </div>

            <div class="space-y-4">
              <div class="max-w-2xl space-y-3">
                <h3 class="text-balance text-3xl font-bold leading-[1.02] tracking-[-0.06em] text-white md:text-4xl">
                  {{ title }}
                </h3>
                <p
                  v-if="subtitle"
                  class="line-clamp-2 max-w-[36rem] break-words text-sm leading-6 text-white/75 md:text-base md:leading-7"
                >
                  {{ subtitle }}
                </p>
              </div>

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
                          {{ venueName || $t('event_card.venue_tba') }}
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <span class="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/70">
                        {{ venueCity || $t('event_card.live_badge') }}
                      </span>
                      <span class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/70">
                        <Ticket class="size-3.5" />
                        {{ $t('tickets.event_ticket_count', { count: ticketCount }) }}
                      </span>
                    </div>
                  </div>

                  <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 group-hover:bg-white/18 group-hover:translate-x-0.5">
                    {{ expanded ? $t('tickets.hide_event_tickets') : $t('tickets.show_event_tickets') }}
                    <ChevronDown
                      class="size-4 transition-transform duration-300"
                      :class="expanded && 'rotate-180'"
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </button>

    <div
      v-if="expanded"
      class="rounded-[1.75rem] border border-white/10 bg-black/20 p-4 shadow-inner shadow-white/5 md:p-5"
    >
      <slot />
    </div>
  </section>
</template>
