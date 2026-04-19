<script setup lang="ts">
import { WifiOff, RefreshCw } from '@lucide/vue'
import { Button } from '@/components/ui/button'

definePageMeta({ title: 'Offline', layout: 'empty' })

function reload() {
  window.location.reload()
}
</script>

<template>
  <MaxWidthWrapper class="h-screen relative flex flex-col items-center justify-center gap-4 px-4">
    <div class="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted">
      <WifiOff class="h-16 w-16 text-foreground/40" />
    </div>
    <h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-center">
      You're offline
    </h1>
    <p class="text-lg text-muted-foreground text-center max-w-md">
      No internet connection detected. Connect to the internet and try again, or reload to retry.
    </p>
    <div class="mt-4 flex items-center justify-center gap-4">
      <Button @click="reload">
        <RefreshCw class="h-4 w-4" />
        Try Again
      </Button>
    </div>
  </MaxWidthWrapper>
</template>
