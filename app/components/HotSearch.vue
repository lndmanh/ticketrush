<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { Search } from '@lucide/vue'
import { getAllSidebarItems } from '@/constants/sidebar'
import { useHotSearch } from '@/composables/useHotSearch'

const { isOpen: hotSearchOpen, toggleIsOpen, setIsOpen } = useHotSearch()
const searchQuery = ref('')

const features = getAllSidebarItems()

const filteredFeatures = computed(() => {
  if (!searchQuery.value) return features
  const query = searchQuery.value.toLowerCase()
  return features.filter(feature => feature.title.toLowerCase().includes(query))
})

const handleSelectFeature = (feature: typeof features[number]) => {
  if (!feature.url)
    return

  navigateTo(feature.url)
  setIsOpen(false)
}

const handleSearchFallback = () => {
  navigateTo({ path: '/search', query: { title: searchQuery.value } })
  setIsOpen(false)
}

// Keyboard shortcut

const { Meta_K, Ctrl_K } = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey))
      e.preventDefault()
  },
})

watch([Meta_K, Ctrl_K], (v) => {
  if (v[0] || v[1])
    toggleIsOpen()
})
</script>

<template>
  <Command>
    <CommandDialog
      v-model:open="hotSearchOpen"
    >
      <CommandInput
        v-model="searchQuery"
        placeholder="Search features..."
      />
      <CommandList>
        <template v-if="filteredFeatures.length > 0">
          <CommandGroup heading="Features">
            <CommandItem
              v-for="(feature, i) in filteredFeatures"
              :key="i"
              :value="feature.url ?? feature.title"
              @select="() => handleSelectFeature(feature)"
            >
              <component
                :is="feature.icon"
                class="mr-2 h-4 w-4"
              />
              <span>{{ feature.title }}</span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup
            v-if="searchQuery"
            heading="Search"
          >
            <CommandItem
              :value="'Search for ' + searchQuery"
              @select="handleSearchFallback"
            >
              <Search class="mr-2 h-4 w-4" />
              <span>Search for "{{ searchQuery }}"</span>
            </CommandItem>
          </CommandGroup>
        </template>

        <Empty v-else>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search class="size-5" />
            </EmptyMedia>
            <EmptyTitle>No matching features</EmptyTitle>
            <EmptyDescription>
              Try another keyword, or search the library directly.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CommandList>
    </CommandDialog>
  </Command>
</template>
