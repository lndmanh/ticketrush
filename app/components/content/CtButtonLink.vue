<template>
  <NuxtLinkLocale
    :to="to || href"
    :target="(blank && '_blank') || target"
  >
    <Button
      :variant
      :size
    >
      <CtIcon
        v-if="leftIcon"
        :name="leftIcon"
        class="mr-1"
      />
      <slot mdc-unwrap="p" />
      <CtIcon
        v-if="rightIcon"
        :name="rightIcon"
        class="ml-1"
      />
    </Button>
  </NuxtLinkLocale>
</template>

<script setup lang="ts">
import type { Target } from '~~/types'
import type { ButtonVariants } from '../ui/button'
import CtIcon from './CtIcon.vue'

defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  leftIcon?: string
  rightIcon?: string
  to?: string
  href?: string
  target?: Target
  blank?: boolean
}>()
</script>
