<script setup lang="ts">
import QRCode from 'qrcode.vue'

defineProps<{
  payload: string
  title: string
  subtitle?: string | null
}>()
</script>

<template>
  <div class="surface-shell max-w-md">
    <div class="surface-core space-y-6 text-center">
      <div class="space-y-2">
        <p class="section-eyebrow mx-auto">
          {{ $t('tickets.digital_entry_pass') }}
        </p>
        <h3 class="text-balance text-2xl font-semibold tracking-[-0.05em]">
          {{ title }}
        </h3>
        <p
          v-if="subtitle"
          class="mx-auto max-w-[28ch] break-words text-sm leading-6 text-muted-foreground"
        >
          {{ subtitle }}
        </p>
      </div>

      <div class="mx-auto rounded-[2rem] border border-border bg-secondary p-5">
        <QRCode
          :value="payload"
          :size="200"
          level="H"
          class="mx-auto aspect-square w-full max-w-[15rem] rounded-[1.5rem] bg-white p-2"
        />
      </div>

      <p class="break-all rounded-[1.25rem] border border-border bg-background px-4 py-3 font-mono text-xs leading-5 text-muted-foreground">
        {{ payload }}
      </p>
    </div>
  </div>
</template>
