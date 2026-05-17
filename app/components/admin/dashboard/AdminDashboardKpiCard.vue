<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight } from '@lucide/vue'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  description: string
  trendLabel?: string
  trendDirection?: 'up' | 'down' | 'neutral'
}>(), {
  trendLabel: '',
  trendDirection: 'neutral',
})

const trendClass = computed(() => {
  if (props.trendDirection === 'up') return 'text-emerald-600 dark:text-emerald-400'
  if (props.trendDirection === 'down') return 'text-destructive'
  return 'text-muted-foreground'
})
</script>

<template>
  <Card class="group h-full overflow-hidden border-border/70 bg-card/80 shadow-sm">
    <CardHeader class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b !pb-0">
      <div class="min-w-0">
        <CardTitle class="text-sm font-bold">
          {{ label }}
        </CardTitle>
        <CardDescription class="break-words">
          {{ description }}
        </CardDescription>
      </div>
      <div class="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-colors duration-300 group-hover:text-primary">
        <slot name="icon" />
      </div>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <div class="flex min-w-0 flex-wrap items-end gap-2">
        <p class="min-w-0 break-words font-mono text-2xl font-semibold leading-none tracking-[-0.06em] text-foreground sm:text-3xl xl:text-4xl">
          {{ value }}
        </p>
        <Badge
          v-if="trendLabel"
          variant="outline"
          class="mb-1 gap-1 rounded-full text-xs sm:mb-2"
          :class="trendClass"
        >
          {{ trendLabel }}
          <ArrowUpRight
            v-if="trendDirection === 'up'"
            class="size-3"
            aria-hidden="true"
          />
          <ArrowDownRight
            v-else-if="trendDirection === 'down'"
            class="size-3"
            aria-hidden="true"
          />
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>
