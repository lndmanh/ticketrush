<template>
  <div class="mb-8">
    <ProseH1>
      {{ title }}
    </ProseH1>
    <CtMDC
      v-if="description"
      :value="description"
      class="text-muted-foreground pt-1 text-lg"
    />

    <div
      v-if="badges"
      class="flex gap-2 pt-4"
    >
      <NuxtLinkLocale
        v-for="(badge, i) in badges"
        :key="i"
        :to="badge.to"
        :target="badge.target"
      >
        <Badge
          :variant="badge.variant || 'secondary'"
          :type="badge.type"
          class="gap-1 rounded-md"
        >
          {{ badge.value }}
          <CtIcon
            v-if="badge.to || badge.icon"
            :size="12"
            :name="badge.icon || 'lucide:external-link'"
          />
        </Badge>
      </NuxtLinkLocale>
    </div>

    <div
      v-if="authors"
      class="-mx-4 flex divide-x pt-4"
    >
      <NuxtLinkLocale
        v-for="author in authors"
        :key="author.name"
        :to="author.to"
        :target="author.target"
        class="flex items-center gap-2 px-4"
      >
        <Avatar
          v-if="author.avatar"
          class="size-8"
        >
          <AvatarImage
            :src="author.avatar"
            :alt="author.name"
          />
        </Avatar>
        <div>
          <div class="text-sm font-semibold">
            {{ author.name }}
          </div>
          <div
            v-if="author.username"
            class="text-muted-foreground text-xs font-medium leading-4"
          >
            @{{ author.username }}
          </div>
        </div>
      </NuxtLinkLocale>
    </div>
  </div>
</template>

<script setup lang="ts">
import CtIcon from '@/components/content/CtIcon.vue'
import type { ContentCollectionItem } from '@nuxt/content'

defineProps<{
  title?: string
  description?: string
  badges?: ContentCollectionItem['badges']
  authors?: ContentCollectionItem['authors']
}>()
</script>
