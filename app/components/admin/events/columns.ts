import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown, Eye, MoreHorizontal, Rocket, RotateCcw } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EventStatus } from '#shared/commonEnums'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { getDisplayDateLocale } from '@/lib/localizedEvents'

export interface EventTableRow {
  id: number
  title: string
  subtitle: string | null
  status: string
  venueId: number
  venueName: string
  startsAt: Date
  salesStartAt: Date
  updatedAt: Date | null
}

export function createColumns(
  onOpen: (eventId: number) => void,
  onPublish: (eventId: number) => void,
  onUnpublish: (eventId: number) => void,
): ColumnDef<EventTableRow>[] {
  const { locale, t } = useI18n()

  function getDisplayLocale() {
    return getDisplayDateLocale(locale.value)
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case EventStatus.Draft:
        return t('event_card.status_draft')
      case EventStatus.Published:
        return t('event_card.status_published')
      case EventStatus.OnSale:
        return t('event_card.status_on_sale')
      case EventStatus.SoldOut:
        return t('event_card.status_sold_out')
      case EventStatus.Ended:
        return t('event_card.status_ended')
      case EventStatus.Cancelled:
        return t('event_card.status_cancelled')
      default:
        return status
    }
  }

  return [
    {
      accessorKey: 'title',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [t('admin.columns.event'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'space-y-1' }, [
        h('p', { class: 'font-medium text-foreground' }, row.original.title),
        h('p', { class: 'text-sm text-muted-foreground' }, row.original.subtitle ?? row.original.venueName),
      ]),
    },
    {
      accessorKey: 'status',
      header: t('admin.columns.status'),
      cell: ({ row }) => h(Badge, {
        variant: row.original.status === EventStatus.Draft ? 'outline' : 'default',
      }, () => getStatusLabel(row.original.status)),
    },
    {
      accessorKey: 'venueName',
      header: t('admin.columns.venue'),
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground' }, row.original.venueName),
    },
    {
      accessorKey: 'startsAt',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [t('admin.columns.starts'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'text-sm whitespace-nowrap text-muted-foreground' }, formatDateTime(row.original.startsAt, getDisplayLocale())),
    },
    {
      accessorKey: 'salesStartAt',
      header: t('admin.columns.sales_window'),
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground whitespace-nowrap' }, formatDateTime(row.original.salesStartAt, getDisplayLocale())),
    },
    {
      accessorKey: 'updatedAt',
      header: t('admin.columns.updated'),
      cell: ({ row }) => h(
        'div',
        {
          class: 'text-sm text-muted-foreground whitespace-nowrap',
          title: row.original.updatedAt ? formatDateTime(row.original.updatedAt, getDisplayLocale()) : undefined,
        },
        row.original.updatedAt ? formatRelativeTime(row.original.updatedAt, { locale: getDisplayLocale() }) : '—',
      ),
    },
    {
      id: 'actions',
      header: t('admin.columns.actions'),
      cell: ({ row }) => h(DropdownMenu, {}, {
        default: () => [
          h(DropdownMenuTrigger, { asChild: true }, {
            default: () => h(Button, { variant: 'ghost', class: 'h-8 w-8 p-0' }, {
              default: () => [
                h('span', { class: 'sr-only' }, t('common.open_menu')),
                h(MoreHorizontal, { class: 'h-4 w-4' }),
              ],
            }),
          }),
          h(DropdownMenuContent, { align: 'end' }, {
            default: () => [
              h(DropdownMenuItem, { onClick: () => onOpen(row.original.id) }, {
                default: () => h('div', { class: 'flex items-center gap-2' }, [
                  h(Eye, { class: 'h-4 w-4' }),
                  h('span', {}, t('common.open')),
                ]),
              }),
              row.original.status === EventStatus.Draft
                ? h(DropdownMenuItem, { onClick: () => onPublish(row.original.id) }, {
                    default: () => h('div', { class: 'flex items-center gap-2' }, [
                      h(Rocket, { class: 'h-4 w-4' }),
                      h('span', {}, t('admin.columns.publish')),
                    ]),
                  })
                : h(DropdownMenuItem, { onClick: () => onUnpublish(row.original.id) }, {
                    default: () => h('div', { class: 'flex items-center gap-2' }, [
                      h(RotateCcw, { class: 'h-4 w-4' }),
                      h('span', {}, t('admin.columns.unpublish')),
                    ]),
                  }),
            ],
          }),
        ],
      }),
      enableSorting: false,
      enableHiding: false,
      size: 60,
    },
  ]
}
