<template>
  <div
    v-if="!page?.body"
    class="flex h-[calc(100vh-3.5rem)] items-center justify-center"
  >
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleXIcon />
        </EmptyMedia>
        <EmptyTitle>{{ $t('errors.not_found.title') }}</EmptyTitle>
        <EmptyDescription>{{ $t('errors.not_found.description') }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <InputGroup
          class="sm:w-3/4"
        >
          <InputGroupInput
            :placeholder="$t('cta.search_pages')"
            readonly
            @click.stop="openSearchDialog()"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        <EmptyDescription>
          <i18n-t keypath="cta.need_help">
            <template #contact>
              <NuxtLinkLocale href="/#contact">
                {{ $t('cta.contact') }}
              </NuxtLinkLocale>
            </template>
          </i18n-t>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  </div>

  <div v-else>
    <div
      v-if="page?.fullpage"
      class="px-4 py-6 md:px-8"
      :class="[config.main.padded && 'container']"
    >
      <ContentRenderer
        :key="page.id"
        :value="page"
        :data="config.data"
      />
    </div>
    <main
      v-else
      class="relative py-6"
      :class="[config.toc.enable && (page.toc ?? true) && 'lg:grid lg:grid-cols-[1fr_220px] lg:gap-14 lg:py-8']"
    >
      <div class="mx-auto w-full min-w-0">
        <LayoutBreadcrumb
          v-if="page?.body && config.main.breadCrumb && (page.breadcrumb ?? true)"
          class="mb-4"
        />
        <LayoutTitle
          v-if="config.main.showTitle"
          :title="page?.title"
          :description="page?.description"
          :badges="page?.badges"
          :authors="page?.authors"
        />

        <ContentRenderer
          :key="page.id"
          :value="page"
          :data="config.data"
          class="docs-content"
        />

        <LayoutDocsFooter />
      </div>
      <div
        v-if="config.toc.enable && (page.toc ?? true)"
        class="hidden text-sm lg:block"
      >
        <div
          class="sticky"
          :class="[
            (config.aside.useLevel && config.aside.levelStyle === 'aside') ? 'md:top-[91px]' : 'md:top-[133px]',
          ]"
        >
          <LayoutToc :is-small="false" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// import { findPageHeadline } from '@nuxt/content/utils'
import { CircleXIcon, SearchIcon } from '@lucide/vue'
import { usePageData } from '@/composables/usePageData'

const route = useRoute()
const routePath = computed(() => route.path)

// Shared data store — populated here, read everywhere
const { page, navigation, surroundings } = usePageData()

// Step 1: Fetch page content (SSR-blocking — this is the only query that must complete server-side)
const { data: pageData } = await useAsyncData(`page-${routePath.value}`, async () => {
  const data = await queryCollection('content').path(routePath.value).first()
  if (!data) {
    return await queryCollection('content').path(route.path.replace(/\/$/, '')).first()
  }
  return data
}, { watch: [routePath] })

// Sync page data to shared store
watch(pageData, (val) => {
  page.value = val ?? null
}, { immediate: true })

// Step 2: Fetch navigation server-side so docs layout is stable on first render
const { data: navData } = await useAsyncData('navigation', () => {
  return queryCollectionNavigation('content', ['title', 'description', 'path', 'icon', 'navBadges'])
})
watch(navData, (val) => {
  navigation.value = val ?? null
}, { immediate: true })

// Step 3: Keep surroundings lazy to avoid extra SSR work on every content request
const { data: surroundingsData } = useLazyAsyncData(`surroundings-${routePath.value}`, () => {
  return queryCollectionItemSurroundings('content', routePath.value, {
    fields: ['title', 'description', 'path', 'icon', 'navBadges'],
  })
}, { watch: [routePath], immediate: !!page.value })

watch(surroundingsData, (val) => {
  surroundings.value = (val as typeof surroundings.value) ?? null
}, { immediate: true })

const config = useConfig()

const title = computed(() => page.value?.seo?.title || page.value?.title)
const description = computed(() => page.value?.seo?.description || page.value?.description)

// const headline = computed(() => findPageHeadline(navigation.value, page.value?.path))

definePageMeta({
  layout: 'docs',
})

useSeo({
  title,
  description,
  type: 'article',
  modifiedAt: computed(() => (page.value as unknown as Record<string, unknown>)?.modifiedAt as string | undefined),
  breadcrumbs: page.value && navigation.value ? computed(() => findPageBreadcrumbs(navigation.value ?? undefined, page.value?.path || '')) : undefined,
})

// defineOgImageComponent(config.value.site.ogImageComponent, {
//   headline: headline.value,
//   title: page.value?.title,
//   description: page.value?.description,
// })

// if (page.value?.ogImage) {
//   defineOgImage(page.value?.ogImage)
// }

const { setOpen } = useSearchDialogStore()
function openSearchDialog() {
  setOpen(true)
}
</script>
