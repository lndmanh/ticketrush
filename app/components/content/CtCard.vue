<template>
  <UseTemplate>
    <Card
      class="relative h-full overflow-hidden transition-all py-0 gap-0 rounded-lg bg-card shadow-xs"
      :class="[
        to && 'hover:bg-muted',
        inStack && 'mb-0 rounded-none border-none shadow-none',
      ]"
    >
      <NuxtImg
        v-if="img"
        :src="img"
        class="w-full"
      />
      <CardHeader
        v-if="icon || title || $slots.title || description || $slots.description"
        class="flex flex-col gap-y-1.5 p-6"
        :class="{ 'flex-row items-center gap-5': horizontal }"
      >
        <CtIcon
          :name="icon"
          :size="iconSize"
          :class="cn(!horizontal && 'mb-2')"
        />
        <div class="flex flex-col gap-1.5">
          <CardTitle
            v-if="title || $slots.title"
            class="text-2xl tracking-tight"
          >
            <slot
              name="title"
              mdc-unwrap="p"
            />
            {{ title }}
          </CardTitle>
          <CardDescription
            v-if="description || $slots.description"
            class="text-sm"
          >
            <slot
              name="description"
              mdc-unwrap="p"
            />
            {{ description }}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent
        v-if="content || $slots.content || $slots.default"
        class="p-6 pt-0"
      >
        <slot
          name="content"
          mdc-unwrap="p"
        />
        <slot mdc-unwrap="p" />
      </CardContent>
      <CardFooter
        v-if="footer || $slots.footer"
        class="p-6 pt-0"
      >
        <slot
          name="footer"
          mdc-unwrap="p"
        />
        {{ footer }}
      </CardFooter>
      <ArrowUpRightIcon
        v-if="to && showLinkIcon"
        class="absolute right-4 top-4"
      />
    </Card>
  </UseTemplate>

  <div class="group-has-[div]:!mt-0 [&:not(:first-child)]:mt-5">
    <NuxtLinkLocale
      v-if="to"
      :to
      :target
    >
      <CardInner />
    </NuxtLinkLocale>
    <CardInner v-else />
  </div>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon } from '@lucide/vue'
import type { Target } from '~~/types'
import CtIcon from './CtIcon.vue'
import { cn } from '~/lib/utils'

withDefaults(defineProps<{
  title?: string
  description?: string
  footer?: string
  content?: string
  to?: string
  target?: Target
  icon?: string
  iconSize?: number
  inStack?: boolean
  img?: string
  showLinkIcon?: boolean
  horizontal?: boolean
}>(), {
  showLinkIcon: true,
  horizontal: false,
  iconSize: 24,
})

defineSlots()

const [UseTemplate, CardInner] = createReusableTemplate()
</script>
