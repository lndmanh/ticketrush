<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-full"
  >
    <div
      v-if="isLocked"
      role="alert"
      class="relative z-[60] w-full bg-amber-500/95 backdrop-blur-sm border-b border-amber-600/50"
    >
      <div class="mx-auto flex max-w-[90rem] items-center justify-center gap-3 px-4 py-2.5 sm:px-6 lg:px-10">
        <LockIcon class="h-4 w-4 shrink-0 text-amber-950" />
        <p class="text-center text-sm font-medium text-amber-950">
          {{ $t('common.account_locked_banner') }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { LockIcon } from '@lucide/vue'
import { apiRoutes } from '#shared/apiRoutes'
import type { ApiResponse } from '~~/types/api'

const { loggedIn } = useUserSession()
const isLocked = ref(false)

async function checkLockStatus() {
  if (!loggedIn.value) {
    isLocked.value = false
    return
  }

  try {
    const res = await $fetch<ApiResponse<{ isLocked: boolean }>>(apiRoutes.AUTH_ACCOUNT_STATUS)
    isLocked.value = res.success ? res.data.isLocked : false
  }
  catch {
    isLocked.value = false
  }
}

watch(loggedIn, (val) => {
  if (!val) {
    isLocked.value = false
  }
  else {
    checkLockStatus()
  }
}, { immediate: true })
</script>
