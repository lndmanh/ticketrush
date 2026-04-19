<template>
  <template v-if="item.links">
    <Collapsible v-model:open="isOpen">
      <CollapsibleTrigger class="w-full p-2 text-left">
        <div class="flex w-full gap-1">
          {{ $t(item.title) }}
          <component
            :is="isOpen ? ChevronsDownUpIcon : ChevronsUpDownIcon"
            :size="12"
            class="ml-auto self-center"
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul class="pl-2">
          <li
            v-for="link in item.links"
            :key="link.title"
          >
            <NuxtLinkLocale
              :to="link.to"
              :target="link.to"
              class="hover:bg-muted mb-1 flex w-full gap-2 rounded-md px-3 py-2 transition-all"
            >
              <CtIcon
                v-if="link.icon"
                :name="link.icon"
                :size="16"
                class="mt-1 min-w-5"
              />

              <div>
                <div class="font-semibold">
                  {{ $t(link.title) }}
                </div>
                <div class="text-muted-foreground text-sm">
                  {{ $t(link.description) }}
                </div>
              </div>
            </NuxtLinkLocale>
          </li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  </template>
  <NuxtLinkLocale
    v-else
    :to="item.to"
    :target="item.target"
    class="flex w-full p-2"
  >
    {{ $t(item.title) }}
    <ArrowUpRightIcon
      v-if="item.showLinkIcon ?? true"
      class="text-muted-foreground ml-1"
      :size="12"
    />
  </NuxtLinkLocale>
</template>

<script setup lang="ts">
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ArrowUpRightIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from '@lucide/vue'
import CtIcon from '@/components/content/CtIcon.vue'

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any
  index: number
}>()

const collapsedMapStore = useCollapsedMapStore()
const isOpen = ref(collapsedMapStore.get(`mobile-header-nav${props.index}`) || false)
watch(isOpen, (v) => {
  collapsedMapStore.set(`mobile-header-nav${props.index}`, v)
})
</script>
