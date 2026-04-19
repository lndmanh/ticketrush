<template>
  <div
    :class="
      cn(
        'z-10 w-full [--shadowColor:#bbb] dark:[--shadowColor:#111]',
        $props.class,
      )
    "
  >
    <div
      :class="[
        'relative aspect-[3/4] w-full',
        radiusMap[radius],
      ]"
    >
      <div
        :class="`
          absolute inset-y-0 overflow-hidden size-full left-0
          text-white flex flex-col justify-end p-6
          bg-gradient-to-tr
          ${computedGradient.from}
          ${computedGradient.to}
          ${radiusMap[radius]}
        `"
        :style="{
          boxShadow: shadowSizeMap[shadowSize],
          // minWidth: sizeMap[size].width,
        }"
      >
        <div
          class="absolute left-0 top-0 h-full"
          :style="{
            minWidth: '8.2%',
            background:
              'linear-gradient(90deg, hsla(0, 0%, 100%, 0), hsla(0, 0%, 100%, 0) 12%, hsla(0, 0%, 100%, .25) 29.25%, hsla(0, 0%, 100%, 0) 50.5%, hsla(0, 0%, 100%, 0) 75.25%, hsla(0, 0%, 100%, .25) 91%, hsla(0, 0%, 100%, 0)), linear-gradient(90deg, rgba(0, 0, 0, .03), rgba(0, 0, 0, .1) 12%, transparent 30%, rgba(0, 0, 0, .02) 50%, rgba(0, 0, 0, .2) 73.5%, rgba(0, 0, 0, .5) 75.25%, rgba(0, 0, 0, .15) 85.25%, transparent)',
            opacity: '0.2',
          }"
        />
        <div class="pl-1">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { computed } from 'vue'
import {
  BOOK_RADIUS_MAP as radiusMap,
  BOOK_COLOR_MAP as colorMap,
  BOOK_SHADOW_SIZE_MAP as shadowSizeMap,
  type BookRadius,
  type BookSize,
  type BookColor,
  type BookShadowSize,
} from './index'

interface BookProps {
  class?: HTMLAttributes['class']
  color?: BookColor
  radius?: BookRadius
  shadowSize?: BookShadowSize
  size?: BookSize
}

const props = withDefaults(defineProps<BookProps>(), {
  color: 'zinc',
  radius: 'md',
  shadowSize: 'lg',
  size: 'md',
})

const computedGradient = computed(() => {
  return colorMap[props.color] || colorMap.zinc
})
</script>
