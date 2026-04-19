<template>
  <render />
</template>

<script setup lang="ts">
import type { SetupContext } from 'vue'
import CtCodeTreeInner from './CtCodeTreeInner.vue'
import type { FileTreeItem } from '~~/types'

const props = withDefaults(defineProps<{
  inStack?: boolean
  defaultValue?: string
  height?: number
  title?: string
}>(), {
  inStack: false,
  height: 400,
})

const _slots: SetupContext['slots'] = useSlots()
function render() {
  const slots = _slots?.default?.() || []
  const tree: FileTreeItem[] = []

  for (const slot of slots) {
    const parts: string[] = slot.props?.filename.split('/')
    if (parts[0] === '')
      parts.splice(0, 1)

    let p = tree
    parts.forEach((item, i) => {
      let node = p.find(x => x.title === item)
      const isFile = i === parts.length - 1
      if (!node) {
        node = {
          title: item,
          children: isFile ? undefined : [],
          diff: 'none',
          highlighted: false,
          icon: useFileIcon(item, isFile ? 'file' : 'folder'),
          path: slot.props?.filename,
        }
        p.push(node)
      }
      if (!isFile && node.children) {
        p = node.children
      }
    })
  }

  return h(
    CtCodeTreeInner,
    {
      height: props.height,
      defaultValue: props.defaultValue || slots[0]?.props?.filename || '',
      inStack: props.inStack,
      tree,
      title: props.title,
    },
    () => slots,
  )
}
</script>
