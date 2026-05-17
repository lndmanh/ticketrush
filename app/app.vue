<template>
  <GoogleOneTapPrompt />
  <Toaster position="top-center" />
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
import GoogleOneTapPrompt from '@/components/auth/GoogleOneTapPrompt.client.vue'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'vue-sonner'

const isOnline = useOnline()

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
</script>
