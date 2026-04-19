<template>
  <div class="space-y-8">
    <!-- Header Section -->
    <div class="space-y-2">
      <h1 class="text-3xl font-bold tracking-tight">
        Admin Dashboard
      </h1>
      <p class="text-muted-foreground">
        Manage your application's content, users, and system settings
      </p>
    </div>

    <!-- Main Management Cards -->
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card
        v-for="card in managementCards"
        :key="card.id"
        class="group cursor-pointer transition-all hover:shadow-lg"
        @click="navigateTo(card.route)"
      >
        <CardHeader>
          <div class="flex items-center justify-between">
            <div :class="['flex size-12 items-center justify-center rounded-lg', card.bgColor, card.textColor]">
              <component
                :is="card.icon"
                class="size-6"
              />
            </div>
            <ChevronRightIcon class="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
        </CardHeader>
        <CardContent class="space-y-2">
          <CardTitle>{{ card.title }}</CardTitle>
          <CardDescription>
            {{ card.description }}
          </CardDescription>
        </CardContent>
      </Card>
    </div>

    <!-- System Actions Section -->
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">
        System Actions
      </h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-base">
              <TrashIcon class="size-4" />
              Clear Server Cache
            </CardTitle>
            <CardDescription>
              Clear all cached data to force fresh data retrieval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger as-child>
                <Button
                  variant="destructive"
                  size="sm"
                  class="w-full"
                >
                  Clear Cache
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear the server cache. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    @click="clearServerCache"
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import {
  UsersIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@lucide/vue'
import type { Component } from 'vue'

definePageMeta({
  title: 'Admin Dashboard',
  breadcrumb: 'Admin',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

interface ManagementCard {
  id: string
  icon: Component
  title: string
  description: string
  route: string
  bgColor: string
  textColor: string
}

const managementCards: ManagementCard[] = [
  {
    id: 'users',
    icon: UsersIcon,
    title: 'Users Management',
    description: 'View, edit, and manage user accounts, roles, and permissions',
    route: '/admin/users',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
  },
]

const clearServerCache = () => {
  $fetch('/api/admin/clear-server-cache').then(() => {
    toast.success('Server cache cleared successfully.')
  }).catch(() => {
    toast.error('Failed to clear server cache.')
  })
}
</script>
