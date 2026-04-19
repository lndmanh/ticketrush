<template>
  <AccordionItem :value="value ?? autoValue">
    <AccordionTrigger class="items-center">
      <slot
        name="title"
        mdc-unwrap="p"
      />
      {{ title }}
    </AccordionTrigger>
    <AccordionContent>
      <slot
        name="content"
        mdc-unwrap="p"
      />
      {{ content }}
    </AccordionContent>
  </AccordionItem>
</template>

<script setup lang="ts">
import { useId } from 'reka-ui'

defineProps<{
  value?: string
  title?: string
  content?: string
}>()

defineSlots()

const autoValue = useId()
</script>
