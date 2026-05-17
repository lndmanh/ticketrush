<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight } from '@lucide/vue'

const props = withDefaults(defineProps<{
  label: string
  value: string
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
  <Card class="group overflow-hidden border-border/70 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md active:translate-y-0">
    <CardHeader class="grid grid-cols-[1fr_auto] items-start gap-3 border-b !pb-0">
      <span>
        <CardTitle class="text-md font-bold">
          {{ label }}
        </CardTitle>
        <CardDescription>
          {{ description }}
        </CardDescription>
      </span>
      <div class="flex size-8 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-colors duration-300 group-hover:text-primary">
        <slot name="icon" />
      </div>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="flex flex-wrap items-end gap-2">
        <p class="font-mono text-4xl font-semibold tracking-[-0.06em] text-foreground">
          {{ value }}
        </p>
        <Badge
          v-if="trendLabel"
          variant="outline"
          class="mb-3 gap-1 rounded-full text-xs"
          :class="trendClass"
        >
          {{ trendLabel }}
          <ArrowUpRight
            v-if="trendDirection === 'up'"
            class="size-3"
          />
          <ArrowDownRight
            v-else-if="trendDirection === 'down'"
            class="size-3"
          />
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>
