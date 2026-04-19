<template>
  <NuxtLinkLocale
    v-if="prevNext && prevNext.path"
    :to="prevNext.path"
    class="group flex-1 min-w-0"
  >
    <div
      class="relative h-full rounded-xl border border-border/60 bg-card/50 p-5 transition-all duration-300 ease-out hover:border-border hover:bg-accent/40 hover:shadow-sm"
    >
      <div
        class="flex items-center gap-4"
        :class="[side === 'right' ? 'flex-row-reverse' : 'flex-row']"
      >
        <!-- Arrow -->
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/30 transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/10"
        >
          <component
            :is="side === 'left' ? ArrowLeftIcon : ArrowRightIcon"
            :size="14"
            class="text-muted-foreground transition-all duration-300 group-hover:text-primary"
            :class="[
              side === 'left'
                ? 'group-hover:-translate-x-0.5'
                : 'group-hover:translate-x-0.5',
            ]"
          />
        </div>

        <!-- Content -->
        <div
          class="min-w-0 space-y-1"
          :class="[side === 'right' ? 'text-right' : 'text-left']"
        >
          <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            {{ side === 'left' ? $t('Previous') : $t('Next') }}
          </div>
          <div class="truncate text-sm font-semibold text-foreground/90 transition-colors duration-300 group-hover:text-foreground">
            {{ prevNext.title }}
          </div>
          <div
            v-if="prevNext.description"
            class="line-clamp-1 text-xs text-muted-foreground/70"
          >
            {{ prevNext.description }}
          </div>
        </div>
      </div>
    </div>
  </NuxtLinkLocale>
</template>

<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'
import { ArrowLeftIcon, ArrowRightIcon } from '@lucide/vue'

defineProps<{
  prevNext: ContentNavigationItem
  side: 'left' | 'right'
}>()
</script>
