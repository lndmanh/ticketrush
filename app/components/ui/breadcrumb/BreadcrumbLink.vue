<script lang="ts" setup>
import type { HTMLAttributes } from 'vue'
import type { NuxtLinkProps } from '#app'

import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<NuxtLinkProps & { class?: HTMLAttributes['class'] }>(), {})
</script>

<template>
  <NuxtLink
    data-slot="breadcrumb-link"
    v-bind="props"
    :class="cn('hover:text-foreground transition-colors', props.class)"
    prefetch-on="interaction"
  >
    <slot />
  </NuxtLink>
</template>
