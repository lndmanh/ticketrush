<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        :class="cn(
          'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground',
        )"
        @click="onInstallClick"
      >
        <span :class="cn(isDialogOpen ? 'mr-4' : '')">
          <Check
            v-if="isPWA"
            :size="18"
          />
          <Download
            v-else
            :size="18"
          />
        </span>
        <p :class="cn('whitespace-nowrap', sidebarOpen ? 'opacity-100' : 'opacity-0 hidden')">
          {{ isPWA ? 'Installed' : 'Install App' }}
        </p>
        <span
          v-if="isPWA"
          class="ml-2 text-xs text-muted-foreground"
        >
          {{ config.public.version! }}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>

  <ResponsiveDialog
    :open="isDialogOpen"
    content-class="sm:max-w-md"
    @update:open="isDialogOpen = $event"
  >
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        <Smartphone class="h-5 w-5" />
        Install App
      </DialogTitle>
      <DialogDescription>
        Get the best experience with our progressive web app
      </DialogDescription>
    </DialogHeader>

    <div class="space-y-4">
      <ItemGroup class="space-y-3">
        <template
          v-for="i in INSTALL_PROMPTER_FEATURES"
          :key="i.title"
        >
          <Item variant="outline">
            <ItemMedia
              variant="icon"
              :class="`bg-${i.colorClass}-500/10`"
            >
              <component
                :is="i.icon"
                :class="`text-${i.colorClass}-600`"
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{{ i.title }}</ItemTitle>
              <ItemDescription>
                {{ i.description }}
              </ItemDescription>
            </ItemContent>
          </Item>
        </template>
      </ItemGroup>
      <div class="border-t pt-4">
        <p class="text-xs text-muted-foreground text-center">
          Takes up minimal storage space on your device
        </p>
      </div>
    </div>

    <DialogFooter class="flex-col sm:flex-row gap-2">
      <Button
        variant="ghost"
        class="w-full sm:w-auto"
        @click="isDialogOpen = false"
      >
        Not Now
      </Button>
      <Button
        class="w-full sm:w-auto group"
        :disabled="!canInstall"
        @click="onInstallPWA"
      >
        Install App
        <ArrowRight class="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </DialogFooter>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import { ArrowRight, Check, Download, Smartphone } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ResponsiveDialog from '@/components/ResponsiveDialog.vue'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { INSTALL_PROMPTER_FEATURES } from '@/constants/homeData'

withDefaults(defineProps<{
  sidebarOpen?: boolean
}>(), {
  sidebarOpen: true,
})

const { $pwa } = useNuxtApp()
const config = useRuntimeConfig()

const isDialogOpen = ref(false)

const isPWA = computed(() => $pwa?.isPWAInstalled ?? false)
const canInstall = computed(() => $pwa?.showInstallPrompt ?? false)

function onInstallClick() {
  isDialogOpen.value = true
}

async function onInstallPWA() {
  if (!canInstall.value) return

  try {
    const result = await $pwa?.install()
    if (result?.outcome === 'accepted') {
      isDialogOpen.value = false
    }
  }
  catch {
    // Installation failed silently
  }
  finally {
    isDialogOpen.value = false
  }
}
</script>
