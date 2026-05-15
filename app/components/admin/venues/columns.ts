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
import { getVietnamProvinceName } from '#shared/constants/vietnamProvinces'
import { formatRelativeTime } from '@/lib/utils'

export function createColumns(
  onOpenStudio: (venueId: number) => void,
  t: (key: string) => string,
  getLocale: () => string,
): ColumnDef<Venue>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [t('admin.columns.venue'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'space-y-1' }, [
        h('p', { class: 'font-medium text-foreground' }, row.original.name),
        h('p', { class: 'text-sm text-muted-foreground' }, row.original.slug),
      ]),
    },
    {
      accessorKey: 'city',
      header: t('admin.venues.city'),
      cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground' }, getVietnamProvinceName(row.original.city, getLocale())),
    },
    {
      accessorKey: 'address',
      header: t('admin.venues.address'),
      cell: ({ row }) => h('div', { class: 'max-w-[20rem] text-sm text-muted-foreground' }, row.original.address),
    },
    {
      accessorKey: 'capacity',
      header: ({ column }) => h(Button, {
        variant: 'ghost',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
      }, () => [t('admin.columns.capacity'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })]),
      cell: ({ row }) => h('div', { class: 'font-mono text-sm text-foreground' }, row.original.capacity),
    },
    {
      accessorKey: 'updatedAt',
      header: t('admin.columns.updated'),
      cell: ({ row }) => h(
        'div',
        { class: 'text-sm text-muted-foreground whitespace-nowrap' },
        row.original.updatedAt ? formatRelativeTime(row.original.updatedAt) : '—',
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
                  h('span', {}, t('admin.venues.open_studio')),
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
