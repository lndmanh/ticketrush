<template>
  <div class="mt-16">
    <!-- Separator with links -->
    <div
      v-if="enabledDocsFooter"
      role="separator"
      class="flex w-full items-center text-center mt-6 mb-10"
    >
      <div class="w-full border-t border-border" />
      <div class="mx-3 flex whitespace-nowrap font-medium">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <NuxtLinkLocale
            :to="main.issueLink.pattern"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <CtIcon
              :name="main.issueLink.icon"
              class="size-3.5"
            />
            <span class="truncate">{{ $t(main.issueLink.text) }}</span>
          </NuxtLinkLocale>

          <span class="text-xs text-muted-foreground/50">·</span>

          <NuxtLinkLocale
            :to="url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <CtIcon
              :name="icon"
              class="size-3.5"
            />
            <span class="truncate">{{ $t(text) }}</span>
          </NuxtLinkLocale>
        </div>
      </div>
      <div class="w-full border-t border-border" />
    </div>

    <LayoutPrevNext />

    <div class="flex">
      <LayoutCarbonAds
        v-if="!isDesktop && carbonAdsEnabled"
        class="mx-auto"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CtIcon from '@/components/content/CtIcon.vue'

const { toc, main } = useConfig().value
const isDesktop = useMediaQuery('(min-width: 1024px)')
const { url, enabledDocsFooter, text, icon } = useEditLink()

const carbonAdsEnabled = computed(
  () => toc.carbonAds.enable && !toc.carbonAds.disableInMobile && !(import.meta.dev && toc.carbonAds.disableInDev),
)
</script>
