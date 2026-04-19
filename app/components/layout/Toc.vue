<template>
  <ScrollArea
    v-if="!isSmall"
    orientation="vertical"
    class="z-30 hidden overflow-y-auto md:block lg:block"
    type="hover"
  >
    <div
      class="flex flex-col gap-5"
      :class="[
        (config.aside.useLevel && config.aside.levelStyle === 'aside') ? 'h-[calc(100vh-6.5rem)]' : 'h-[calc(100vh-10rem)]',
      ]"
    >
      <div v-if="toc?.links.length">
        <p class="mb-2 text-base font-semibold">
          {{ $t(title) }}
        </p>
        <LayoutTocTree
          :links="toc.links.filter((x: any) => x.id !== 'hide-toc')"
          :level="0"
          :class="[(links.length || iconLinks?.length) && 'border-b pb-5']"
        />
      </div>
      <div
        v-if="links.length"
        class="text-muted-foreground"
        :class="[iconLinks?.length && 'border-b pb-5']"
      >
        <NuxtLinkLocale
          v-for="(link, i) in links"
          :key="i"
          :to="link.to"
          :target="link.target"
          class="flex w-full gap-1 underline-offset-4 hover:underline [&:not(:first-child)]:pt-3"
        >
          <CtIcon
            v-if="link.icon"
            :name="link.icon"
            class="mr-1 self-center"
          />
          {{ $t(link.title) }}
          <ArrowUpRightIcon
            class="text-muted-foreground ml-auto self-center"
            :size="13"
          />
        </NuxtLinkLocale>
      </div>
      <div
        v-if="iconLinks"
        class="text-muted-foreground"
      >
        <NuxtLinkLocale
          v-for="(link, i) in iconLinks"
          :key="i"
          :to="link.to"
          :target="link.target"
        >
          <Button
            size="icon"
            variant="ghost"
            class="size-7"
          >
            <CtIcon
              v-if="link.icon"
              :name="link.icon"
            />
          </Button>
        </NuxtLinkLocale>
      </div>
      <div class="flex-grow" />
      <LayoutCarbonAds v-if="isDesktop && carbonAdsEnabled" />
    </div>
  </ScrollArea>
  <Collapsible
    v-else
    v-model:open="isOpen"
    class="block w-full text-sm lg:hidden"
  >
    <CollapsibleTrigger class="flex w-full px-4 md:px-8 py-3 text-left font-medium">
      {{ $t(title) }}
      <ChevronRightIcon
        class="ml-auto self-center transition-all"
        :class="[isOpen && 'rotate-90']"
      />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <LayoutTocTree
        :links="toc.links"
        :level="0"
        class="mx-4 mb-3 pl-2 text-sm"
      />
    </CollapsibleContent>
  </Collapsible>
</template>

<script setup lang="ts">
import CtIcon from '@/components/content/CtIcon.vue'
import { ArrowUpRightIcon, ChevronRightIcon } from '@lucide/vue'
import { usePageData } from '@/composables/usePageData'
import type { Toc } from '@nuxt/content'

defineProps<{ isSmall: boolean }>()
const route = useRoute()
const config = useConfig()

const toc = ref<{ links: Toc[] }>({ links: [] })

// Get page data from shared composable
const { page } = usePageData()

// Extract TOC from rendered DOM on client side (similar to TocTree approach)
onMounted(() => {
  updateToc()
})

watch(() => route.path, () => {
  nextTick(() => {
    updateToc()
  })
})

function updateToc() {
  // Check if TOC exists on page data first
  if (page.value?.toc && page.value.toc.links && page.value.toc.links.length > 0) {
    toc.value = page.value.toc
    return
  }

  // Wait a bit for content to render, then extract headings from DOM
  setTimeout(() => {
    const contentElement = document.querySelector('.docs-content')
    if (!contentElement) {
      toc.value = { links: [] }
      return
    }

    const headingElements = contentElement.querySelectorAll('h2[id], h3[id], h4[id]')
    const headings: any[] = []

    headingElements.forEach((el) => {
      const id = el.id
      if (!id) return

      const depth = parseInt(el.tagName.charAt(1))
      const text = el.textContent?.trim() || ''

      headings.push({
        id,
        text,
        depth,
        children: [],
      })
    })

    // If no headings with IDs found, try without ID requirement and generate IDs
    if (headings.length === 0) {
      const allHeadings = contentElement.querySelectorAll('h2, h3, h4')
      allHeadings.forEach((el) => {
        const text = el.textContent?.trim() || ''
        if (!text) return

        // Generate ID from text if not present
        let id = el.id
        if (!id) {
          id = text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || `heading-${headings.length}`
          // Set the ID on the element for future reference
          el.id = id
        }

        const depth = parseInt(el.tagName.charAt(1))

        headings.push({
          id,
          text,
          depth,
          children: [],
        })
      })
    }

    // Build hierarchy
    const result: any[] = []
    const stack: any[] = []

    headings.forEach((heading) => {
      // Pop stack until we find a parent
      while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) {
        stack.pop()
      }

      if (stack.length === 0) {
        result.push(heading)
      }
      else {
        const parent = stack[stack.length - 1]
        if (!parent.children) parent.children = []
        parent.children.push(heading)
      }

      stack.push(heading)
    })

    toc.value = { links: result }
  }, 100)
}

const { title, links: configLinks, iconLinks, carbonAds } = useConfig().value.toc

const isDesktop = useMediaQuery('(min-width: 1024px)')
const carbonAdsEnabled = computed(
  () => carbonAds.enable && !(import.meta.dev && carbonAds.disableInDev),
)

const isOpen = ref(false)

const { url, enabledToc, text, icon } = useEditLink()

const links = computed(
  () => {
    if (enabledToc.value) {
      return configLinks.concat([{
        title: text,
        icon,
        to: url.value,
        target: '_blank',
        showLinkIcon: true,
      }])
    }
    return configLinks
  },
)
</script>
