<template>
  <Card
    class="overflow-clip py-0 gap-0 rounded-lg bg-card shadow-xs lg:grid lg:grid-cols-3 [&:not(:first-child)]:mt-5"
    :class="[inStack && 'mb-0 rounded-none border-none shadow-none']"
  >
    <div class="border-b lg:border-b-0 lg:border-r">
      <div
        v-if="title"
        class="flex items-center border-b p-3 text-sm"
      >
        {{ title }}
      </div>

      <ScrollArea :style="[`height: ${title ? height : height + 45}px`]">
        <CtCodeTreeRoot
          :id
          :default-value="defaultValue"
          :tree
          :level="0"
          class="p-2!"
        />
      </ScrollArea>
    </div>
    <div class="col-span-2">
      <div
        v-for="(slot, i) in $slots.default?.() ?? []"
        v-show="slot.props?.filename === open"
        :key="i"
      >
        <component
          :is="slot"
          :in-tree="true"
          :height
        />
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import type { FileTreeItem } from '~~/types'

const props = defineProps<{
  tree: FileTreeItem[]
  defaultValue: string
  height: number
  title?: string
  inStack?: boolean
}>()

const id = useId()
const codeTreeStore = useCodeTreeStore()
const open = codeTreeStore.getState(id, props.defaultValue)
</script>
