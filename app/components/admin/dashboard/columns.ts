import { h, resolveComponent } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown, ExternalLink } from '@lucide/vue'
import type { AdminDashboardEventRow } from '~~/types/admin-dashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(value: string | Date | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getStatusVariant(status: string): 'default' | 'outline' {
  return status === 'draft' ? 'outline' : 'default'
}

export function createAdminDashboardColumns(): ColumnDef<AdminDashboardEventRow>[] {
  const NuxtLink = resolveComponent('NuxtLink')

  return [
    {
      accessorKey: 'title',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        class: '-ml-3',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Event', h(ArrowUpDown, { class: 'ml-2 size-4' })]),
      cell: ({ row }) => h('div', { class: 'min-w-56 space-y-1' }, [
        h(NuxtLink, {
          to: `/admin/events/${row.original.id}`,
          class: 'group inline-flex max-w-full items-center gap-2 font-medium text-foreground hover:text-primary',
        }, () => [
          h('span', { class: 'truncate' }, row.original.title),
          h(ExternalLink, { class: 'size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' }),
        ]),
        h('p', { class: 'truncate text-sm text-muted-foreground' }, `${row.original.venueName || 'Venue pending'}${row.original.venueCity ? `, ${row.original.venueCity}` : ''}`),
      ]),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => h(Badge, {
        variant: getStatusVariant(row.original.status),
        class: 'capitalize rounded-full',
      }, () => row.original.status.replaceAll('_', ' ')),
    },
    {
      accessorKey: 'soldSeats',
      header: 'Seats',
      cell: ({ row }) => h('div', { class: 'space-y-1 whitespace-nowrap' }, [
        h('p', { class: 'font-mono text-sm font-medium text-foreground' }, `${row.original.soldSeats}/${row.original.totalSeats}`),
        h('p', { class: 'text-xs text-muted-foreground' }, 'sold / listed'),
      ]),
    },
    {
      accessorKey: 'revenueCents',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        class: '-ml-3',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Revenue', h(ArrowUpDown, { class: 'ml-2 size-4' })]),
      cell: ({ row }) => h('span', { class: 'font-mono text-sm font-semibold' }, formatCurrency(row.original.revenueCents)),
    },
    {
      accessorKey: 'nextSessionAt',
      header: 'Next session',
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-sm text-muted-foreground' }, formatDate(row.original.nextSessionAt)),
    },
    {
      accessorKey: 'totalViews',
      header: 'Views',
      cell: ({ row }) => h('span', { class: 'font-mono text-sm text-muted-foreground' }, row.original.totalViews.toLocaleString()),
    },
  ]
}
