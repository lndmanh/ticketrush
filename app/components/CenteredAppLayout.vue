<script setup lang="ts">
import { APP_MANIFEST } from '#shared/constants/manifest'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { HomeIcon } from '@lucide/vue'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  title: string
  className?: string
}>(), {})
</script>

<template>
  <div :class="cn('flex flex-col min-h-dvh', className)">
    <header
      class="shrink-0 border-b bg-muted/10 backdrop-blur-md flex h-(--header-height) items-center gap-2 transition-[width,height] ease-linear"
    >
      <div class="flex items-center gap-2 px-4">
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 -ml-1"
          @click="navigateTo('/')"
        >
          <HomeIcon />
          <span class="sr-only">Go Home</span>
        </Button>
        <Separator
          orientation="vertical"
          class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem class="hidden md:block">
              <BreadcrumbLink href="/">
                {{ APP_MANIFEST.short_name }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator class="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{{ title }}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>

    <div class="flex-1 flex items-center justify-center px-4 py-6">
      <slot />
    </div>

    <footer class="shrink-0 border-t bg-muted/10 backdrop-blur-md">
      <div class="px-4 py-6">
        <p class="text-center text-sm">
          © {{ new Date().getFullYear() }} Developed by <strong>No Name Studio</strong> All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>
