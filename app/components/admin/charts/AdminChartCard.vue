<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  title: string
  eyebrow?: string
  description?: string
  option: EChartsOption
  height?: number
  stat?: string | number
  statLabel?: string
  tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate'
}>(), {
  eyebrow: '',
  description: '',
  height: 280,
  stat: '',
  statLabel: '',
  tone: 'blue',
})

const chartStyle = computed(() => ({
  height: `${props.height}px`,
}))

const toneClasses = computed(() => {
  const tones = {
    blue: 'border-blue-500/15 bg-linear-to-br from-blue-500/10 via-background to-background',
    emerald: 'border-emerald-500/15 bg-linear-to-br from-emerald-500/10 via-background to-background',
    amber: 'border-amber-500/15 bg-linear-to-br from-amber-500/10 via-background to-background',
    rose: 'border-rose-500/15 bg-linear-to-br from-rose-500/10 via-background to-background',
    violet: 'border-violet-500/15 bg-linear-to-br from-violet-500/10 via-background to-background',
    slate: 'border-border bg-linear-to-br from-muted/50 via-background to-background',
  }

  return tones[props.tone]
})
</script>

<template>
  <Card
    class="h-full overflow-hidden"
    :class="toneClasses"
  >
    <CardHeader class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-2">
          <p
            v-if="eyebrow"
            class="text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
          >
            {{ eyebrow }}
          </p>
          <CardTitle>
            {{ title }}
          </CardTitle>
          <CardDescription
            v-if="description"
            class="max-w-[52ch]"
          >
            {{ description }}
          </CardDescription>
        </div>

        <div
          v-if="stat !== ''"
          class="rounded-[1.25rem] border border-border bg-background/80 px-4 py-3 text-right backdrop-blur-sm"
        >
          <p class="text-lg font-semibold tracking-[-0.04em] text-foreground">
            {{ stat }}
          </p>
          <p
            v-if="statLabel"
            class="text-xs text-muted-foreground"
          >
            {{ statLabel }}
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent class="pb-6">
      <ClientOnly>
        <VChart
          :option="option"
          autoresize
          class="w-full"
          :style="chartStyle"
        />
        <template #fallback>
          <div
            class="w-full animate-pulse rounded-[1.25rem] border border-border bg-muted/30"
            :style="chartStyle"
          />
        </template>
      </ClientOnly>
    </CardContent>
  </Card>
</template>
