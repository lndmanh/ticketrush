<template>
  <template v-if="enable">
    <Button
      v-if="style === 'input'"
      variant="outline"
      class="text-muted-foreground hover:text-accent-foreground h-8 self-center rounded-md pr-1.5 font-normal"
      :class="[inAside ? 'mb-4' : 'md:w-40 lg:w-60']"
      @click="openSearchDialog"
    >
      <span class="mr-auto overflow-hidden">
        {{ $t(placeholder) }}
      </span>
      <Kbd class="ml-auto hidden md:block">
        <span class="text-xs">⌘</span>K
      </Kbd>
    </Button>
    <Button
      v-else
      variant="ghost"
      size="icon"
      @click="openSearchDialog"
    >
      <SearchIcon
        :size="18"
      />
    </Button>
  </template>

  <ClientOnly>
    <LazyHydrationLayoutSearchDialog />
  </ClientOnly>
</template>

<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'

const LazyHydrationLayoutSearchDialog = defineLazyHydrationComponent(
  'visible',
  () => import('./SearchDialog.vue'),
)

const { setOpen } = useSearchDialogStore()

defineProps<{
  enable: boolean
  inAside: boolean
  style: string
  placeholder: string
}>()

function openSearchDialog() {
  setOpen(true)
}
</script>
