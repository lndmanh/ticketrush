<script setup lang="ts">
import { computed, type Component } from 'vue'
import { ArrowRight, Clock3 } from '@lucide/vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'

interface AdminFeaturedEventCardProps {
  eyebrow: string
  title: string
  venueName: string
  startsAt: string | Date
  status: string
  href: string
  openLabel?: string
  secondaryHref?: string | null
  secondaryLabel?: string
  leadingIcon?: Component
}

const props = withDefaults(defineProps<AdminFeaturedEventCardProps>(), {
  openLabel: 'Open event',
  secondaryLabel: 'View all',
  secondaryHref: null,
  leadingIcon: undefined,
})

const { locale } = useI18n()
const formattedStartsAt = computed(() => new Date(props.startsAt).toLocaleString(getDisplayDateLocale(locale.value)))
const formattedStatus = computed(() => props.status.replaceAll('_', ' '))
const badgeIcon = computed(() => props.leadingIcon ?? Clock3)
</script>

<template>
  <Card class="group border border-border bg-card transition-colors hover:border-primary/50">
    <CardContent class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-start gap-4">
        <div class="relative shrink-0">
          <div class="h-14 w-10 rounded-md bg-linear-to-br from-foreground/90 via-foreground/70 to-foreground/40" />
          <div class="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary p-0.5">
            <component
              :is="badgeIcon"
              class="size-2.5 fill-current text-primary-foreground"
            />
          </div>
        </div>

        <div class="min-w-0 space-y-1">
          <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {{ eyebrow }}
          </p>
          <p class="truncate text-sm font-semibold leading-tight text-foreground">
            {{ title }}
          </p>
          <p class="truncate text-xs text-muted-foreground">
            {{ venueName }} · {{ formattedStartsAt }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full border bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
          {{ formattedStatus }}
        </span>

        <Button
          as-child
          size="sm"
          variant="outline"
          class="group-hover:border-primary/50"
        >
          <NuxtLink :to="href">
            {{ openLabel }}
            <ArrowRight class="size-4" />
          </NuxtLink>
        </Button>

        <Button
          v-if="secondaryHref"
          as-child
          size="sm"
          variant="outline"
        >
          <NuxtLink :to="secondaryHref">
            {{ secondaryLabel }}
          </NuxtLink>
        </Button>

        <slot name="actions" />
      </div>
    </CardContent>
  </Card>
</template>
