<template>
  <Toaster position="top-center" />
  <NuxtPwaAssets />
  <NuxtLoadingIndicator
    :color="false"
    class="z-100 bg-primary/80"
  />
  <TooltipProvider>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </TooltipProvider>
</template>

<script lang="ts" setup>
import 'vue-sonner/style.css'
import { useOnline } from '@vueuse/core'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'

const isOnline = useOnline()
const { $pwa } = useNuxtApp()

watch(isOnline, (online, wasOnline) => {
  if (!online) {
    toast.warning('You\'re offline', {
      description: 'Some features may be unavailable.',
      duration: Infinity,
    })
  }
  else if (online && !wasOnline) {
    toast.dismiss()
    toast.success('You\'re back online', {
      description: 'All features are now available.',
      duration: 3000,
    })
  }
})

onMounted(() => {
  if ($pwa?.offlineReady) {
    toast.success('App is ready to work offline.')
  }

  if ($pwa?.needRefresh) {
    toast.warning('A new version is available.', {
      action: {
        label: 'Update',
        onClick: () => {
          $pwa.updateServiceWorker()
          window.location.reload()
        },
      },
      duration: Infinity,
    })
  }
})
</script>
