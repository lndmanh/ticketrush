<script setup lang="ts">
import QRCode from 'qrcode.vue'

defineProps<{
  payload: string
  title: string
  subtitle?: string | null
  ticketLabel?: string | null
  instruction?: string | null
  showPayload?: boolean
}>()
</script>

<template>
  <div class="surface-shell max-w-md">
    <div class="surface-core space-y-6 text-center">
      <div class="space-y-2">
        <p class="section-eyebrow mx-auto">
          Digital pass
        </p>
        <p
          v-if="ticketLabel"
          class="mx-auto w-fit rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
        >
          {{ ticketLabel }}
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

      <p
        v-if="showPayload !== false"
        class="break-all rounded-[1.25rem] border border-border bg-background px-4 py-3 font-mono text-xs leading-5 text-muted-foreground"
      >
        {{ payload }}
      </p>

      <p
        v-if="instruction"
        class="rounded-[1rem] border border-border/70 bg-muted/25 px-4 py-3 text-left text-xs leading-5 text-muted-foreground"
      >
        {{ instruction }}
      </p>
    </div>
  </div>
</template>
