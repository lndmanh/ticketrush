<template>
  <ScrollArea
    orientation="vertical"
    class="relative h-full overflow-hidden py-6 pr-6 text-sm md:pr-4"
    type="hover"
  >
    <LayoutHeaderNavMobile
      v-if="isMobile"
      class="mb-5 border-b pb-2"
    />
    <LayoutSearchButton
      v-if="config.search.inAside"
      :enable="config.search.enable"
      :in-aside="config.search.inAside"
      :style="config.search.style"
      :placeholder="config.search.placeholder"
    />
    <ul
      v-if="config.aside.useLevel && config.aside.levelStyle === 'aside'"
      class="flex flex-col gap-1 border-b pb-4"
    >
      <li
        v-for="link in navigation"
        :key="link.stem"
      >
        <NuxtLinkLocale
          :to="link.redirect ?? link.path"
          class="text-foreground/80 hover:bg-muted hover:text-primary flex h-8 items-center gap-2 rounded-md p-2 text-sm"
          :class="[
            $route.path.startsWith(link.path) && 'bg-muted !text-primary font-medium',
          ]"
        >
          <CtIcon
            v-if="link.icon"
            :name="link.icon"
            class="self-center"
            :size="16"
          />
          {{ link.title }}

          <span
            v-for="(badge, i) in link.navBadges"
            :key="i"
          >
            <Badge
              :variant="badge.variant"
              :type="badge.type"
              :size="badge.size ?? 'sm'"
            >
              {{ badge.value }}
            </Badge>
          </span>
        </NuxtLinkLocale>
      </li>
    </ul>
    <LayoutAsideTree
      v-if="tree"
      :links="tree"
      :level="0"
      :class="[(config.aside.useLevel && config.aside.levelStyle === 'aside') ? 'pt-4' : 'pt-1']"
    />
  </ScrollArea>
</template>

<script setup lang="ts">
import { useContentHelpers } from '@/composables/useContentHelpers'
import CtIcon from '@/components/content/CtIcon.vue'

defineProps<{ isMobile: boolean }>()

const route = useRoute()
const config = useConfig()
const { locale, defaultLocale } = useI18n()
const { navDirFromPath } = useContentHelpers()

const { navigation } = usePageData()

const tree = computed(() => {
  const path = route.path.split('/')
  if (config.value.aside.useLevel) {
    const leveledPath = path.splice(0, locale.value === defaultLocale ? 2 : 3).join('/')

    if (navigation.value) {
      const dir = navDirFromPath(leveledPath, navigation.value)
      return dir ?? []
    }
    else {
      return []
    }
  }

  return navigation.value
})
</script>
