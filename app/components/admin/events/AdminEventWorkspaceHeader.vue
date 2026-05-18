<script setup lang="ts">
import type { Component } from 'vue'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatDateTime } from '@/lib/utils'

interface AdminEventWorkspaceMetric {
  label: string
  value: string | number
  detail: string
  icon?: Component
}

const props = defineProps<{
  eyebrow: string
  title: string
  description: string
  eventTitle: string
  eventStatus: string
  venueName: string
  startsAt: string | Date
  metrics: AdminEventWorkspaceMetric[]
}>()

const { locale, t } = useI18n()
const formattedStartsAt = computed(() => formatDateTime(props.startsAt, getDisplayDateLocale(locale.value)))
const formattedStatus = computed(() => props.eventStatus.replaceAll('_', ' '))
</script>

<template>
  <section class="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_24rem]">
    <div class="surface-shell overflow-hidden">
      <div class="surface-core min-h-[20rem] overflow-hidden p-0">
        <div class="relative flex min-h-[20rem] flex-col justify-between gap-8 rounded-[calc(2rem-0.375rem)] bg-[linear-gradient(135deg,rgba(15,23,42,1),rgba(30,41,59,0.96),rgba(71,85,105,0.9))] p-5 text-white md:p-7">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

          <div class="relative z-10 flex flex-wrap items-start justify-between gap-3">
            <span class="section-eyebrow border-white/10 bg-white/8 text-white">
              {{ eyebrow }}
            </span>

            <div class="flex flex-wrap gap-2">
              <span class="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-medium capitalize text-white/80 backdrop-blur-sm">
                {{ formattedStatus }}
              </span>
              <span class="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm">
                {{ formattedStartsAt }}
              </span>
            </div>
          </div>

          <div class="relative z-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end">
            <div class="space-y-4">
              <div class="space-y-2">
                <p class="text-sm uppercase tracking-[0.24em] text-white/58">
                  {{ venueName }}
                </p>
                <h1 class="text-balance text-3xl font-semibold leading-[0.98] tracking-[-0.08em] text-white md:text-5xl">
                  {{ eventTitle }}
                </h1>
              </div>

              <p class="max-w-[48rem] text-sm leading-7 text-white/74 md:text-base">
                {{ description }}
              </p>
            </div>

            <div class="rounded-[1.75rem] border border-white/10 bg-black/20 p-4 text-white/82 backdrop-blur-sm">
              <p class="text-[11px] uppercase tracking-[0.2em] text-white/60">
                {{ t('admin.event_workspace_note_title') }}
              </p>
              <p class="mt-2 text-sm leading-6">
                {{ t('admin.event_workspace_note_desc') }}
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <slot name="actions" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
      <Card
        v-for="metric in metrics"
        :key="metric.label"
        class="group border border-border bg-card transition-colors hover:border-primary/35"
      >
        <CardContent class="flex items-center gap-4 p-4">
          <div class="relative shrink-0">
            <div class="h-14 w-10 rounded-md bg-linear-to-br from-foreground/90 via-foreground/70 to-foreground/35" />
            <div
              v-if="metric.icon"
              class="absolute -bottom-0.5 -right-0.5 rounded-full bg-primary p-1 text-primary-foreground"
            >
              <component
                :is="metric.icon"
                class="size-3"
              />
            </div>
          </div>

          <div class="min-w-0 space-y-1">
            <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {{ metric.label }}
            </p>
            <p class="truncate text-lg font-semibold leading-tight text-foreground">
              {{ metric.value }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ metric.detail }}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
