<script setup lang="ts">
const props = defineProps<{
  totalTickets: number
  issuedTickets: number
  upcomingTickets: number
}>()

const stats = computed(() => [
  { label: 'tickets.total_passes', value: props.totalTickets },
  { label: 'tickets.issued_passes', value: props.issuedTickets },
  { label: 'tickets.upcoming_passes', value: props.upcomingTickets },
])
</script>

<template>
  <section>
    <div class="surface-shell overflow-hidden bg-card/80 shadow-2xl shadow-primary/10">
      <div class="surface-core relative min-h-36 overflow-hidden p-0">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,hsl(var(--primary)/0.26),transparent_30%),radial-gradient(circle_at_92%_8%,rgba(34,211,238,0.18),transparent_28%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--secondary)/0.36)_62%,hsl(var(--card)))]" />
        <div class="absolute right-10 top-6 size-32 rounded-full bg-primary/10 blur-3xl" />
        <div class="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary via-primary/70 to-transparent" />

        <div class="relative space-y-4 p-5 md:p-6">
          <div class="max-w-3xl space-y-2.5">
            <span class="section-eyebrow border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
              {{ $t('tickets.eyebrow') }}
            </span>
            <h1 class="text-balance text-2xl font-extrabold leading-tight tracking-[-0.07em] text-foreground md:text-4xl">
              {{ $t('tickets.title') }}
            </h1>
            <p class="max-w-2xl text-xs leading-6 text-muted-foreground md:text-sm">
              {{ $t('tickets.subtitle') }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <Badge
              v-for="stat in stats"
              :key="stat.label"
              variant="outline"
              class="gap-2 rounded-full border-primary/20 bg-primary/10 px-3 py-1.5 shadow-sm shadow-primary/10 backdrop-blur"
            >
              <span class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {{ $t(stat.label) }}
              </span>
              <span class="font-mono text-sm font-semibold text-foreground">
                {{ stat.value }}
              </span>
            </Badge>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
