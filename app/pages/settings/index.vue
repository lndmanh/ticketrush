<script setup lang="ts">
import {
  Bell,
  Brush,
  Clock3,
  ContactRound,
  CreditCard,
  Database,
  Globe2,
  KeyRound,
  Link2,
  Shield,
  UserRound,
} from '@lucide/vue'

const localePath = useLocalePath()
const { user } = useUserSession()

definePageMeta({
  title: 'Settings',
  breadcrumb: 'Settings',
  layout: 'dashboard',
  middleware: ['auth'],
})

const settingsGroups = computed(() => [
  {
    title: 'settings.group_account',
    items: [
      {
        title: 'settings.profile_title',
        description: 'settings.profile_desc',
        status: 'settings.status_coming_soon',
        icon: UserRound,
      },
      {
        title: 'settings.saved_attendees_title',
        description: 'settings.saved_attendees_desc',
        status: 'settings.status_available',
        href: localePath('/settings/saved-attendees'),
        icon: ContactRound,
      },
      {
        title: 'settings.privacy_data_title',
        description: 'settings.privacy_data_desc',
        status: 'settings.status_coming_soon',
        icon: Database,
      },
    ],
  },
  {
    title: 'settings.group_security',
    items: [
      {
        title: 'settings.security_title',
        description: 'settings.security_desc',
        status: 'settings.status_available',
        href: localePath('/settings/security'),
        icon: Shield,
      },
      {
        title: 'settings.connected_accounts_title',
        description: 'settings.connected_accounts_desc',
        status: 'settings.status_available',
        href: localePath('/settings/security'),
        icon: Link2,
      },
      {
        title: 'settings.sessions_title',
        description: 'settings.sessions_desc',
        status: 'settings.status_coming_soon',
        icon: KeyRound,
      },
    ],
  },
  {
    title: 'settings.group_preferences',
    items: [
      {
        title: 'settings.appearance_title',
        description: 'settings.appearance_desc',
        status: 'settings.status_in_header',
        icon: Brush,
      },
      {
        title: 'settings.language_region_title',
        description: 'settings.language_region_desc',
        status: 'settings.status_in_header',
        icon: Globe2,
      },
      {
        title: 'settings.notifications_title',
        description: 'settings.notifications_desc',
        status: 'settings.status_available',
        icon: Bell,
      },
    ],
  },
  {
    title: 'settings.group_commerce',
    items: [
      {
        title: 'settings.billing_title',
        description: 'settings.billing_desc',
        status: 'settings.status_coming_soon',
        icon: CreditCard,
      },
      {
        title: 'settings.ticket_preferences_title',
        description: 'settings.ticket_preferences_desc',
        status: 'settings.status_coming_soon',
        icon: Clock3,
      },
    ],
  },
  ...(user.value?.isAdmin
    ? [{
        title: 'settings.group_admin',
        items: [
          {
            title: 'settings.waiting_room_title',
            description: 'settings.waiting_room_desc',
            status: 'settings.status_admin',
            href: localePath('/admin/waiting-room'),
            icon: Clock3,
          },
        ],
      }]
    : []),
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

    <section
      v-for="group in settingsGroups"
      :key="group.title"
      class="space-y-3"
    >
      <h2 class="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {{ $t(group.title) }}
      </h2>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="item in group.items.filter(setting => setting.href)"
          :key="item.title"
          :to="item.href"
          class="group rounded-[1.5rem] border bg-card/70 p-5 transition-colors hover:border-primary/40 hover:bg-muted/35"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-background text-primary">
                <component
                  :is="item.icon"
                  class="size-5"
                />
              </div>
              <div class="space-y-2">
                <div class="space-y-1">
                  <h3 class="text-base font-semibold tracking-[-0.03em] text-foreground">
                    {{ $t(item.title) }}
                  </h3>
                  <p class="text-sm leading-6 text-muted-foreground">
                    {{ $t(item.description) }}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  class="rounded-full text-[10px]"
                >
                  {{ $t(item.status) }}
                </Badge>
              </div>
            </div>
          </div>
        </NuxtLink>

        <div
          v-for="item in group.items.filter(setting => !setting.href)"
          :key="item.title"
          class="rounded-[1.5rem] border bg-card/70 p-5 opacity-80"
        >
          <div class="flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-background text-muted-foreground">
              <component
                :is="item.icon"
                class="size-5"
              />
            </div>
            <div class="space-y-2">
              <div class="space-y-1">
                <h3 class="text-base font-semibold tracking-[-0.03em] text-foreground">
                  {{ $t(item.title) }}
                </h3>
                <p class="text-sm leading-6 text-muted-foreground">
                  {{ $t(item.description) }}
                </p>
              </div>
              <Badge
                variant="secondary"
                class="rounded-full text-[10px]"
              >
                {{ $t(item.status) }}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
