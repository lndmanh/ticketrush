<script setup lang="ts">
import type { SidebarItem } from '~~/types/common'

defineProps<{
  items: SidebarItem[]
}>()
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem
          v-for="item in items"
          :key="item.title"
        >
          <SidebarMenuButton
            as-child
            size="sm"
          >
            <nuxt-link :to="item.url">
              <component :is="item.icon" />
              <span>{{ $t(item.title) }}</span>
            </nuxt-link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
