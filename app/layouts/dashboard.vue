<template>
  <div>
    <SidebarProvider>
      <AppSidebar :variant="sidebarVariant" />
      <SidebarInset>
        <div
          class="flex flex-1 min-h-dvh overflow-hidden"
        >
          <div
            class="flex flex-1 min-w-0 flex-col overflow-hidden transition-[padding-right] duration-200 ease-out"
          >
            <AppLayout>
              <slot />
            </AppLayout>
            <HotSearch />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    <BackToTop />
  </div>
</template>

<script setup lang="ts">
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import HotSearch from '@/components/HotSearch.vue'

import BackToTop from '@/components/BackToTop.vue'
import AppLayout from '@/components/AppLayout.vue'
import AppSidebar from '@/components/AppSidebar.vue'

const { sidebarVariant: contextVariant } = useSidebarContext()

const sidebarVariant = computed(() => {
  return contextVariant.value
})
</script>
