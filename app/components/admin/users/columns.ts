import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from '@lucide/vue'
import type { User } from '~~/shared/db'
import { formatRelativeTime } from '@/lib/utils'

export function createColumns(
  onEdit: (user: User) => void,
  onDelete: (userId: number) => void,
): ColumnDef<User>[] {
  return [
    {
      id: 'select',
      header: ({ table }) =>
        h(Checkbox, {
          'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean | string) =>
            table.toggleAllPageRowsSelected(!!value),
          'ariaLabel': 'Select all',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          'modelValue': row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | string) => row.toggleSelected(!!value),
          'ariaLabel': 'Select row',
        }),
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) =>
        h('div', { class: 'font-mono text-sm text-muted-foreground' }, row.getValue('id')),
      size: 60,
    },
    {
      accessorKey: 'username',
      header: ({ column }) => {
        return h(Button, {
          variant: 'ghost',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }, () => ['Username', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', { class: 'font-medium' }, row.getValue('username')),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return h(Button, {
          variant: 'ghost',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }, () => ['Name', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', { class: 'text-sm' }, row.getValue('name')),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => {
        return h(Button, {
          variant: 'ghost',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }, () => ['Email', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', { class: 'text-sm text-muted-foreground' }, row.getValue('email')),
    },
    {
      accessorKey: 'isAdmin',
      header: 'Roles',
      cell: ({ row }) => {
        const user = row.original
        return h('div', { class: 'flex gap-2' }, [
          user.isAdmin && h(
            Badge,
            { variant: 'destructive', class: 'text-xs' },
            () => 'Admin',
          ),
        ])
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => {
        return h(Button, {
          variant: 'ghost',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }, () => ['Created at', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', { class: 'text-sm text-muted-foreground whitespace-nowrap' }, formatRelativeTime(row.getValue('createdAt'))),
    },
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => {
        return h(Button, {
          variant: 'ghost',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }, () => ['Last Login', h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', { class: 'text-sm text-muted-foreground whitespace-nowrap' }, formatRelativeTime(row.getValue('lastLoginAt'))),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original
        return h(
          DropdownMenu,
          {},
          {
            default: () => [
              h(
                DropdownMenuTrigger,
                { asChild: true },
                {
                  default: () => h(
                    Button,
                    { variant: 'ghost', class: 'h-8 w-8 p-0' },
                    {
                      default: () => [
                        h('span', { class: 'sr-only' }, 'Open menu'),
                        h(MoreHorizontal, { class: 'h-4 w-4' }),
                      ],
                    },
                  ),
                },
              ),
              h(
                DropdownMenuContent,
                { align: 'end' },
                {
                  default: () => [
                    h(
                      DropdownMenuItem,
                      {
                        onClick: () => onEdit(user),
                      },
                      {
                        default: () => h('div', { class: 'flex items-center gap-2' }, [
                          h(Pencil, { class: 'h-4 w-4' }),
                          h('span', {}, 'Edit'),
                        ]),
                      },
                    ),
                    h(
                      DropdownMenuItem,
                      {
                        onClick: () => onDelete(user.id),
                        class: 'text-destructive focus:text-destructive',
                      },
                      {
                        default: () => h('div', { class: 'flex items-center gap-2' }, [
                          h(Trash2, { class: 'h-4 w-4' }),
                          h('span', {}, 'Delete'),
                        ]),
                      },
                    ),
                  ],
                },
              ),
            ],
          },
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 60,
    },
  ]
}
