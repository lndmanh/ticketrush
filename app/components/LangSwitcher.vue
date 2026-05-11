<template>
  <DropdownMenu v-if="dropdownType === 'select'">
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        :size="triggerType === 'icon' ? 'icon' : 'sm'"
        class="uppercase"
      >
        <LanguagesIcon
          v-if="triggerType === 'icon'"
          :size="18"
        />
        <span v-else>{{ $t('common.lang') }}</span>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      :align="isDesktop ? 'end' : 'center'"
    >
      <DropdownMenuItem
        v-for="l in locales"
        :key="l.code"
        :class="[
          'flex items-center gap-2 cursor-pointer transition-colors text-accent-foreground',
          currentLocale === l.code ? 'bg-accent' : '',
        ]"
        @click="updateLocale(l.code)"
      >
        <span class="flex-1 truncate">{{ l.name }}</span>
        <span
          v-if="currentLocale === l.code"
          class="ml-auto text-xs font-bold"
        >✓</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <Popover v-else>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="uppercase"
      >
        <LanguagesIcon :size="18" />
      </Button>
    </PopoverTrigger>

    <PopoverContent
      class="w-80 p-4"
      :align="isDesktop ? 'end' : 'center'"
    >
      <div class="space-y-4">
        <div class="space-y-1">
          <h4 class="font-medium leading-none">
            {{ $t('common.lang') }}
          </h4>
          <p class="text-sm text-muted-foreground">
            {{ $t('common.locale.prompt') }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button
            v-for="l in locales"
            :key="l.code"
            variant="outline"
            size="sm"
            :class="[
              'justify-start gap-2 h-9 px-3',
              currentLocale === l.code && 'border-primary ring-1 ring-primary',
            ]"
            @click="updateLocale(l.code)"
          >
            <span class="truncate text-xs">{{ l.name }}</span>
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { LanguagesIcon } from '@lucide/vue'
import { breakpointsTailwind, useBreakpoints, useLocalStorage } from '@vueuse/core'

withDefaults(defineProps<{
  triggerType?: 'icon' | 'text'
  dropdownType?: 'popover' | 'select'
}>(), {
  triggerType: 'icon',
  dropdownType: 'select',
})

const { locale: i18nLocale, locales, setLocale } = useI18n()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isDesktop = breakpoints.greaterOrEqual('md')

// 1. Optimized Persistence: useLocalStorage handles the JSON parse/stringify & SSR hydration
const storedLocale = useLocalStorage('ticketrush:locale', i18nLocale.value)

// 2. Computed-like getter for current locale to ensure template reactivity
const currentLocale = computed(() => i18nLocale.value)

/**
 * 3. Unified Update Function
 * Nuxt i18n setLocale is asynchronous. We sync our local storage after.
 */
async function updateLocale(code: string) {
  if (currentLocale.value === code) return

  await setLocale(code)
  storedLocale.value = code
}

// 4. Sync on Init: Check if stored locale differs from default i18n state
onMounted(() => {
  if (storedLocale.value && storedLocale.value !== i18nLocale.value) {
    const exists = locales.value.some(l => l.code === storedLocale.value)
    if (exists) setLocale(storedLocale.value)
  }
})
</script>
