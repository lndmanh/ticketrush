import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { ArrowUpDown, Rows3, MoreHorizontal } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Venue } from '#shared/db'
import { formatRelativeTime } from '@/lib/utils'

export function createColumns(
  onOpenStudio: (venueId: number) => void,
): ColumnDef<Venue>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Venue', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'space-y-1' }, [
        h('p', { class: 'font-medium text-foreground' }, row.original.name),
        h('p', { class: 'text-sm text-muted-foreground' }, row.original.slug),
      ]),
    },
    {
      accessorKey: 'city',
      header: 'City',
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground' }, row.original.city),
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ row }) => h('div', { class: 'max-w-[20rem] text-sm text-muted-foreground' }, row.original.address),
    },
    {
      accessorKey: 'capacity',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => ['Capacity', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'font-mono text-sm text-foreground' }, row.original.capacity),
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
              h(DropdownMenuItem, { onClick: () => onOpenStudio(row.original.id) }, {
                default: () => h('div', { class: 'flex items-center gap-2' }, [
                  h(Rows3, { class: 'h-4 w-4' }),
                  h('span', {}, 'Open Studio'),
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
