<script setup lang="ts">
import type { SidebarItem } from '~~/types/common'
import { getUiFallbackText } from '@/utils/uiText'

const { t } = useI18n()

function tt(key: string) {
  const translated = t(key)
  return translated === key ? getUiFallbackText(key) : translated
}

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
              <span>{{ tt(item.title) }}</span>
            </nuxt-link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
