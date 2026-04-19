<template>
  <div class="grid gap-6">
    <div class="grid space-y-1">
      <h1 class="text-foreground text-lg font-semibold">
        {{ $t('customizer.title') }}
      </h1>
      <p class="text-muted-foreground text-sm">
        {{ $t('customizer.prompt') }}
      </p>
    </div>
    <div class="space-y-1.5">
      <Label>{{ $t('common.theme') }}</Label>
      <div class="grid grid-cols-3 gap-2">
        <template
          v-for="color in allColors"
          :key="color"
        >
          <Button
            class="justify-start gap-2"
            variant="outline"
            :class="{ 'border-primary border-2': theme === color }"
            @click="setTheme(color)"
          >
            <span
              class="flex size-5 items-center justify-center rounded-full"
              :style="{ backgroundColor: backgroundColor(color) }"
            >
              <CheckIcon
                v-if="theme === color"
                :size="16"
                class="text-white"
              />
            </span>
            <span class="text-xs capitalize">{{ color }}</span>
          </Button>
        </template>
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>{{ $t('customizer.radius') }}</Label>
      <div class="grid grid-cols-5 gap-2">
        <template
          v-for="r in RADII"
          :key="r"
        >
          <Button
            class="justify-center gap-2"
            variant="outline"
            :class="{ 'border-primary border-2': radius === r }"
            @click="setRadius(r)"
          >
            <span class="text-xs capitalize">{{ r }}</span>
          </Button>
        </template>
      </div>
    </div>
    <div
      v-if="darkModeToggle"
      class="space-y-1.5"
    >
      <Label>{{ $t('common.theme') }}</Label>
      <div class="grid grid-cols-3 gap-2">
        <Button
          class="justify-center gap-2"
          variant="outline"
          :class="{ 'border-primary border-2': colorMode.preference === 'light' }"
          @click="colorMode.preference = 'light'"
        >
          <SunIcon
            :size="16"
          />
          <span class="text-xs capitalize">{{ $t('common.light') }}</span>
        </Button>
        <Button
          class="justify-center gap-2"
          variant="outline"
          :class="{ 'border-primary border-2': colorMode.preference === 'dark' }"
          @click="colorMode.preference = 'dark'"
        >
          <MoonIcon
            :size="16"
          />
          <span class="text-xs capitalize">{{ $t('common.dark') }}</span>
        </Button>
        <Button
          class="justify-center gap-2"
          variant="outline"
          :class="{ 'border-primary border-2': colorMode.preference === 'system' }"
          @click="colorMode.preference = 'system'"
        >
          <MonitorIcon
            :size="16"
          />
          <span class="text-xs capitalize">{{ $t('common.system') }}</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { themes } from '@/lib/themes'
import { CheckIcon, SunIcon, MoonIcon, MonitorIcon } from '@lucide/vue'
import type { Color } from '~~/types'

const { setClassTheme, theme, radius, setTheme, setRadius, allColors } = useThemes()
const { darkModeToggle } = useConfig().value.header

const RADII = [0, 0.25, 0.5, 0.75, 1]

// Whenever the theme value changes, update the document class list
watch(theme, () => {
  setClassTheme()
})

// Whenever the radius value changes, update the document style
watch(radius, () => {
  setStyleRadius()
})

function setStyleRadius() {
  document.body.style.setProperty('--radius', `${radius.value}rem`)
}

function backgroundColor(color: Color) {
  const bg = themes.find(theme => theme.name === color)
  return `hsl(${bg?.activeColor.light})`
}

const colorMode = useColorMode()
</script>
