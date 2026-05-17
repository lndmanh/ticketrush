<script setup lang="ts">
import { LanguagesIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from '@lucide/vue'
import { useLocalStorage } from '@vueuse/core'

const colorMode = useColorMode()
const { locale: i18nLocale, locales, setLocale, t } = useI18n()
const storedLocale = useLocalStorage('ticketrush:locale', i18nLocale.value)
const currentLocale = computed(() => i18nLocale.value)

const themeOptions = computed(() => [
  { value: 'light', label: t('common.light'), icon: SunIcon },
  { value: 'dark', label: t('common.dark'), icon: MoonIcon },
  { value: 'system', label: t('common.system'), icon: MonitorIcon },
])

function updateTheme(value: string | string[] | undefined) {
  if (value !== 'light' && value !== 'dark' && value !== 'system') {
    return
  }

  colorMode.preference = value
}

async function updateLocale(value: string | string[] | undefined) {
  if (typeof value !== 'string' || currentLocale.value === value) {
    return
  }

  await setLocale(value)
  storedLocale.value = value
}

onMounted(() => {
  if (storedLocale.value && storedLocale.value !== i18nLocale.value) {
    const exists = locales.value.some(availableLocale => availableLocale.code === storedLocale.value)
    if (exists) setLocale(storedLocale.value)
  }
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
      >
        <SettingsIcon data-icon="inline-start" />
        <span class="sr-only">{{ $t('common.open_dashboard_preferences') }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-80"
      align="end"
      :side-offset="10"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2 text-sm font-medium text-foreground">
            <SunIcon data-icon="inline-start" />
            {{ $t('common.appearance') }}
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            class="w-full"
            :model-value="colorMode.preference"
            @update:model-value="updateTheme"
          >
            <ToggleGroupItem
              v-for="option in themeOptions"
              :key="option.value"
              :value="option.value"
              class="flex-1 gap-1.5"
              :aria-label="option.label"
            >
              <component
                :is="option.icon"
                data-icon="inline-start"
                class="size-4"
              />
              {{ option.label }}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2 text-sm font-medium text-foreground">
            <LanguagesIcon data-icon="inline-start" />
            {{ $t('common.lang') }}
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            class="w-full"
            :model-value="currentLocale"
            @update:model-value="updateLocale"
          >
            <ToggleGroupItem
              v-for="availableLocale in locales"
              :key="availableLocale.code"
              :value="availableLocale.code"
              class="flex-1"
              :aria-label="availableLocale.name"
            >
              {{ availableLocale.name }}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator />

        <CurrencyPreferenceContent />
      </div>
    </PopoverContent>
  </Popover>
</template>
