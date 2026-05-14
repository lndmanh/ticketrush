import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown } from '@lucide/vue'
import type { AdminTransactionRow } from '~~/types/admin-transactions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUiFallbackText } from '@/utils/uiText'

export function createColumns(locale: string): ColumnDef<AdminTransactionRow>[] {
  const { t } = useI18n()

  function tx(key: string) {
    const translated = t(key)
    return translated === key ? getUiFallbackText(key) : translated
  }

  return [
    {
      accessorKey: 'orderId',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [tx('admin.transactions.order_id'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'max-w-52 space-y-1' }, [
        h('div', { class: 'truncate font-mono text-xs font-semibold text-foreground', title: row.original.orderId }, row.original.orderId),
        h('div', { class: 'line-clamp-1 text-xs text-muted-foreground' }, row.original.eventTitle),
      ]),
      size: 220,
    },
    {
      id: 'buyer',
      accessorFn: row => `${row.buyerName ?? ''} ${row.buyerEmail ?? ''} ${row.buyerPhone ?? ''}`,
      header: tx('admin.transactions.buyer_info'),
      cell: ({ row }) => h('div', { class: 'min-w-48 space-y-1' }, [
        h('div', { class: 'font-medium text-foreground' }, row.original.buyerName || tx('admin.transactions.no_buyer_name')),
        h('div', { class: 'text-xs text-muted-foreground' }, row.original.buyerEmail || tx('admin.transactions.no_buyer_email')),
        row.original.buyerPhone
          ? h('div', { class: 'text-xs text-muted-foreground' }, row.original.buyerPhone)
          : null,
      ]),
    },
    {
      id: 'seats',
      accessorFn: row => row.seats.map(seat => seat.label).join(' '),
      header: tx('admin.transactions.seat_info'),
      cell: ({ row }) => {
        const seats = row.original.seats
        if (seats.length === 0) {
          return h('span', { class: 'text-sm text-muted-foreground' }, tx('admin.transactions.no_seats'))
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
      }, () => [tx('admin.transactions.total_amount'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap font-semibold text-foreground' }, formatCurrency(row.original.totalAmountCents, row.original.currency, locale)),
    },
    {
      accessorKey: 'paymentTime',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [tx('admin.transactions.payment_time'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'whitespace-nowrap text-sm text-muted-foreground' }, formatPaymentTime(row.original.paymentTime, locale, tx('admin.transactions.unpaid'))),
    },
    {
      accessorKey: 'status',
      header: tx('admin.transactions.status'),
      cell: ({ row }) => h(Badge, {
        variant: getStatusVariant(row.original.status),
        class: 'rounded-full',
      }, () => formatStatus(row.original.status, tx)),
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

function formatPaymentTime(value: string | Date | null, locale: string, fallback: string) {
  if (!value) {
    return fallback
  }

  return new Date(value).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatStatus(status: string, translate: (key: string) => string) {
  const key = `admin.transactions.status_${status}`
  const translated = translate(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
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
