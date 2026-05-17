import { h } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, Lock, MoreHorizontal, Pencil, Trash2, Unlock } from '@lucide/vue'
import type { User } from '~~/shared/db'
import { getDisplayDateLocale } from '@/lib/localizedEvents'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'

export function createColumns(
  onEdit: (user: User) => void,
  onDelete: (userId: number) => void,
  onLockToggle: (user: User) => void,
): ColumnDef<User>[] {
  const { locale, t } = useI18n()

  function getDisplayLocale() {
    return getDisplayDateLocale(locale.value)
  }

  return [
    {
      id: 'select',
      header: ({ table }) =>
        h(Checkbox, {
          'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean | string) =>
            table.toggleAllPageRowsSelected(!!value),
          'ariaLabel': t('admin.columns.select_all'),
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          'modelValue': row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | string) => row.toggleSelected(!!value),
          'ariaLabel': t('admin.columns.select_row'),
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
        }, () => [t('admin.columns.username'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
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
        }, () => [t('admin.columns.name'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
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
        }, () => [t('admin.columns.email'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', { class: 'text-sm text-muted-foreground' }, row.getValue('email')),
    },
    {
      accessorKey: 'isAdmin',
      header: t('admin.columns.roles'),
      cell: ({ row }) => {
        const user = row.original
        return h('div', { class: 'flex gap-2' }, [
          user.isAdmin && h(
            Badge,
            { variant: 'destructive', class: 'text-xs' },
            () => t('admin.users.admin_badge'),
          ),
          user.isLocked && h(
            Badge,
            { variant: 'outline', class: 'text-xs text-muted-foreground' },
            () => t('admin.users.locked_badge'),
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
        }, () => [t('admin.columns.created_at'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', {
          class: 'text-sm text-muted-foreground whitespace-nowrap',
          title: formatDateTime(row.original.createdAt, getDisplayLocale()),
        }, formatRelativeTime(row.original.createdAt, { locale: getDisplayLocale() })),
    },
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => {
        return h(Button, {
          variant: 'ghost',
          onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
        }, () => [t('admin.columns.last_login'), h(ArrowUpDown, { class: 'ml-2 h-4 w-4' })])
      },
      cell: ({ row }) =>
        h('div', {
          class: 'text-sm text-muted-foreground whitespace-nowrap',
          title: row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt, getDisplayLocale()) : undefined,
        }, row.original.lastLoginAt ? formatRelativeTime(row.original.lastLoginAt, { locale: getDisplayLocale() }) : '—'),
    },
    {
      id: 'actions',
      header: t('admin.columns.actions'),
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
                        h('span', { class: 'sr-only' }, t('common.open_menu')),
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
                          h('span', {}, t('common.edit')),
                        ]),
                      },
                    ),
                    h(
                      DropdownMenuItem,
                      {
                        onClick: () => onLockToggle(user),
                      },
                      {
                        default: () => h('div', { class: 'flex items-center gap-2' }, [
                          user.isLocked
                            ? h(Unlock, { class: 'h-4 w-4' })
                            : h(Lock, { class: 'h-4 w-4' }),
                          h('span', {}, user.isLocked ? t('admin.users.unlock_action') : t('admin.users.lock_action')),
                        ]),
                      },
                    ),
                    h(DropdownMenuSeparator),
                    h(
                      DropdownMenuItem,
                      {
                        onClick: () => onDelete(user.id),
                        class: 'text-destructive focus:text-destructive',
                      },
                      {
                        default: () => h('div', { class: 'flex items-center gap-2' }, [
                          h(Trash2, { class: 'h-4 w-4' }),
                          h('span', {}, t('common.delete')),
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
