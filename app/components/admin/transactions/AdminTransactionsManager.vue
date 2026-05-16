<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold text-foreground">
          {{ $t('admin.transactions.title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('admin.transactions.desc') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Label
          for="admin-transactions-range"
          class="text-sm text-muted-foreground"
        >{{ $t('admin.transactions.range') }}</Label>
        <Select v-model="selectedRange">
          <SelectTrigger
            id="admin-transactions-range"
            class="w-36"
          >
            <SelectValue :placeholder="$t('admin.transactions.select_range')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in adminAnalyticsTimeRangeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ $t(`admin.transactions.range_${option.value}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>

    <DataTable
      :columns="columns"
      :data="transactions"
      :loading="loading"
      :search-placeholder="$t('admin.transactions.search')"
      :empty-title="$t('admin.transactions.empty_title')"
      :empty-description="$t('admin.transactions.empty_desc')"
      @update:data="fetchTransactions"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import type { ApiResponse } from '~~/types/api'
import type { AdminTransactionRow } from '~~/types/admin-transactions'
import DataTable from '@/components/DataTable.vue'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'
import { adminAnalyticsTimeRangeOptions, DEFAULT_ADMIN_ANALYTICS_TIME_RANGE } from '#shared/adminAnalyticsTimeRanges'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { createColumns } from './columns'

const { locale, t } = useI18n()
const transactions = ref<AdminTransactionRow[]>([])
const loading = ref(false)
const selectedRange = ref(DEFAULT_ADMIN_ANALYTICS_TIME_RANGE)

const columns = computed(() => createColumns(getDisplayDateLocale(locale.value)))

async function fetchTransactions() {
  try {
    loading.value = true
    const searchParams = new URLSearchParams({ range: selectedRange.value })
    const response = await apiRequest<ApiResponse<AdminTransactionRow[]>>(`${apiRoutes.ADMIN_TRANSACTIONS}?${searchParams.toString()}`)
    if (!response.success) {
      throw response
    }

    transactions.value = response.data
  }
  catch (error) {
    toast.error(parseApiError(error, t('admin.transactions.load_failed')).message)
  }
  finally {
    loading.value = false
  }
}

watch(selectedRange, () => {
  fetchTransactions()
})

onMounted(() => {
  fetchTransactions()
})
</script>
