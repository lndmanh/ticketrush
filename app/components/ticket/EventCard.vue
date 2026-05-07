<script setup lang="ts">
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

const { t } = useI18n()

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
</script>

<template>
  <NuxtLink
    :to="`/events/${event.slug}`"
    class="group block"
  >
    <article class="surface-shell h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1">
      <div class="surface-core min-h-[28rem] overflow-hidden p-0">
        <div class="relative flex min-h-[28rem] flex-col overflow-hidden rounded-[calc(2rem-0.375rem)] bg-secondary">
          <img
            :src="event.coverImage || `https://picsum.photos/seed/${event.slug}/1200/900`"
            :alt="event.title"
            class="absolute inset-0 h-full w-full object-cover grayscale transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
          >
          <div class="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88),rgba(0,0,0,0.55),rgba(0,0,0,0.1))]" />

          <div class="relative z-10 flex min-h-[28rem] flex-col justify-between gap-8 p-5 md:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <span class="section-eyebrow border-white/10 bg-white/8 text-white">
                {{ event.status.replaceAll('_', ' ') }}
              </span>

              <span class="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-mono text-[11px] text-white/76 backdrop-blur-sm">
                {{ startsAtLabel }}
              </span>
            </div>

            <div class="space-y-4">
              <div class="max-w-2xl space-y-3">
                <h3 class="text-balance text-3xl font-semibold leading-[1.02] tracking-[-0.06em] text-white md:text-4xl">
                  {{ event.title }}
                </h3>
                <p class="max-w-[36rem] break-words text-sm leading-6 text-white/76 md:text-base md:leading-7">
                  {{ event.subtitle || event.venue?.name || $t('event_card.default_subtitle') }}
                </p>
              </div>

              <div class="grid gap-3 rounded-[1.75rem] border border-white/10 bg-black/35 p-4 text-white backdrop-blur-sm md:grid-cols-[1fr_auto] md:items-end">
                <div class="min-w-0 space-y-1">
                  <p class="text-[11px] uppercase tracking-[0.18em] text-white/64">
                    {{ $t('event_card.venue_label') }}
                  </p>
                  <p class="break-words text-sm leading-6 text-white/86 md:text-base">
                    {{ event.venue?.name || $t('event_card.venue_tba') }}
                  </p>
                </div>
                <div class="justify-self-start md:justify-self-end">
                  <span class="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/72">
                    {{ event.venue?.city || $t('common.live') }}
                  </span>
                </div>
                <div
                  v-if="event.sessions?.length"
                  class="justify-self-start md:justify-self-end"
                >
                  <span class="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/72">
                    {{ $t('event_card.session_count', event.sessions!.length) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  </NuxtLink>
</template>
