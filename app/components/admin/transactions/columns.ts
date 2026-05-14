import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown } from '@lucide/vue'
import type { AdminTransactionRow } from '~~/types/admin-transactions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function createColumns(locale: string): ColumnDef<AdminTransactionRow>[] {
  return [
    {
      accessorKey: 'orderId',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Mã đơn hàng', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'space-y-1' }, [
        h('div', { class: 'font-mono text-xs font-semibold text-foreground' }, row.original.orderId),
        h('div', { class: 'line-clamp-1 text-xs text-muted-foreground' }, row.original.eventTitle),
      ]),
    },
    {
      id: 'buyer',
      accessorFn: row => `${row.buyerName ?? ''} ${row.buyerEmail ?? ''} ${row.buyerPhone ?? ''}`,
      header: 'Thông tin người mua',
      cell: ({ row }) => h('div', { class: 'min-w-48 space-y-1' }, [
        h('div', { class: 'font-medium text-foreground' }, row.original.buyerName || 'Chưa có tên'),
        h('div', { class: 'text-xs text-muted-foreground' }, row.original.buyerEmail || 'Chưa có email'),
        row.original.buyerPhone
          ? h('div', { class: 'text-xs text-muted-foreground' }, row.original.buyerPhone)
          : null,
      ]),
    },
    {
      id: 'seats',
      accessorFn: row => row.seats.map(seat => seat.label).join(' '),
      header: 'Thông tin ghế',
      cell: ({ row }) => {
        const seats = row.original.seats
        if (seats.length === 0) {
          return h('span', { class: 'text-sm text-muted-foreground' }, 'Không có ghế')
        }

        return h('div', { class: 'flex min-w-56 flex-wrap gap-1.5' }, seats.map(seat => h(Badge, {
          variant: 'secondary',
          class: 'max-w-56 truncate rounded-full font-normal',
        }, () => seat.label)))
      },
    },
    {
      accessorKey: 'totalAmountCents',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Tổng tiền', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap font-semibold text-foreground' }, formatCurrency(row.original.totalAmountCents, row.original.currency, locale)),
    },
    {
      accessorKey: 'paymentTime',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Thời gian thanh toán', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm text-muted-foreground' }, formatPaymentTime(row.original.paymentTime, locale)),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái giao dịch',
      cell: ({ row }) => h(Badge, {
        variant: getStatusVariant(row.original.status),
        class: 'rounded-full capitalize',
      }, () => formatStatus(row.original.status)),
    },
  ]
}

function formatCurrency(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatPaymentTime(value: string | Date | null, locale: string) {
  if (!value) {
    return 'Chưa thanh toán'
  }

  return new Date(value).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'confirmed') {
    return 'default'
  }

  if (status === 'cancelled' || status === 'expired') {
    return 'destructive'
  }

  if (status === 'pending') {
    return 'secondary'
  }

  return 'outline'
}
