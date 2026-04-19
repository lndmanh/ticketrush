<template>
  <NuxtLinkLocale
    v-if="to"
    :to
    :target
    class="mx-0.5"
  >
    <Badge
      :variant
      class="rounded-full font-semibold px-2.5"
      :class="[
        typeTwClass[type],
        size === 'sm' && 'rounded-md px-1.5 py-0.5 text-xs font-normal leading-none',
      ]"
    >
      <slot mdc-unwrap="p" />
    </Badge>
  </NuxtLinkLocale>

  <span
    v-else
    class="mx-0.5"
  >
    <Badge
      :variant
      class="rounded-full font-semibold px-2.5"
      :class="[
        typeTwClass[type],
        size === 'sm' && 'rounded-md px-1.5 py-0.5 text-xs font-normal leading-none',
      ]"
    >
      <slot mdc-unwrap="p" />
    </Badge>
  </span>
</template>

<script setup lang="ts">
import type { Target } from '~~/types'

const props = withDefaults(defineProps<{
  type?: 'default' | 'info' | 'warning' | 'success' | 'danger' | 'lime'
  to?: string
  target?: Target
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  size?: 'md' | 'sm'
}>(), {
  type: 'default',
  variant: 'default',
  size: 'md',
})

const typeTwClass = {
  default: '',
  info: `${props.variant !== 'outline' && 'bg-sky-500 hover:bg-sky-400'} ${props.variant === 'outline' && 'border-sky-500 text-sky-500'}`,
  warning: `${props.variant !== 'outline' && 'bg-amber-500 hover:bg-amber-400'} ${props.variant === 'outline' && 'border-amber-500 text-amber-500'}`,
  success: `${props.variant !== 'outline' && 'bg-green-500 hover:bg-green-400'} ${props.variant === 'outline' && 'border-green-500 text-green-500'}`,
  danger: `${props.variant !== 'outline' && 'bg-red-500 hover:bg-red-400'} ${props.variant === 'outline' && 'border-red-500 text-red-500'}`,
  lime: `${props.variant !== 'outline' && 'bg-[#adfa1d] hover:bg-[#adfa1d] text-black'} ${props.variant === 'outline' && 'border-[#adfa1d] text-black'}`,
}
</script>
