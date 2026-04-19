<template>
  <render />
</template>

<script setup lang="ts">
import type { SetupContext } from 'vue'
import CtTabs from './CtTabs.vue'

const props = withDefaults(defineProps<{
  inStack?: boolean
  sync?: string
}>(), {
  inStack: false,
})

const _slots: SetupContext['slots'] = useSlots()
function render() {
  const slots = _slots?.default?.() || []
  return h(
    CtTabs,
    {
      variant: 'card',
      inStack: props.inStack,
      sync: props.sync,
    },
    () => slots,
  )
}
</script>
