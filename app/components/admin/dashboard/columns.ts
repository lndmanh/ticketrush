import { h, resolveComponent } from 'vue'
import type { ColumnDef, HeaderContext } from '@tanstack/vue-table'
import { ArrowUpDown, ExternalLink } from '@lucide/vue'
import type { AdminDashboardEventRow } from '~~/types/admin-dashboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import { EventStatus } from '#shared/commonEnums'

function getStatusVariant(status: string): 'default' | 'outline' {
  return status === EventStatus.Draft ? 'outline' : 'default'
}

export function createAdminDashboardColumns(): ColumnDef<AdminDashboardEventRow>[] {
  const { t, locale } = useI18n()
  const NuxtLink = resolveComponent('NuxtLink')

  function getDisplayLocale() {
    return getDisplayDateLocale(locale.value)
  }

  function createSortableHeader(labelKey: string) {
    return ({ column }: HeaderContext<AdminDashboardEventRow, unknown>) => h(Button, {
      variant: 'ghost',
      class: '-ml-3',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
    }, () => [
      t(labelKey),
      h(ArrowUpDown, { class: 'ml-2 size-4' }),
    ])
  }

  function getStatusLabel(status: string) {
    const key = `event_card.status_${status}`
    const translated = t(key)
    return translated === key ? status.replaceAll('_', ' ') : translated
  }

  function getVenueLabel(row: AdminDashboardEventRow) {
    const venueName = row.venueName || t('admin.venue_pending')
    const venueCity = row.venueCity
    return `${venueName}${venueCity ? `, ${venueCity}` : ''}`
  }

  return [
    {
      accessorKey: 'title',
      header: createSortableHeader('admin.dashboard_table_event'),
      cell: ({ row }) => h('div', { class: 'min-w-56 space-y-1' }, [
        h(NuxtLink, {
          to: `/admin/events/${row.original.id}`,
          class: 'group inline-flex max-w-full items-center gap-2 font-medium text-foreground hover:text-primary',
        }, () => [
          h('span', { class: 'truncate' }, row.original.title),
          h(ExternalLink, { class: 'size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' }),
        ]),
        h('p', { class: 'truncate text-sm text-muted-foreground' }, getVenueLabel(row.original)),
      ]),
    },
    {
      accessorKey: 'status',
      header: t('admin.dashboard_table_status'),
      cell: ({ row }) => h(Badge, {
        variant: getStatusVariant(row.original.status),
        class: 'capitalize rounded-full',
      }, () => getStatusLabel(row.original.status)),
    },
    {
      accessorKey: 'soldSeats',
      header: t('admin.dashboard_table_seats'),
      cell: ({ row }) => h('div', { class: 'space-y-1 whitespace-nowrap' }, [
        h('p', { class: 'font-mono text-sm font-medium text-foreground' }, `${row.original.soldSeats}/${row.original.totalSeats}`),
        h('p', { class: 'text-xs text-muted-foreground' }, t('admin.dashboard_sold_listed')),
      ]),
    },
    {
      accessorKey: 'revenueCents',
      header: createSortableHeader('admin.dashboard_table_revenue'),
      cell: ({ row }) => h(
        'span',
        { class: 'font-mono text-sm font-semibold' },
        formatCurrency(row.original.revenueCents, 'USD', getDisplayLocale()),
      ),
    },
    {
      accessorKey: 'nextSessionAt',
      header: t('admin.dashboard_table_next_session'),
      cell: ({ row }) => h(
        'span',
        { class: 'whitespace-nowrap text-sm text-muted-foreground' },
        formatDateTime(row.original.nextSessionAt, getDisplayLocale(), {
          fallback: t('admin.dashboard_not_scheduled'),
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      ),
    },
    {
      accessorKey: 'totalViews',
      header: t('admin.dashboard_table_views'),
      cell: ({ row }) => h(
        'span',
        { class: 'font-mono text-sm text-muted-foreground' },
        formatNumber(row.original.totalViews, getDisplayLocale()),
      ),
    },
  ]
}
