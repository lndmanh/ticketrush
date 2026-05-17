<script setup lang="ts">
import { BanknoteIcon } from '@lucide/vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const breakpoints = useBreakpoints(breakpointsTailwind)
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
      >
        <BanknoteIcon :size="16" />
        <span class="sr-only">Open currency preferences</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-72"
      :align="breakpoints.isGreaterOrEqual('md') ? 'end' : 'center'"
    >
      <CurrencyPreferenceContent />
    </PopoverContent>
  </Popover>
</template>
