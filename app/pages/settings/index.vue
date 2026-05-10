<script setup lang="ts">
import { ArrowRight, ContactRound, Shield } from '@lucide/vue'

const localePath = useLocalePath()

definePageMeta({
  title: 'Settings',
  breadcrumb: 'Settings',
  layout: 'dashboard',
  middleware: ['auth'],
})

const settingsSections = computed(() => [
  {
    title: 'settings.overview_security_title',
    description: 'settings.overview_security_desc',
    href: localePath('/settings/security'),
    icon: Shield,
  },
  {
    title: 'settings.overview_saved_attendees_title',
    description: 'settings.overview_saved_attendees_desc',
    href: localePath('/settings/saved-attendees'),
    icon: ContactRound,
  },
])
</script>

<template>
  <main class="space-y-6">
    <section class="rounded-[1.5rem] border bg-card/70 p-6 shadow-sm">
      <p class="section-eyebrow">
        {{ $t('settings.overview_eyebrow') }}
      </p>
      <div class="mt-3 max-w-3xl space-y-2">
        <h1 class="text-3xl font-semibold tracking-[-0.05em] text-foreground md:text-4xl">
          {{ $t('settings.overview_title') }}
        </h1>
        <p class="text-sm leading-6 text-muted-foreground md:text-base">
          {{ $t('settings.overview_desc') }}
        </p>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <NuxtLink
        v-for="section in settingsSections"
        :key="section.href"
        :to="section.href"
        class="group rounded-[1.5rem] border bg-card/70 p-5 transition-colors hover:border-primary/40 hover:bg-muted/35"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-background text-primary">
              <component
                :is="section.icon"
                class="size-5"
              />
            </div>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold tracking-[-0.03em] text-foreground">
                {{ $t(section.title) }}
              </h2>
              <p class="text-sm leading-6 text-muted-foreground">
                {{ $t(section.description) }}
              </p>
            </div>
          </div>
          <ArrowRight class="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </NuxtLink>
    </section>
  </main>
</template>
