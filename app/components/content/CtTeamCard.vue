<template>
  <Card class="py-0 gap-0 rounded-lg bg-card shadow-xs">
    <CardHeader class="flex flex-col gap-y-1.5 p-6">
      <div
        class="flex flex-col gap-3"
        :class="{ 'text-center': center }"
      >
        <Avatar
          class="size-10"
          :class="{ 'mx-auto': center }"
        >
          <AvatarImage
            :src="avatar"
            :alt="name"
          />
        </Avatar>
        <div>
          <div class="text-lg font-bold">
            {{ name }}
          </div>
          <div class="text-muted-foreground text-sm">
            {{ title }}
          </div>
        </div>
        <div
          class="text-secondary-foreground flex gap-3"
          :class="{ 'mx-auto': center }"
        >
          <NuxtLinkLocale
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :target="link.target"
          >
            <CtIcon :name="link.icon" />
          </NuxtLinkLocale>
        </div>
      </div>
    </CardHeader>
  </Card>
</template>

<script setup lang="ts">
import CtIcon from '@/components/content/CtIcon.vue'
import type { Target } from '~~/types'

const { center = true } = defineProps<{
  avatar: string
  name: string
  title?: string
  links?: ({
    icon: string
    to: string
    target?: Target
  })[]
  center?: boolean
}>()
</script>
