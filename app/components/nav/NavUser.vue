<script setup lang="ts">
import { ChevronsUpDown, LogOut, SunMoon, Settings, LogIn, UserIcon, UsersIcon } from '@lucide/vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'

const { user, clear, loggedIn } = useUserSession()

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

function logout() {
  clear().then(() => {
    location.reload()
  })
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <SidebarMenuButton
        size="lg"
        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <template v-if="user">
          <Avatar class="h-8 w-8 rounded-lg">
            <AvatarImage
              src="/images/avatar/default.png"
              :alt="user.name"
            />
            <AvatarFallback class="rounded-lg">
              {{ getInitials(user.name) }}
            </AvatarFallback>
          </Avatar>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-medium">{{ user.name }}</span>
            <span class="truncate text-xs">{{ user.username }}</span>
          </div>
          <ChevronsUpDown class="ml-auto size-4" />
        </template>
        <template v-else>
          <span class="font-medium">Sign In</span>
          <ChevronsUpDown class="ml-auto size-4" />
        </template>
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
      side="bottom"
      align="end"
      :side-offset="4"
    >
      <DropdownMenuGroup>
        <DropdownMenuItem
          v-if="user?.isAdmin"
          @click="navigateTo('/admin')"
        >
          <UsersIcon />
          Admin
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="loggedIn"
          @click="navigateTo('/settings/account')"
        >
          <UserIcon />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem
          v-else
          @click="navigateTo('/auth/login')"
        >
          <LogIn />
          Sign In
        </DropdownMenuItem>
        <DropdownMenuItem @click="navigateTo('/settings')">
          <Settings />
          Settings
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoon />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <ThemeSwitcher />
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuGroup>

      <DropdownMenuItem
        v-if="loggedIn"
        class="hover:bg-red-500/10 focus:bg-red-500/10 hover:text-red-600 focus:text-red-600"
        @click="logout"
      >
        <LogOut />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
