<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="md:hidden"
      >
        <MenuIcon
          :size="18"
        />
      </Button>
    </SheetTrigger>
    <SheetContent
      side="left"
      class="p-3"
    >
      <LayoutHeaderLogo />
      <LayoutAside is-mobile />
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { Sheet, SheetTrigger, SheetContent } from '../ui/sheet'
import { MenuIcon } from '@lucide/vue'

const open = ref(false)

// Close sheet on navigation
watch(() => useRoute().path, () => {
  open.value = false
})
</script>
