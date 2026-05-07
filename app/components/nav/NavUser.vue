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
const { t } = useI18n()

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
          <span class="font-medium">{{ $t('common.sign_in') }}</span>
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
          {{ $t('common.admin') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          v-if="loggedIn"
          @click="navigateTo('/settings/account')"
        >
          <UserIcon />
          {{ $t('common.account') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          v-else
          @click="navigateTo('/auth/login')"
        >
          <LogIn />
          {{ $t('common.sign_in') }}
        </DropdownMenuItem>
        <DropdownMenuItem @click="navigateTo('/settings')">
          <Settings />
          {{ $t('common.settings') }}
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoon />
            {{ $t('common.appearance') }}
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
        {{ $t('common.log_out') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
