<template>
  <header
    class="bg-background/80 sticky top-0 z-40 backdrop-blur-lg"
    :class="{ 'border-b': config.header.border }"
  >
    <div
      class="flex h-14 items-center justify-between gap-2 px-4 md:px-8"
      :class="{
        'container max-w-screen-2xl': config.main.padded,
      }"
    >
      <LayoutHeaderLogo class="hidden flex-1 md:flex" />
      <LayoutMobileNav />
      <LayoutHeaderLogo
        v-if="config.header.showTitleInMobile"
        class="flex md:hidden"
      />
      <LayoutHeaderNav class="hidden flex-1 lg:flex" />
      <div class="flex flex-1 justify-end gap-2">
        <LayoutSearchButton
          v-if="!config.search.inAside && config.search.style === 'input'"
          :enable="config.search.enable"
          :in-aside="config.search.inAside"
          :style="config.search.style"
          :placeholder="config.search.placeholder"
        />
        <div class="flex">
          <LayoutSearchButton
            v-if="!config.search.inAside && config.search.style === 'button'"
            :enable="config.search.enable"
            :in-aside="config.search.inAside"
            :style="config.search.style"
            :placeholder="config.search.placeholder"
          />
          <LangSwitcher v-if="i18nEnabled" />
          <ThemePopover v-if="config.theme.customizable" />
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
              >
                <SunIcon class="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <MoonIcon class="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span class="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
            >
              <ThemeSwitcher />
            </DropdownMenuContent>
          </DropdownMenu>
          <NuxtLinkLocale
            v-for="(link, i) in config.header.links"
            :key="i"
            :to="link?.to"
            :target="link?.target"
          >
            <Button
              variant="ghost"
              size="icon"
              class="flex gap-2"
            >
              <CtIcon
                v-if="link?.icon"
                :name="link.icon"
                :size="18"
              />
            </Button>
          </NuxtLinkLocale>
        </div>
      </div>
    </div>
    <div
      v-if="baseRouteName !== 'index' && config.aside.levelStyle === 'header'"
      class="md:mt-2 md:px-8"
      :class="{
        'md:container md:max-w-screen-2xl': config.main.padded,
      }"
    >
      <LayoutHeaderTopLevelNav />
    </div>
    <div
      v-if="showToc"
      class="lg:hidden"
    >
      <LayoutToc is-small />
    </div>
  </header>
</template>

<script setup lang="ts">
import CtIcon from '@/components/content/CtIcon.vue'
import { SunIcon, MoonIcon } from '@lucide/vue'

const config = useConfig()
const { i18nEnabled } = useI18nDocs()

const showToc = computed(() => {
  return config.value.toc.enable
    && config.value.toc.enableInMobile
})

const route = useRoute()
const baseRouteName = computed(() => useRouteBaseName()(route))
</script>
