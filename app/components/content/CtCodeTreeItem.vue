<template>
  <li>
    <div v-if="tree.children">
      <button
        type="button"
        class="text-foreground/80 hover:bg-muted hover:text-primary flex h-8 w-full cursor-pointer select-none items-center gap-2 rounded-md p-2 text-left text-sm font-medium transition-colors"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
      >
        <ChevronDownIcon
          class="transition-transform duration-200"
          :class="[!isOpen && '-rotate-90']"
          :size="16"
        />
        <CtIcon
          :name="tree.icon"
          class="min-w-4 max-w-5.5"
        />

        <span class="truncate">{{ tree.title }}</span>
      </button>

      <div v-show="isOpen">
        <CtCodeTreeRoot
          :id="id"
          :relaxed="relaxed"
          :tree="tree.children"
          :level="level + 1"
          :default-value="defaultValue"
        />
      </div>
    </div>

    <button
      v-else
      type="button"
      class="text-foreground/80 hover:bg-muted hover:text-primary flex h-8 w-full items-center gap-2 rounded-md p-2 text-sm font-medium transition-colors"
      :class="[
        state === tree.path ? 'bg-muted text-primary' : '',
      ]"
      @click="state = (tree.path || defaultValue)"
    >
      <CtIcon
        :name="tree.icon"
        class="min-w-4 max-w-5.5"
      />

      <span class="truncate">{{ tree.title }}</span>
    </button>
  </li>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FileTreeItem } from '~~/types'
import { ChevronDownIcon } from '@lucide/vue'
import CtIcon from './CtIcon.vue'

const props = defineProps<{
  tree: FileTreeItem
  level: number
  relaxed: boolean
  id: string
  defaultValue: string
}>()

const isOpen = ref(true)

const codeTreeStore = useCodeTreeStore()
// Assuming getState returns a writable ref or reactive property
const state = codeTreeStore.getState(props.id, props.defaultValue)
</script>
