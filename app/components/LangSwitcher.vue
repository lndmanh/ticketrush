<template>
  <UseTemplate>
    <Button
      variant="ghost"
      size="icon"
      class="uppercase"
    >
      <LanguagesIcon
        v-if="triggerType === 'icon'"
        :size="18"
      />
      <span
        v-else-if="triggerType === 'text'"
        class="font-semibold"
      >
        {{ locale }}
      </span>
    </Button>
  </UseTemplate>

  <template v-if="enable && locales.length > 1">
    <Popover v-if="dropdownType === 'popover'">
      <PopoverTrigger as-child>
        <Trigger />
      </PopoverTrigger>
      <PopoverContent
        class="w-[23rem]"
        :align="breakpoints.isGreaterOrEqual('md') ? 'end' : 'center'"
      >
        <div class="grid gap-6">
          <div class="grid space-y-1">
            <h1 class="text-foreground text-lg font-semibold">
              {{ $t('common.lang') }}
            </h1>
            <p class="text-muted-foreground text-sm">
              {{ $t('common.locale.prompt') }}
            </p>
          </div>
          <div class="space-y-1.5">
            <div class="grid grid-cols-3 gap-2">
              <template
                v-for="l in locales"
                :key="l.code"
              >
                <Button
                  class="justify-start gap-2"
                  variant="outline"
                  :class="{ 'border-primary border-2': locale === l.code }"
                  @click="navigateTo(switchLocalePath(l.code))"
                >
                  <span class="text-xs capitalize">{{ l.name }}</span>
                </Button>
              </template>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    <DropdownMenu v-else-if="dropdownType === 'select'">
      <DropdownMenuTrigger as-child>
        <Trigger />
      </DropdownMenuTrigger>
      <DropdownMenuContent class="w-20">
        <DropdownMenuRadioGroup v-model="selectedLocale">
          <DropdownMenuRadioItem
            v-for="l in locales"
            :key="l.code"
            :value="l.code"
            @click="selectedLocale = l.code; navigateTo(switchLocalePath(l.code))"
          >
            {{ l.name }}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </template>
</template>

<script setup lang="ts">
import { LanguagesIcon } from '@lucide/vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const selectedLocale = ref(locale.value)
const { enable, triggerType, dropdownType } = useConfig().value.header.languageSwitcher

const breakpoints = useBreakpoints(breakpointsTailwind)

const [UseTemplate, Trigger] = createReusableTemplate()
</script>
