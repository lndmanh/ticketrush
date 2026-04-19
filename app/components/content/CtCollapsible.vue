<template>
  <Collapsible
    v-if="variant === 'card'"
    v-model:open="isOpen"
    class="space-y-2 [&:not(:first-child)]:mt-6"
  >
    <div class="flex items-center justify-between space-x-4">
      <h4 class="text-sm font-semibold">
        <slot
          name="title"
          mdc-unwrap="p"
        />
        {{ title }}
      </h4>
      <CollapsibleTrigger as-child>
        <Button
          variant="ghost"
          size="sm"
          class="h-9 w-9 p-0"
        >
          <ChevronsUpDownIcon />
          <span class="sr-only">Toggle</span>
        </Button>
      </CollapsibleTrigger>
    </div>

    <CollapsibleContent class="space-y-2">
      <div class="rounded-md border px-4 py-3 font-mono text-sm">
        <slot
          name="content"
          mdc-unwrap="p"
        />
        <slot mdc-unwrap="p" />
      </div>
    </CollapsibleContent>
  </Collapsible>

  <Collapsible
    v-else-if="variant === 'simple'"
    v-model:open="isOpen"
    class="[&:not(:first-child)]:mt-6"
  >
    <CollapsibleTrigger class="w-full text-left">
      <div class="flex w-full gap-1">
        <ChevronDownIcon
          class="self-center transition-all"
          :class="[!isOpen && '-rotate-90']"
          :size="16"
        />
        <span>
          <slot
            name="title"
            mdc-unwrap="p"
          />
          {{ title }}
        </span>
      </div>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div class="ml-2 border-l py-2 pl-4">
        <slot
          name="content"
          mdc-unwrap="p"
        />
        <slot mdc-unwrap="p" />
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>

<script setup lang="ts">
import { ChevronDownIcon, ChevronsUpDownIcon } from '@lucide/vue'

const props = withDefaults(defineProps<{
  variant?: 'simple' | 'card'
  title?: string
  defaultOpen?: boolean
}>(), {
  variant: 'simple',
  defaultOpen: false,
})

defineSlots()
const isOpen = ref(props.defaultOpen)
</script>
