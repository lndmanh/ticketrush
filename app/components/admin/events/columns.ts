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
import { formatRelativeTime } from '@/lib/utils'
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

  function formatDateTime(value: string | Date) {
    return new Date(value).toLocaleString(getDisplayDateLocale(locale.value))
  }

  return [
    {
      accessorKey: 'title',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [t('admin.events.table_event'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'space-y-1' }, [
        h('p', { class: 'font-medium text-foreground' }, row.original.title),
        h('p', { class: 'text-sm text-muted-foreground' }, row.original.subtitle ?? row.original.venueName),
      ]),
    },
    {
      accessorKey: 'status',
      header: t('admin.events.table_status'),
      cell: ({ row }) => h(Badge, {
        variant: row.original.status === EventStatus.Draft ? 'outline' : 'default',
        class: 'capitalize',
      }, () => t(`event_card.status_${row.original.status}`)),
    },
    {
      accessorKey: 'venueName',
      header: t('admin.events.table_venue'),
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground' }, row.original.venueName),
    },
    {
      accessorKey: 'startsAt',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [t('admin.events.table_starts'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'text-sm whitespace-nowrap text-muted-foreground' }, formatDateTime(row.original.startsAt)),
    },
    {
      accessorKey: 'salesStartAt',
      header: t('admin.events.table_sales_window'),
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground whitespace-nowrap' }, formatDateTime(row.original.salesStartAt)),
    },
    {
      accessorKey: 'updatedAt',
      header: t('admin.events.table_updated'),
      cell: ({ row }) => h(
        'div',
        { class: 'text-sm text-muted-foreground whitespace-nowrap' },
        row.original.updatedAt ? formatRelativeTime(row.original.updatedAt) : '—',
      ),
    },
    {
      id: 'actions',
      header: t('admin.events.table_actions'),
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
                       h('span', {}, t('admin.events.publish')),
                    ]),
                  })
                : h(DropdownMenuItem, { onClick: () => onUnpublish(row.original.id) }, {
                    default: () => h('div', { class: 'flex items-center gap-2' }, [
                      h(RotateCcw, { class: 'h-4 w-4' }),
                       h('span', {}, t('admin.events.unpublish')),
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
