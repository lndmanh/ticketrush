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
      <Badge
        variant="outline"
        class="w-fit rounded-full"
      >
        {{ $t('admin.transactions.count', { count: transactions.length }) }}
      </Badge>
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
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { createColumns } from './columns'

const { locale } = useI18n()
const transactions = ref<AdminTransactionRow[]>([])
const loading = ref(false)

const columns = computed(() => createColumns(getDisplayDateLocale(locale.value)))

async function fetchTransactions() {
  try {
    loading.value = true
    const response = await apiRequest<ApiResponse<AdminTransactionRow[]>>(apiRoutes.ADMIN_TRANSACTIONS)
    if (!response.success) {
      throw response
    }

    transactions.value = response.data
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to load transaction records').message)
  }
  finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTransactions()
})
</script>
