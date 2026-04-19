<script setup lang="ts">
import type { VueElement } from 'vue'

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

import MaxWidthWrapper from './MaxWidthWrapper.vue'
import { ChevronLeft, HomeIcon, LogInIcon, MessageSquare } from '@lucide/vue'
import type { BreadcrumbItemType } from '~~/types/common'

const router = useRouter()
const route = useRoute()

const routeTransitionKey = computed(() => route.fullPath || route.path)

function getRouteTitle(meta: { breadcrumb?: unknown, title?: unknown } | undefined) {
  if (!meta) return null
  if (typeof meta.breadcrumb === 'string' && meta.breadcrumb.length > 0) return meta.breadcrumb
  if (typeof meta.title === 'string' && meta.title.length > 0) return meta.title

  return null
}

const breadcrumbs = computed<BreadcrumbItemType[]>(() => {
  const path = route.path
  const crumbs: BreadcrumbItemType[] = [{ title: 'Home', href: '/' }]

  if (path === '/') return crumbs

  const segments = path.split('/').filter(Boolean)
  let currentPath = ''

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`

    // Try to find a matching route record to get meta
    const match = router.resolve(currentPath)

    let title = segment
    const matchedRouteTitle = getRouteTitle(match?.meta)
    if (matchedRouteTitle) {
      title = matchedRouteTitle
    }
    else {
      // Capitalize
      title = segment.charAt(0).toUpperCase() + segment.slice(1)
    }

    // If it's the last segment, it matches the current route
    // We can check if the current route has specific meta that overrides the segment name
    if (index === segments.length - 1) {
      const currentRouteTitle = getRouteTitle(route.meta)
      if (currentRouteTitle) {
        title = currentRouteTitle
      }
    }

    crumbs.push({
      title,
      href: currentPath,
    })
  })

  return crumbs
})

const currentBreadcrumb = computed(() => breadcrumbs.value[breadcrumbs.value.length - 1] ?? null)

const parentBreadcrumb = computed(() => {
  if (breadcrumbs.value.length < 2) return null

  return breadcrumbs.value[breadcrumbs.value.length - 2]
})

const mobileOverflowBreadcrumbs = computed(() => {
  if (breadcrumbs.value.length <= 2) return []

  return breadcrumbs.value.slice(0, -1)
})

withDefaults(defineProps<{
  titleControls?: VueElement
  className?: string
  hideSidebarTrigger?: boolean
}>(), {
  hideSidebarTrigger: false,
})

const { loggedIn, user } = useUserSession()
</script>

<template>
  <div>
    <header
      class="sticky top-0 z-10 bg-muted/10 backdrop-blur-md border-b border-b-muted/10 md:rounded-t-xl flex h-[calc(var(--header-height,3.5rem)+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(var(--header-height,3.5rem)+env(safe-area-inset-top,0px))]"
    >
      <div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger
          v-if="!hideSidebarTrigger"
          class="-ml-1"
        />
        <Button
          v-else
          variant="ghost"
          size="icon"
          class="h-7 w-7 -ml-1"
          @click="navigateTo('/')"
        >
          <HomeIcon />
          <span class="sr-only">Toggle Sidebar</span>
        </Button>
        <Separator
          orientation="vertical"
          class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList class="flex-nowrap">
            <BreadcrumbItem
              v-if="breadcrumbs.length > 1 && breadcrumbs[0]"
              class="hidden md:inline-flex"
            >
              <BreadcrumbLink :href="breadcrumbs[0].href">
                {{ breadcrumbs[0].title }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator
              v-if="breadcrumbs.length > 1"
              class="hidden md:block"
            />
            <template v-if="parentBreadcrumb">
              <BreadcrumbItem
                class="md:hidden"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 gap-1 px-2"
                  @click="navigateTo(parentBreadcrumb.href)"
                >
                  <ChevronLeft class="size-4" />
                  <span class="text-xs font-medium">Back</span>
                </Button>
              </BreadcrumbItem>
              <BreadcrumbSeparator
                class="md:hidden"
              />
            </template>

            <template v-if="mobileOverflowBreadcrumbs.length > 0">
              <BreadcrumbItem class="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-8"
                    >
                      <BreadcrumbEllipsis class="size-4" />
                      <span class="sr-only">Open breadcrumb path</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="bottom"
                    :side-offset="8"
                  >
                    <DropdownMenuItem
                      v-for="crumb in mobileOverflowBreadcrumbs"
                      :key="`mobile-breadcrumb-${crumb.href}`"
                      class="cursor-pointer"
                      @click="navigateTo(crumb.href)"
                    >
                      {{ crumb.title }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="md:hidden" />
            </template>
            <template
              v-for="crumb in breadcrumbs.slice(1, -1)"
              :key="crumb.href"
            >
              <BreadcrumbItem class="hidden md:inline-flex">
                <BreadcrumbLink :href="crumb.href">
                  {{ crumb.title }}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator class="hidden md:block" />
            </template>
            <BreadcrumbItem
              v-if="currentBreadcrumb"
              class="hidden md:inline-flex"
            >
              <BreadcrumbPage>
                {{ currentBreadcrumb.title }}
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbItem
              v-if="currentBreadcrumb"
              class="md:hidden"
            >
              <BreadcrumbPage class="max-w-28 truncate">
                {{ currentBreadcrumb.title }}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div class="ml-auto flex items-center gap-2">
          <Button
            v-if="!loggedIn || !user"
            variant="default"
            size="sm"
            @click="navigateTo('/auth/login')"
          >
            <LogInIcon />
            <span
              class="hidden sm:flex"
            >Sign In</span>
          </Button>
          <component
            :is="titleControls"
            v-if="titleControls"
          />
        </div>
      </div>
    </header>
    <div class="flex flex-1 flex-col">
      <div class="@container/main flex flex-1 flex-col gap-2 min-h-dvh pb-[env(safe-area-inset-bottom,0px)]">
        <MaxWidthWrapper
          :class="cn(
            'flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6',
            className,
          )"
        >
          <Transition
            name="page"
            mode="out-in"
          >
            <div
              :key="routeTransitionKey"
              class="flex flex-1 flex-col min-h-full"
            >
              <slot />
            </div>
          </Transition>
        </MaxWidthWrapper>
      </div>
    </div>
  </div>
</template>
