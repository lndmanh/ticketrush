<script setup lang="ts">
import { computed } from 'vue'
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'
import { Loader2Icon } from '@lucide/vue'
import { isEmpty } from 'es-toolkit/compat'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  isLoading?: boolean
  disabled?: boolean
  title?: HTMLAttributes['title']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  isLoading: false,
  disabled: false,
})

const tooltipTitle = computed(() => {
  return isEmpty(props.title) ? '' : String(props.title)
})

const hasTooltipTitle = computed(() => tooltipTitle.value.length > 0)

// Consolidate shared attributes to eliminate template duplication
const primitiveProps = computed(() => ({
  as: props.as,
  'as-child': props.asChild,
  class: cn(buttonVariants({ variant: props.variant, size: props.size }), props.class),
  disabled: props.disabled || props.isLoading,
  'data-slot': 'button',
}))
</script>

<template>
  <Tooltip v-if="hasTooltipTitle">
    <TooltipTrigger as-child>
      <Primitive v-bind="primitiveProps" :title="undefined">
        <Loader2Icon v-if="isLoading" class="h-4 w-4 animate-spin" />
        <slot v-else />
      </Primitive>
    </TooltipTrigger>
    <TooltipContent side="top" align="center">
      {{ tooltipTitle }}
    </TooltipContent>
  </Tooltip>

  <Primitive v-else v-bind="primitiveProps" :title="title">
    <Loader2Icon v-if="isLoading" class="h-4 w-4 animate-spin" />
    <slot v-else />
  </Primitive>
</template>
