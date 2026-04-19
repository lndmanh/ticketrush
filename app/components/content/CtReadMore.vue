<template>
  <div
    :class="cn('[&>svg]:text-foreground relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7', 'bg-card text-card-foreground')"
    :to
    :target
    :icon
  >
    {{ $t('cta.read_more') }} <span class="font-semibold">{{ displayTitle }}</span>
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'
import type { Target } from '~~/types'

const {
  title,
  to,
  icon = 'lucide:bookmark',
} = defineProps<{
  title?: string
  to: string
  target?: Target
  icon?: string
}>()

const { navigation } = usePageData()

const displayTitle = computed(() => {
  if (title)
    return title

  if (to.startsWith('http'))
    return to

  try {
    return useBreadcrumb(to, navigation.value).map(x => x.title).join(' > ')
  }
  catch {
    return to
  }
})
</script>
