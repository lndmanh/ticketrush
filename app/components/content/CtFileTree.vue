<template>
  <Card
    class="relative overflow-hidden py-0 gap-0 rounded-lg bg-card shadow-xs [&:not(:first-child)]:mt-5 [&:not(:last-child)]:mb-5"
  >
    <div
      v-if="title"
      class="flex items-center border-b p-3 font-mono text-sm"
    >
      <CtIcon
        v-if="icon"
        :name="icon"
        class="mr-1.5"
      />
      <span>{{ title }}</span>
    </div>

    <div class="bg-muted/30 w-auto p-2">
      <CtFileTreeRoot
        :tree="parsedTree"
        :show-arrow
        :show-icon
        :level="0"
      />
    </div>
  </Card>
</template>

<script setup lang="ts">
import type { FileTreeItem, FileTreeItemDiff, InputTreeItem } from '~~/types'
import CtIcon from './CtIcon.vue'

const props = withDefaults(defineProps<{
  tree: InputTreeItem[]
  title?: string
  icon?: string
  autoSlash?: boolean
  showArrow?: boolean
  showIcon?: boolean
}>(), {
  autoSlash: true,
  showArrow: false,
  showIcon: true,
})

function getItem(key: string, type: 'folder' | 'file', children?: InputTreeItem[]): FileTreeItem {
  let title = key
  let highlighted = false
  if (title.startsWith('^') && title.endsWith('^')) {
    title = title.substring(1, title.length - 1)
    highlighted = true
  }

  let diff: FileTreeItemDiff = 'none'
  if (title.startsWith('+'))
    diff = 'addition'
  else if (title.startsWith('-'))
    diff = 'deletion'

  if (type === 'file') {
    return {
      title,
      icon: useFileIcon(title, 'file'),
      highlighted,
      diff,
    }
  }
  else {
    return {
      title: `${title}${props.autoSlash ? '/' : ''}`,
      icon: useFileIcon(title, 'folder'),
      children: children && getTree(children),
      highlighted,
      diff,
    }
  }
}

function getTree(tree: InputTreeItem[]) {
  const res: FileTreeItem[] = []

  for (const item of tree) {
    if (typeof item === 'string') {
      res.push(getItem(item, 'file'))
    }
    else if (typeof item === 'object') {
      for (const key of Object.keys(item))
        res.push(getItem(key, 'folder', item[key]))
    }
  }

  return res
}

const parsedTree = computed(() => {
  return getTree(props.tree)
})
</script>
