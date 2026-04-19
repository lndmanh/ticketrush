<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'
import { Loader2Icon } from '@lucide/vue'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  isLoading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  isLoading: false,
  disabled: false,
})
</script>

<template>
  <Primitive
    ref="buttonRef"
    data-slot="button"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    :disabled="props.disabled || props.isLoading"
  >
    <Loader2Icon
      v-if="isLoading"
      class="h-4 w-4 animate-spin"
    />
    <slot v-else />
  </Primitive>
</template>
