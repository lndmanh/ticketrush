<script setup lang="ts">
import { isDisplayCurrency } from '@/lib/money'
import type { DisplayCurrency } from '@/lib/money'

const { displayCurrencies, displayCurrency, setDisplayCurrency } = useCurrencyPreference()

function updateDisplayCurrency(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !isDisplayCurrency(value)) {
    return
  }

  setDisplayCurrency(value)
}

function getCurrencyLabel(currency: DisplayCurrency) {
  if (currency === 'USD') return $t('common.currency_usd')
  return $t('common.currency_vnd')
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-foreground">
        {{ $t('common.display_currency') }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ $t('common.display_currency_desc') }}
      </p>
    </div>

    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      class="w-full"
      :model-value="displayCurrency"
      @update:model-value="updateDisplayCurrency"
    >
      <ToggleGroupItem
        v-for="currency in displayCurrencies"
        :key="currency"
        :value="currency"
        class="flex-1"
        :aria-label="getCurrencyLabel(currency)"
      >
        {{ currency }}
      </ToggleGroupItem>
    </ToggleGroup>
  </div>
</template>
