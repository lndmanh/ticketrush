<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { useSidebar } from '@/components/ui/sidebar/utils'
import type { SidebarItem } from '~~/types/common'

const route = useRoute()
const { isMobile, setOpenMobile } = useSidebar()

withDefaults(defineProps<{
  title?: string
  items: SidebarItem[]
}>(), {
  title: 'Platform',
})

const isItemActive = (itemUrl: string) => {
  return route.path === itemUrl
}

const hasActiveSubItem = (items?: { url: string }[]) => {
  return items?.some(subItem => isItemActive(subItem.url)) ?? false
}

const handleSubItemClick = () => {
  if (isMobile.value) {
    setOpenMobile(false)
  }
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>{{ title }}</SidebarGroupLabel>
    <SidebarMenu>
      <template
        v-for="item in items"
        :key="item.title"
      >
        <!-- Item with sub-items (collapsible) -->
        <Collapsible
          v-if="item.items && item.items.length > 0"
          as-child
          :default-open="isItemActive(item.url) || hasActiveSubItem(item.items)"
          class="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger as-child>
              <SidebarMenuButton
                :tooltip="item.title"
                :close-sidebar-on-mobile="false"
                :class="{
                  'bg-sidebar-accent text-sidebar-accent-foreground': hasActiveSubItem(item.items),
                }"
              >
                <component
                  :is="item.icon"
                  v-if="item.icon"
                />
                <span>{{ item.title }}</span>
                <ChevronRight
                  class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem
                  v-for="subItem in item.items"
                  :key="subItem.title"
                >
                  <SidebarMenuSubButton as-child>
                    <nuxt-link
                      :to="subItem.url"
                      :class="{
                        'bg-sidebar-accent text-sidebar-accent-foreground': isItemActive(
                          subItem.url,
                        ),
                      }"
                      @click="handleSubItemClick"
                    >
                      <component
                        :is="subItem.icon"
                        v-if="subItem.icon"
                      />
                      <span>{{ subItem.title }}</span>
                    </nuxt-link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>

        <!-- Item without sub-items (simple button) -->
        <SidebarMenuItem v-else>
          <SidebarMenuButton
            as-child
            :tooltip="item.title"
          >
            <nuxt-link
              :to="item.url"
              :class="{
                'bg-sidebar-accent text-sidebar-accent-foreground': isItemActive(item.url),
              }"
            >
              <component
                :is="item.icon"
                v-if="item.icon"
              />
              <span>{{ item.title }}</span>
            </nuxt-link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </template>
    </SidebarMenu>
  </SidebarGroup>
</template>
