<script setup lang="ts">
import { ChevronsUpDown, LogOut, SunMoon, Settings, LogIn, UserIcon, UsersIcon, LanguagesIcon } from '@lucide/vue'
import { useLocalStorage } from '@vueuse/core'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'

const { user, clear, loggedIn } = useUserSession()
const { locale: i18nLocale, locales, setLocale } = useI18n()
const storedLocale = useLocalStorage('ticketrush:locale', i18nLocale.value)
const currentLocale = computed(() => i18nLocale.value)

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

function logout() {
  clear().then(() => {
    location.reload()
  })
}

async function updateLocale(code: string) {
  if (currentLocale.value === code) return

  await setLocale(code)
  storedLocale.value = code
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
          @click="navigateTo('/settings/profile')"
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
        <DropdownMenuItem @click="navigateTo('/settings/profile')">
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
      <DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LanguagesIcon />
            {{ $t('common.lang') }}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                v-for="l in locales"
                :key="l.code"
                :class="[
                  'flex items-center gap-2 cursor-pointer transition-colors text-accent-foreground',
                  currentLocale === l.code ? 'bg-accent' : '',
                ]"
                @click="updateLocale(l.code)"
              >
                <span class="flex-1 truncate">{{ l.name }}</span>
                <span
                  v-if="currentLocale === l.code"
                  class="ml-auto text-xs font-bold"
                >✓</span>
              </DropdownMenuItem>
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
