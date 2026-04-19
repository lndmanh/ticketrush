<template>
  <footer class="text-muted-foreground py-6 md:px-8 md:py-0">
    <div class="container flex flex-col items-center justify-between gap-2 md:h-24 md:flex-row">
      <CtMDC
        :value="footer.credits"
        class="flex items-center"
      />
      <span class="flex-1" />
      <div class="flex flex-wrap gap-2 justify-center md:justify-end">
        <NuxtLinkLocale
          v-for="(link, i) in footer.links"
          :key="i"
          :to="link?.to"
          :target="link?.target"
        >
          <Button
            variant="ghost"
            :size="link?.icon && !link?.title ? 'icon' : 'default'"
            class="flex gap-2"
          >
            <CtIcon
              v-if="link?.icon"
              :name="link.icon"
              :size="20"
            />
            <span v-if="link?.title">{{ $t(link.title) }}</span>
          </Button>
        </NuxtLinkLocale>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import CtIcon from '@/components/content/CtIcon.vue'

const { footer } = useConfig().value
</script>
