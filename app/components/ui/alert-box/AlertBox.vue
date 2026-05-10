<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { AlertBoxVariants } from '.'
import { X } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { alertBoxVariants } from '.'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  variant?: AlertBoxVariants['variant']
  dismissible?: boolean
}>(), {
  dismissible: false,
})

const emit = defineEmits<{
  dismiss: []
}>()

const visible = defineModel<boolean>('visible', { default: true })

function handleDismiss() {
  visible.value = false
  emit('dismiss')
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    leave-active-class="transition-all duration-150 ease-in"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <div
      v-if="visible"
      data-slot="alert-box"
      role="alert"
      :class="cn(
        alertBoxVariants({ variant }),
        'flex items-start gap-3',
        dismissible && 'pr-10',
        props.class,
      )"
    >
      <slot />

      <button
        v-if="dismissible"
        data-slot="alert-box-dismiss"
        type="button"
        :class="cn(
          'absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-opacity',
          'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        )"
        @click="handleDismiss"
      >
        <span class="sr-only">Dismiss</span>
        <X class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>
