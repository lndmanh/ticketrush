<template>
  <NavigationMenu>
    <NavigationMenuList>
      <template v-if="eventBreadcrumbTitle">
        <NavigationMenuItem class="relative">
          <NuxtLinkLocale to="/events">
            <div
              :class="navigationMenuTriggerStyle()"
              class="bg-transparent font-semibold"
            >
              {{ $t('nav.events') }}
            </div>
          </NuxtLinkLocale>
        </NavigationMenuItem>
        <NavigationMenuItem class="relative">
          <div
            :class="navigationMenuTriggerStyle()"
            class="pointer-events-none bg-transparent font-semibold text-muted-foreground"
          >
            / {{ eventBreadcrumbTitle }}
          </div>
        </NavigationMenuItem>
      </template>
      <NavigationMenuItem
        v-for="(item, i) in eventBreadcrumbTitle ? [] : nav"
        :key="i"
        class="relative"
      >
        <template v-if="item.links">
          <NavigationMenuTrigger class="bg-transparent font-semibold">
            {{ $t(item.title) }}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul class="w-[250px] p-2">
              <li
                v-for="link in item.links"
                :key="link.title"
              >
                <NuxtLinkLocale
                  :to="link.to"
                  :target="link.target"
                  class="hover:bg-muted mb-1 flex w-full gap-2 rounded-md px-3 py-2 transition-all"
                >
                  <CtIcon
                    v-if="link?.icon"
                    :name="link.icon"
                    :size="16"
                    class="mt-1 min-w-5"
                  />

                  <div>
                    <div
                      v-if="link.title"
                      class="font-semibold"
                    >
                      {{ $t(link.title) }}
                    </div>
                    <div
                      v-if="link.description"
                      class="text-muted-foreground text-sm"
                    >
                      {{ $t(link.description) }}
                    </div>
                  </div>
                </NuxtLinkLocale>
              </li>
            </ul>
          </NavigationMenuContent>
        </template>
        <NuxtLinkLocale
          v-else
          :to="item.to"
          :target="item.target"
        >
          <ArrowUpRightIcon
            v-if="item.showLinkIcon ?? true"
            class="text-muted-foreground absolute right-2 top-2"
            :size="13"
          />
          <div
            class="bg-transparent font-semibold"
            :class="[navigationMenuTriggerStyle(), (item.showLinkIcon ?? true) && 'pr-6']"
          >
            {{ $t(item.title) }}
          </div>
        </NuxtLinkLocale>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon } from '@lucide/vue'
import { navigationMenuTriggerStyle, NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu'

import CtIcon from '@/components/content/CtIcon.vue'

const { nav } = useConfig().value.header
const route = useRoute()

const eventBreadcrumbTitle = computed(() => {
  if (!route.path.startsWith('/events/') || route.path.includes('/sessions/')) {
    return ''
  }

  const slug = route.params.slug
  if (typeof slug !== 'string') {
    return ''
  }

  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
})
</script>
