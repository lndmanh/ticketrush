<template>
  <CommandDialog
    v-model:open="open"
  >
    <CommandInput
      v-model="input"
      :loading="searchLoading"
      :placeholder="$t(placeholderDetailed)"
      @keydown.enter="handleEnter"
      @keydown.down="handleNavigate(1)"
      @keydown.up="handleNavigate(-1)"
      @keydown.escape="handleClose"
    />
    <CommandList
      class="text-sm"
      @escape-key-down="handleClose"
    >
      <template v-if="!input?.length">
        <template
          v-for="item in navigation"
          :key="item.path"
        >
          <CommandGroup
            v-if="item.children"
            :heading="item.title"
            class="p-1.5"
          >
            <NuxtLink
              v-for="child in item.children"
              :key="child.stem"
              :to="child.path"
              @click="handleClose"
            >
              <CommandItem :value="child.path">
                <FileIcon class="mr-2 size-4" />
                <span>{{ child.title }}</span>
              </CommandItem>
            </NuxtLink>
          </CommandGroup>
          <CommandSeparator v-if="item.children" />
        </template>
        <CommandGroup
          heading="Theme"
          class="p-1.5"
        >
          <CommandItem
            value="light"
            @click="colorMode.preference = 'light'"
          >
            <CtIcon
              name="lucide:sun"
              class="mr-2 size-4"
            />
            <span>{{ $t('common.light') }}</span>
          </CommandItem>
          <CommandItem
            value="dark"
            @click="colorMode.preference = 'dark'"
          >
            <CtIcon
              name="lucide:moon"
              class="mr-2 size-4"
            />
            <span>{{ $t('common.dark') }}</span>
          </CommandItem>
          <CommandItem
            value="system"
            @click="colorMode.preference = 'auto'"
          >
            <CtIcon
              name="lucide:monitor"
              class="mr-2 size-4"
            />
            <span>{{ $t('common.system') }}</span>
          </CommandItem>
        </CommandGroup>
      </template>

      <div
        v-else-if="searchResult?.length"
        class="p-1.5 space-y-1"
      >
        <NuxtLinkLocale
          v-for="(item, i) in searchResult"
          :id="`search-result-${i}`"
          :key="item.id"
          :href="item.id"
          class="block select-none rounded-lg border border-transparent p-3 hover:cursor-pointer hover:bg-muted hover:border-border transition-colors"
          :class="[i === activeSelect && 'bg-muted border-border']"
          @click="handleClose"
        >
          <!-- Row 1: Navigation breadcrumb with highlighting -->
          <div class="flex items-center gap-1 text-xs text-muted-foreground mb-1.5 flex-wrap">
            <CtIcon
              v-if="getItemIcon(item.id)"
              :name="getItemIcon(item.id)"
              class="size-3.5 shrink-0"
            />
            <template
              v-for="(subtitle, j) in item.titles"
              :key="`${subtitle}${j}`"
            >
              <span
                class="truncate max-w-[140px]"
                v-html="highlightMatches(subtitle)"
              />
              <ChevronRightIcon
                v-if="item.titles.length > 1 && j !== item.titles.length - 1"
                class="size-3 shrink-0 text-muted-foreground/50"
              />
            </template>
          </div>

          <!-- Row 2: Section title with highlighting -->
          <div
            class="font-medium text-foreground leading-tight mb-1"
            v-html="highlightMatches(item.title)"
          />

          <!-- Row 3: Content preview with highlighting -->
          <div
            v-if="item.content"
            class="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
            v-html="highlightMatches(item.content)"
          />
        </NuxtLinkLocale>
      </div>

      <LoadingSpinner
        v-else-if="searchLoading"
        class="mx-auto"
        size="lg"
      />
      <Empty v-else>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>{{ $t('errors.no_result') }}</EmptyTitle>
          <EmptyDescription>{{ $t('blog.no_results_description') }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </CommandList>
  </CommandDialog>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import { ChevronRightIcon, FileIcon, SearchXIcon } from '@lucide/vue'
import CtIcon from '@/components/content/CtIcon.vue'
import { apiRequest } from '@/utils/apiRequest'
import { apiRoutes } from '#shared/apiRoutes'
import type { EventSearchApiItem } from '~~/types/events'
import type { SidebarItem } from '~~/types/common'

type EventSearchResultItem = {
  id: string
  title: string
  content: string
  titles: string[]
}

function hasSidebarUrl(item: SidebarItem): item is SidebarItem & { url: string } {
  return typeof item.url === 'string' && item.url.length > 0
}

const store = useSearchDialogStore()
const open = computed({
  get: () => store.open,
  set: (val: boolean) => store.setOpen(val),
})
const { setOpen } = store
const colorMode = useColorMode()
const { placeholderDetailed } = useConfig().value.search

const input = ref('')
const activeSelect = ref(0)
const searchLoading = ref(false)
const searchResult = ref<EventSearchResultItem[] | null>(null)
const latestRequestId = ref(0)

const { Meta_K, Ctrl_K } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) e.preventDefault()
  },
})

