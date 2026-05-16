<script setup lang="ts" generic="TData, TValue">
import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ref } from 'vue'
import { ChevronDown, RefreshCw, SearchIcon, SearchXIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { valueUpdater } from '@/lib/utils'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading: boolean
  searchPlaceholder?: string
  emptyTitle?: string
  emptyDescription?: string
}

const props = defineProps<DataTableProps<TData, TValue>>()
const { t } = useI18n()

const emit = defineEmits<{
  (e: 'update:data'): void
}>()

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})
const globalFilter = ref('')

const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return props.columns
  },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: updaterOrValue =>
    valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: updaterOrValue =>
    valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: updaterOrValue =>
    valueUpdater(updaterOrValue, rowSelection),
  onGlobalFilterChange: (updaterOrValue) => {
    globalFilter.value
      = typeof updaterOrValue === 'function'
        ? updaterOrValue(globalFilter.value)
        : updaterOrValue
  },
  state: {
    get sorting() {
      return sorting.value
    },
    get columnFilters() {
      return columnFilters.value
    },
    get columnVisibility() {
      return columnVisibility.value
    },
    get rowSelection() {
      return rowSelection.value
    },
    get globalFilter() {
      return globalFilter.value
    },
  },
})

defineExpose({
  table,
})
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <slot name="toolbar-leading" />
    <div class="relative w-full min-w-0 sm:w-[18rem]">
      <SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        :model-value="globalFilter ?? ''"
        :placeholder="props.searchPlaceholder || $t('search.title')"
        class="pl-9"
        @update:model-value="(value) => (globalFilter = String(value))"
      />
    </div>
    <div class="ml-auto flex items-center gap-2">
      <slot name="toolbar-actions" />
      <Button
        variant="outline"
        :is-loading="props.loading"
        @click="emit('update:data')"
      >
        <RefreshCw />
        {{ t('data_table.reload') }}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline">
            {{ t('data_table.columns') }}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuCheckboxItem
            v-for="column in table
              .getAllColumns()
              .filter((column) => column.getCanHide())"
            :key="column.id"
            class="capitalize"
            :model-value="column.getIsVisible()"
            @update:model-value="(value) => {
              column.toggleVisibility(!!value)
            }"
          >
            {{ column.id }}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>

  <div class="overflow-hidden rounded-md border">
    <div class="overflow-x-auto">
      <Table class="min-w-[56rem]">
        <TableHeader>
          <TableRow
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="border-b border-border"
          >
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="h-12 whitespace-nowrap px-4 text-xs text-muted-foreground"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() && 'selected'"
              class="border-b border-border/80 align-top transition-colors duration-200 hover:bg-secondary/45"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="px-4 py-4 text-sm leading-6"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow>
              <TableCell
                :colspan="table.getAllColumns().length"
                class="px-6 py-16 text-center"
              >
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchXIcon />
                    </EmptyMedia>
                    <EmptyTitle>{{ props.emptyTitle || $t('errors.no_result') }}</EmptyTitle>
                    <EmptyDescription>{{ props.emptyDescription || $t('blog.no_results_description') }}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>
  </div>

  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div class="text-sm text-muted-foreground">
      <slot name="footer-leading" />
      {{ t('data_table.rows_selected', {
        selected: table.getFilteredSelectedRowModel().rows.length,
        total: table.getFilteredRowModel().rows.length,
      }) }}
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        :disabled="!table.getCanPreviousPage()"
        @click="table.previousPage()"
      >
        {{ t('data_table.previous') }}
      </Button>
      <Button
        variant="outline"
        size="sm"
        :disabled="!table.getCanNextPage()"
        @click="table.nextPage()"
      >
        {{ t('data_table.next') }}
      </Button>
    </div>
  </div>
</template>
