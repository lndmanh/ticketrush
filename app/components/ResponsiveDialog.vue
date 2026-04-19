<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

import { Dialog, DialogScrollContent, DialogTrigger } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { cn } from '~/lib/utils'

const isDesktop = useMediaQuery('(min-width: 768px)')

withDefaults(defineProps<{
  contentClass?: string
}>(), {
  contentClass: 'sm:max-w-lg',
})

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <Dialog
    v-if="isDesktop"
    v-model:open="open"
  >
    <DialogTrigger
      v-if="$slots.trigger"
      as-child
    >
      <slot name="trigger" />
    </DialogTrigger>
    <DialogScrollContent :class="cn(contentClass)">
      <slot />
    </DialogScrollContent>
  </Dialog>

  <Drawer
    v-else
    v-model:open="open"
  >
    <DrawerTrigger
      v-if="$slots.trigger"
      as-child
    >
      <slot name="trigger" />
    </DrawerTrigger>
    <DrawerContent
      class="max-h-[85vh] flex flex-col"
    >
      <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
        <slot />
      </div>
    </DrawerContent>
  </Drawer>
</template>