watch([Meta_K, Ctrl_K], (v) => {
  if (v[0] || v[1]) setOpen(true)
})

function resetState() {
  input.value = ''
  activeSelect.value = 0
  searchResult.value = null
}

function toSearchTitles(item: EventSearchApiItem) {
  const titles = ['Events']
  if (item.venueName) {
    titles.push(item.venueName)
  }
  return titles
}

// Debounced API search keeps payload small and avoids client-side full indexing.
const debouncedSearch = useDebounceFn(async () => {
  const term = input.value?.trim()
  if (!term) {
    searchResult.value = null
    searchLoading.value = false
    return
  }

  const requestId = latestRequestId.value + 1
  latestRequestId.value = requestId

  try {
    const response = await apiRequest(apiRoutes.EVENT_SEARCH, {
      query: {
        query: term,
        limit: 10,
      },
    })

    if (requestId !== latestRequestId.value) {
      return
    }

    if (!response.success) {
      throw response
    }

    const items = response.data
    searchResult.value = items.map(item => ({
      id: item.id,
      title: item.title,
      titles: toSearchTitles(item),
      content: item.content,
    }))
    activeSelect.value = 0
  }
  catch {
    if (requestId !== latestRequestId.value) {
      return
    }
    searchResult.value = []
  }
  finally {
    if (requestId === latestRequestId.value) {
      searchLoading.value = false
    }
  }
}, 200)

watch(input, (val) => {
  if (val?.trim()) {
    searchLoading.value = true
  }
  debouncedSearch()
})

function highlightMatches(text: string) {
  if (!text || !input.value) return text
  const searchTerms = input.value.trim().split(/\s+/).filter(t => t.length > 0)
  if (searchTerms.length === 0) return text

  const escapedTerms = searchTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi')

  return text.replace(regex, '<mark class="bg-primary/20 text-primary rounded px-0.5">$1</mark>')
}

const { primarySections, secondarySections } = useSidebarContext()
const navigation = computed(() => {
  const sections = [...primarySections.value, ...secondarySections.value]

  return sections
    .map(section => ({
      path: section.title,
      title: section.title,
      children: section.items
        .filter(hasSidebarUrl)
        .map(item => ({
          stem: item.url,
          path: item.url,
          title: item.title,
        })),
    }))
    .filter(section => section.children.length > 0)
})

function getItemIcon(_path: string) {
  return 'lucide:calendar-days'
}

watch(activeSelect, (value) => {
  document
    .querySelector(`[id="search-result-${value}"]`)
    ?.scrollIntoView({ block: 'nearest' })
})

function handleEnter() {
  if (searchResult.value?.[activeSelect.value]?.id) {
    const path = searchResult.value[activeSelect.value]?.id
    setOpen(false)
    resetState()

    nextTick(() => {
      navigateTo(path)
    })
  }
}

function handleNavigate(delta: -1 | 1) {
  if (!searchResult.value?.length) return
  const next = activeSelect.value + delta
  if (next >= 0 && next < searchResult.value.length) {
    activeSelect.value = next
  }
}

function handleClose() {
  setOpen(false)
  // Clear input after a short delay to allow dialog close animation
  nextTick(() => {
    setTimeout(() => {
      resetState()
    }, 150)
  })
}
</script>
