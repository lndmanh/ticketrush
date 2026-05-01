import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown, Eye, MoreHorizontal, Rocket, RotateCcw } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/utils'

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
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Event', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'space-y-1' }, [
        h('p', { class: 'font-medium text-foreground' }, row.original.title),
        h('p', { class: 'text-sm text-muted-foreground' }, row.original.subtitle ?? row.original.venueName),
      ]),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => h(Badge, {
        variant: row.original.status === 'draft' ? 'outline' : 'default',
        class: 'capitalize',
      }, () => row.original.status.replaceAll('_', ' ')),
    },
    {
      accessorKey: 'venueName',
      header: 'Venue',
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground' }, row.original.venueName),
    },
    {
      accessorKey: 'startsAt',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Starts', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'text-sm whitespace-nowrap text-muted-foreground' }, row.original.startsAt.toLocaleString()),
    },
    {
      accessorKey: 'salesStartAt',
      header: 'Sales window',
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground whitespace-nowrap' }, row.original.salesStartAt.toLocaleString()),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => h(
        'div',
        { class: 'text-sm text-muted-foreground whitespace-nowrap' },
        row.original.updatedAt ? formatRelativeTime(row.original.updatedAt) : '—',
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => h(DropdownMenu, {}, {
        default: () => [
          h(DropdownMenuTrigger, { asChild: true }, {
            default: () => h(Button, { variant: 'ghost', class: 'h-8 w-8 p-0' }, {
              default: () => [
                h('span', { class: 'sr-only' }, 'Open menu'),
                h(MoreHorizontal, { class: 'h-4 w-4' }),
              ],
            }),
          }),
          h(DropdownMenuContent, { align: 'end' }, {
            default: () => [
              h(DropdownMenuItem, { onClick: () => onOpen(row.original.id) }, {
                default: () => h('div', { class: 'flex items-center gap-2' }, [
                  h(Eye, { class: 'h-4 w-4' }),
                  h('span', {}, 'Open'),
                ]),
              }),
              row.original.status === 'draft'
                ? h(DropdownMenuItem, { onClick: () => onPublish(row.original.id) }, {
                    default: () => h('div', { class: 'flex items-center gap-2' }, [
                      h(Rocket, { class: 'h-4 w-4' }),
                      h('span', {}, 'Publish'),
                    ]),
                  })
                : h(DropdownMenuItem, { onClick: () => onUnpublish(row.original.id) }, {
                    default: () => h('div', { class: 'flex items-center gap-2' }, [
                      h(RotateCcw, { class: 'h-4 w-4' }),
                      h('span', {}, 'Unpublish'),
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
