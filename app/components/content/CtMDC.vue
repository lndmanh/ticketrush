<template>
  <ClientOnly>
    <ContentRenderer
      v-if="ast"
      :value="ast"
      :class="cn(props.class)"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  value: string
}>()

const ast = await parseMarkdown(props.value)
</script>
