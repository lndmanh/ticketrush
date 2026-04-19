<script setup lang="ts">
import { motion, AnimatePresence } from 'motion-v'
import { ArrowLeft, SearchIcon } from '@lucide/vue'

import NavMain from '@/components/nav/NavMain.vue'
import NavSecondary from '@/components/nav/NavSecondary.vue'
import NavUser from '@/components/nav/NavUser.vue'
import type { SidebarProps } from '@/components/ui/sidebar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'
import { useSidebar } from '@/components/ui/sidebar/utils'

import { Separator } from './ui/separator'

const props = withDefaults(defineProps<SidebarProps>(), {
  variant: 'inset',
})

const { toggleIsOpen } = useHotSearch()
const { open } = useSidebar()
const { activeContext, primarySections, secondarySections, showBack, isContextView } = useSidebarContext()
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
            tooltip="Quick Search"
            class="flex items-center"
            @click="toggleIsOpen()"
          >
            <Button
              variant="outline"
              class="w-full"
              size="lg"
            >
              <SearchIcon />
              <span>Quick Search</span>
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
                  as-child
                  tooltip="Back"
                  class="flex items-center"
                >
                  <nuxt-link to="/">
                    <ArrowLeft />
                    <span>Back</span>
                  </nuxt-link>
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
      <span
        v-show="open"
        class="text-sm text-muted-foreground"
      >
        © {{ new Date().getFullYear() }} {{ useConfig().value.footer.credits }}
      </span>
    </SidebarFooter>
  </Sidebar>
</template>
