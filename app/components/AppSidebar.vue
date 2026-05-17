<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'
import { ArrowLeft, SearchIcon, LogOut, LogIn } from '@lucide/vue'

import NavMain from '@/components/nav/NavMain.vue'
import NavSecondary from '@/components/nav/NavSecondary.vue'
import NavUser from '@/components/nav/NavUser.vue'
import type { SidebarProps } from '@/components/ui/sidebar'

const props = withDefaults(defineProps<SidebarProps>(), {
  variant: 'inset',
})

const { toggleIsOpen } = useHotSearch()
const { activeContext, primarySections, secondarySections, showBack, isContextView, showMainSidebar } = useSidebarContext()
const { loggedIn, clear } = useUserSession()

function logout() {
  clear().then(() => {
    location.reload()
  })
}
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <SidebarMenu class="space-y-2">
        <SidebarMenuItem>
          <NavUser />
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            :tooltip="$t('nav.quick_search')"
            class="flex items-center"
            @click="toggleIsOpen()"
          >
            <Button
              variant="outline"
              class="w-full"
              size="lg"
            >
              <SearchIcon />
              <span class="ml-2">{{ $t('nav.quick_search') }}</span>
              <KbdGroup class="ml-auto">
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>K</Kbd>
              </KbdGroup>
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarSeparator />
    </SidebarHeader>

    <SidebarContent class="overflow-hidden grid relative">
      <AnimatePresence mode="wait">
        <motion.div
          :key="activeContext.id"
          :initial="{ opacity: 0, x: isContextView ? 20 : -20 }"
          :animate="{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }"
          :exit="{ opacity: 0, x: isContextView ? -20 : 20, transition: { duration: 0.2 } }"
          class="w-full flex flex-col gap-0 overflow-y-auto"
          style="grid-area: 1 / 1;"
        >
          <SidebarGroup v-if="showBack">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  class="flex items-center"
                  @click="showMainSidebar"
                >
                  <ArrowLeft />
                  <span>{{ $t('common.back') }}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <NavMain
            v-for="section in primarySections"
            :key="section.title"
            :title="section.title"
            :items="section.items"
          />
          <NavSecondary
            v-for="section in secondarySections"
            :key="section.title"
            class="mt-auto"
            :items="section.items"
          />
        </motion.div>
      </AnimatePresence>
    </SidebarContent>

    <Separator />
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <Button
            v-if="loggedIn"
            class="w-full"
            variant="destructive"
            @click="logout"
          >
            <LogOut class="size-4" />
            {{ $t('common.log_out') }}
          </Button>
          <Button
            v-else
            class="w-full"
            @click="navigateTo('/auth/login')"
          >
            <LogIn class="size-4" />
            {{ $t('common.sign_in') }}
          </Button>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
