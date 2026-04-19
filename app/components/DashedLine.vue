<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  class?: string
}>(), {
  orientation: 'horizontal',
})

const isHorizontal = computed(() => props.orientation === 'horizontal')
</script>

<template>
  <div
    :class="cn(
      'text-muted-foreground relative',
      isHorizontal ? 'h-px w-full' : 'h-full w-px',
      props.class,
    )"
  >
    <div
      :class="cn(
        isHorizontal
          ? [
            'h-px w-full',
            'bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,currentColor_4px,currentColor_10px)]',
            '[mask-image:linear-gradient(90deg,transparent,black_25%,black_75%,transparent)]',
          ]
          : [
            'h-full w-px',
            'bg-[repeating-linear-gradient(180deg,transparent,transparent_4px,currentColor_4px,currentColor_10px)]',
            '[mask-image:linear-gradient(180deg,transparent,black_25%,black_75%,transparent)]',
          ],
      )"
    />
  </div>
</template>
