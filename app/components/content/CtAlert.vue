<template>
  <Alert
    class="block p-4 bg-background text-foreground [&>svg]:text-foreground [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7 transition-all [&:not(:first-child)]:mt-5"
    :class="[
      typeTwClass[type],
      to && 'hover:bg-muted/50 cursor-pointer',
      inStack && 'm-0 rounded-none border-none',
    ]"
    @click="alertClick"
  >
    <AlertTriangleIcon
      v-if="icon && title"
      :name="icon"
      :size="16"
    />
    <AlertTitle
      v-if="title"
      class="mb-1 font-semibold leading-none line-clamp-none"
    >
      {{ title }}
    </AlertTitle>
    <AlertDescription class="block text-sm text-current">
      <div class="flex flex-row gap-2">
        <AlertTriangleIcon
          v-if="icon && !title"
          :name="icon"
          :size="16"
          class="mb-[2px] min-w-5 self-center"
        />
        <span
          class="w-full"
          :class="[to && 'pr-3']"
        >
          <slot />
        </span>
      </div>
      <ArrowUpRightIcon
        v-if="to && showLinkIcon"
        class="absolute right-4 top-4"
      />
    </AlertDescription>
  </Alert>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon, AlertTriangleIcon } from '@lucide/vue'
import type { Target } from '~~/types'

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  type?: 'default' | 'info' | 'warning' | 'success' | 'danger' | 'secondary'
  to?: string
  target?: Target
  external?: boolean
  inStack?: boolean
  showLinkIcon?: boolean
}>(), {
  type: 'default',
  external: false,
  inStack: false,
  showLinkIcon: true,
})

const typeTwClass = {
  default: '',
  info: 'border-blue-500 bg-blue-50 [&_.inline-code]:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:[&_.inline-code]:bg-blue-900 text-blue-600',
  note: 'border-sky-500 bg-sky-50 [&_.inline-code]:bg-sky-100 dark:border-sky-900 dark:bg-sky-950 dark:[&_.inline-code]:bg-sky-900 text-sky-600',
  example: 'border-violet-500 bg-violet-50 [&_.inline-code]:bg-violet-100 dark:border-violet-900 dark:bg-violet-950 dark:[&_.inline-code]:bg-violet-900 text-violet-600',
  warning: 'border-amber-500 bg-amber-50 [&_.inline-code]:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:[&_.inline-code]:bg-amber-900 text-amber-600',
  success: 'border-green-500 bg-green-50 [&_.inline-code]:bg-green-100 dark:border-green-900 dark:bg-green-950 dark:[&_.inline-code]:bg-green-900 text-green-600',
  danger: 'border-red-500 bg-red-50 [&_.inline-code]:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:[&_.inline-code]:bg-red-900 text-red-600',
  secondary: 'bg-muted/50',
}

async function alertClick() {
  const localePath = useLocalePath()

  if (props.to) {
    const localeTo = localePath(props.to)
    if (props.target) {
      await navigateTo(localeTo, {
        external: props.external ?? props.to.startsWith('http'),
        open: { target: props.target },
      })
    }
    else {
      await navigateTo(localeTo, {
        external: props.external ?? props.to.startsWith('http'),
      })
    }
  }
}
</script>
