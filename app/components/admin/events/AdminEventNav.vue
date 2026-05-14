<script setup lang="ts">
import { BarChart3, LayoutGrid, Settings2, ShoppingCart, Tickets } from '@lucide/vue'

const props = defineProps<{
  eventId: number
}>()

const route = useRoute()
const { t } = useI18n()

const links = computed(() => [
  {
    label: t('admin.event_nav_overview'),
    to: `/admin/events/${props.eventId}`,
    icon: LayoutGrid,
  },
  {
    label: t('admin.event_nav_seatmap'),
    to: `/admin/events/${props.eventId}/seatmap`,
    icon: Tickets,
  },
  {
    label: t('admin.event_nav_pricing'),
    to: `/admin/events/${props.eventId}/pricing`,
    icon: Settings2,
  },
  {
    label: t('admin.event_nav_sales'),
    to: `/admin/events/${props.eventId}/sales`,
    icon: BarChart3,
  },
  {
    label: t('admin.event_nav_ops'),
    to: `/admin/events/${props.eventId}/ops`,
    icon: ShoppingCart,
  },
])

function isActive(target: string) {
  return route.path === target
}
</script>

<template>
  <div class="surface-shell overflow-hidden rounded-xl!">
    <div class="surface-core flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
      <div class="flex items-center gap-3">
        <div class="relative shrink-0">
          <div class="h-14 w-10 rounded-md bg-linear-to-br from-foreground/90 via-foreground/70 to-foreground/35" />
          <div class="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary p-1 text-primary-foreground">
            <LayoutGrid class="size-3" />
          </div>
        </div>
        <div class="min-w-0 space-y-1">
          <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {{ $t('admin.event_workspace_eyebrow') }}
          </p>
          <p class="text-sm font-semibold leading-tight text-foreground">
            {{ $t('admin.event_workspace_title') }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ $t('admin.event_workspace_desc') }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :class="[
            'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            isActive(link.to)
              ? 'border-primary bg-primary text-primary-foreground shadow-[0_20px_40px_-26px_rgba(0,0,0,0.35)]'
              : 'border-border bg-background text-muted-foreground hover:-translate-y-0.5 hover:border-primary/35 hover:text-foreground',
          ]"
        >
          <component
            :is="link.icon"
            class="size-4"
          />
          {{ link.label }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
