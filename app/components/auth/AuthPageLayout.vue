<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, Grid2x2PlusIcon } from '@lucide/vue'
import { motion } from 'motion-v'
import { APP_MANIFEST } from '#shared/constants/manifest'

type FloatingPath = {
  id: string
  d: string
  width: number
  opacity: number
  duration: number
}

const props = withDefaults(defineProps<{
  quote: string
  quoteAuthor?: string
}>(), {
  quoteAuthor: 'No Name Studio',
})

function createFloatingPaths(position: 1 | -1): FloatingPath[] {
  return Array.from({ length: 36 }, (_, index) => ({
    id: `${position}-${index}`,
    d: `M-${380 - index * 5 * position} -${189 + index * 6}C-${
      380 - index * 5 * position
    } -${189 + index * 6} -${312 - index * 5 * position} ${216 - index * 6} ${
      152 - index * 5 * position
    } ${343 - index * 6}C${616 - index * 5 * position} ${470 - index * 6} ${
      684 - index * 5 * position
    } ${875 - index * 6} ${684 - index * 5 * position} ${875 - index * 6}`,
    width: 0.5 + index * 0.03,
    opacity: Math.min(0.1 + index * 0.03, 1),
    duration: 20 + (index % 10),
  }))
}

const floatingPaths = [
  ...createFloatingPaths(1),
  ...createFloatingPaths(-1),
]
</script>

<template>
  <main class="relative h-[100dvh] overflow-hidden bg-background lg:grid lg:grid-cols-2">
    <section class="relative hidden h-full flex-col overflow-hidden border-r bg-muted/60 p-10 lg:flex">
      <div class="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      <div class="relative flex items-center gap-2">
        <Grid2x2PlusIcon
          aria-hidden="true"
          class="size-6"
        />
        <p class="text-xl font-semibold">
          {{ APP_MANIFEST.name }}
        </p>
      </div>

      <div
        class="pointer-events-none absolute inset-0 text-slate-950 dark:text-white motion-reduce:hidden"
        aria-hidden="true"
      >
        <svg
          class="h-full w-full"
          viewBox="0 0 696 316"
          fill="none"
        >
          <motion.path
            v-for="path in floatingPaths"
            :key="path.id"
            :d="path.d"
            stroke="currentColor"
            :stroke-width="path.width"
            :stroke-opacity="path.opacity"
            :initial="{ pathLength: 0.3, opacity: 0.6 }"
            :animate="{ pathLength: 1, opacity: [0.3, 0.6, 0.3], pathOffset: [0, 1, 0] }"
            :transition="{ duration: path.duration, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }"
          />
        </svg>
      </div>

      <div class="relative mt-auto max-w-xl">
        <blockquote class="space-y-2">
          <p class="text-xl leading-relaxed">
            &ldquo;{{ props.quote }}&rdquo;
          </p>
          <footer class="font-mono text-sm font-semibold">
            ~ {{ props.quoteAuthor }}
          </footer>
        </blockquote>
      </div>
    </section>

    <section class="relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto px-4 py-20 sm:px-6 lg:px-10">
      <div
        aria-hidden="true"
        class="absolute inset-0 -z-10 isolate opacity-60"
      >
        <div class="absolute right-0 top-0 h-80 w-80 -translate-y-1/2 translate-x-1/4 rounded-full bg-foreground/[0.04] blur-3xl" />
        <div class="absolute bottom-0 left-0 h-72 w-72 translate-y-1/3 rounded-full bg-muted blur-3xl" />
      </div>

      <Button
        variant="ghost"
        class="absolute left-5 top-7"
        as-child
      >
        <NuxtLink to="/">
          <ChevronLeftIcon
            aria-hidden="true"
            class="me-2 size-4"
          />
          Home
        </NuxtLink>
      </Button>

      <div class="mx-auto my-auto w-full max-w-sm space-y-5">
        <div class="flex items-center gap-2 lg:hidden">
          <Grid2x2PlusIcon
            aria-hidden="true"
            class="size-6"
          />
          <p class="text-xl font-semibold">
            {{ APP_MANIFEST.name }}
          </p>
        </div>

        <slot />
      </div>
    </section>
  </main>
</template>
