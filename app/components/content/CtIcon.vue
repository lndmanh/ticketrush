<template>
  <!-- 1. No name → default fallback icon -->
  <component
    :is="DEFAULT_ICON"
    v-if="!name"
    :size="size"
    :class="cn(props.class)"
  />

  <!-- 2. Vue component passed directly -->
  <component
    :is="name"
    v-else-if="!isStringName"
    :size="size"
    :class="cn(props.class)"
  />

  <!-- 3. Emoji string -->
  <span
    v-else-if="isEmoji"
    :style="{ fontSize: `${size}px`, lineHeight: 1 }"
    :class="cn(props.class)"
  >{{ name }}</span>

  <!-- 4. Image URL or path -->
  <NuxtImg
    v-else-if="isImage"
    :src="(name as string)"
    :width="size"
    :height="size"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :class="cn(props.class)"
    loading="lazy"
  />

  <!-- 5. File-type icon (useFileIcon) -->
  <component
    :is="fileIcon"
    v-else-if="fileIcon"
    :size="size"
    :class="cn(props.class)"
  />

  <!-- 6. Lucide icon string -->
  <component
    :is="lucideIcon"
    v-else-if="lucideIcon"
    :size="size"
    :class="cn(props.class)"
  />

  <!-- 7. Unresolved string → fallback -->
  <component
    :is="DEFAULT_ICON"
    v-else
    :size="size"
    :class="cn(props.class)"
  />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import * as lucideIcons from '@lucide/vue'
import { cn } from '~/lib/utils'
import { useFileIcon } from '~/composables/useFileIcon'

// ─── Props ───────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  name?: string | Component
  size?: number
  class?: string
}>(), {
  size: 16,
})

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_ICON = lucideIcons.CircleHelp

const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u
const IMAGE_RE = /^(https?:\/\/|\/|\.\/|\.\.\/)|(\.(png|jpe?g|gif|svg|webp|avif|ico|bmp)(\?.*)?$)/i

// ─── Computed flags ──────────────────────────────────────────

const isStringName = computed(() => typeof props.name === 'string')

const isEmoji = computed(() => {
  if (!isStringName.value) return false
  return EMOJI_RE.test(props.name as string)
})

const isImage = computed(() => {
  if (!isStringName.value) return false
  return IMAGE_RE.test(props.name as string)
})

const fileIcon = computed<Component | undefined>(() => {
  if (!isStringName.value || isEmoji.value || isImage.value) return undefined
  return useFileIcon(props.name as string)
})

const lucideIcon = computed<Component | null>(() => {
  if (!isStringName.value || isEmoji.value || isImage.value || fileIcon.value) return null
  const key = toPascalCase(props.name as string)
  return (lucideIcons as unknown as Record<string, Component>)[key] ?? null
})

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Converts a kebab-case icon name (with optional lucide prefix) to PascalCase.
 *
 * @example
 * toPascalCase('lucide:arrow-right') // → 'ArrowRight'
 * toPascalCase('lucide-lab:flask')   // → 'Flask'
 * toPascalCase('chevron-down')       // → 'ChevronDown'
 */
function toPascalCase(raw: string): string {
  return raw
    .replace(/^lucide(-lab)?:/, '')
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}
</script>
