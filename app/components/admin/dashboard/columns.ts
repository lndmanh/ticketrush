import { h, resolveComponent } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown, ExternalLink } from '@lucide/vue'
import type { AdminDashboardEventRow } from '~~/types/admin-dashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDisplayDateLocale, getLocalizedCityName, getLocalizedEventTitle, getLocalizedVenueName } from '@/lib/localizedEvents'

interface AdminDashboardColumnOptions {
  t: (key: string, params?: Record<string, string | number>) => string
  locale: string
  localePath: (path: string) => string
}

function formatCurrency(cents: number, locale: string) {
  return new Intl.NumberFormat(getDisplayDateLocale(locale), {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(value: string | Date | null, options: AdminDashboardColumnOptions) {
  if (!value) return options.t('admin.dashboard_not_scheduled')
  return new Date(value).toLocaleDateString(getDisplayDateLocale(options.locale), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getStatusVariant(status: string): 'default' | 'outline' {
  return status === 'draft' ? 'outline' : 'default'
}

function getStatusLabel(status: string, t: AdminDashboardColumnOptions['t']) {
  const key = `event_card.status_${status}`
  const translated = t(key)
  return translated === key ? status.replaceAll('_', ' ') : translated
}

function getVenueLabel(row: AdminDashboardEventRow, options: AdminDashboardColumnOptions) {
  const venueName = getLocalizedVenueName(row.venueName, options.locale) || options.t('admin.venue_pending')
  const venueCity = getLocalizedCityName(row.venueCity, options.locale)
  return `${venueName}${venueCity ? `, ${venueCity}` : ''}`
}

export function createAdminDashboardColumns(options: AdminDashboardColumnOptions): ColumnDef<AdminDashboardEventRow>[] {
  const NuxtLink = resolveComponent('NuxtLink')

  return [
    {
      accessorKey: 'title',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        class: '-ml-3',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [options.t('admin.dashboard_table_event'), h(ArrowUpDown, { class: 'ml-2 size-4' })]),
      cell: ({ row }) => h('div', { class: 'min-w-56 space-y-1' }, [
        h(NuxtLink, {
          to: options.localePath(`/admin/events/${row.original.id}`),
          class: 'group inline-flex max-w-full items-center gap-2 font-medium text-foreground hover:text-primary',
        }, () => [
          h('span', { class: 'truncate' }, getLocalizedEventTitle(row.original.title, options.locale)),
          h(ExternalLink, { class: 'size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' }),
        ]),
        h('p', { class: 'truncate text-sm text-muted-foreground' }, getVenueLabel(row.original, options)),
      ]),
    },
    {
      accessorKey: 'status',
      header: options.t('admin.dashboard_table_status'),
      cell: ({ row }) => h(Badge, {
        variant: getStatusVariant(row.original.status),
        class: 'capitalize rounded-full',
      }, () => getStatusLabel(row.original.status, options.t)),
    },
    {
      accessorKey: 'soldSeats',
      header: options.t('admin.dashboard_table_seats'),
      cell: ({ row }) => h('div', { class: 'space-y-1 whitespace-nowrap' }, [
        h('p', { class: 'font-mono text-sm font-medium text-foreground' }, `${row.original.soldSeats}/${row.original.totalSeats}`),
        h('p', { class: 'text-xs text-muted-foreground' }, options.t('admin.dashboard_sold_listed')),
      ]),
    },
    {
      accessorKey: 'revenueCents',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        class: '-ml-3',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [options.t('admin.dashboard_table_revenue'), h(ArrowUpDown, { class: 'ml-2 size-4' })]),
      cell: ({ row }) => h('span', { class: 'font-mono text-sm font-semibold' }, formatCurrency(row.original.revenueCents, options.locale)),
    },
    {
      accessorKey: 'nextSessionAt',
      header: options.t('admin.dashboard_table_next_session'),
      cell: ({ row }) => h('span', { class: 'whitespace-nowrap text-sm text-muted-foreground' }, formatDate(row.original.nextSessionAt, options)),
    },
    {
      accessorKey: 'totalViews',
      header: options.t('admin.dashboard_table_views'),
      cell: ({ row }) => h('span', { class: 'font-mono text-sm text-muted-foreground' }, row.original.totalViews.toLocaleString(getDisplayDateLocale(options.locale))),
    },
  ]
}
