import type { SidebarContext, SidebarGuardUser, SidebarItem } from '~~/types/common'
import { CalendarRange, ContactRound, FlagIcon, Home, LayoutDashboardIcon, ListChecksIcon, MapPin, ReceiptText, Shield, ShieldCheck, Ticket, UsersIcon, UserIcon, Settings } from '@lucide/vue'

export const SIDEBAR_CONTEXTS: SidebarContext[] = [
  {
    id: 'settings',
    match: '/settings',
    variant: 'inset',
    showBack: true,
    sections: [
      {
        title: 'nav.profile',
        items: [
          { title: 'nav.profile', url: '/settings/profile', icon: UserIcon },
          { title: 'nav.security', url: '/settings/security', icon: Shield },
        ],
      },
    ],
  },
  {
    id: 'admin',
    match: '/admin',
    variant: 'inset',
    showBack: true,
    sections: [
      {
        title: 'nav.overview',
        items: [
          { title: 'nav.dashboard', url: '/admin', icon: LayoutDashboardIcon },
          { title: 'nav.events', url: '/admin/events', icon: CalendarRange },
          { title: 'nav.venues', url: '/admin/venues', icon: MapPin },
          { title: 'nav.transactions', url: '/admin/transactions', icon: ReceiptText },
        ],
      },
      {
        title: 'nav.users',
        items: [
          { title: 'nav.users', url: '/admin/users', icon: UsersIcon },
        ],
      },
      {
        title: 'nav.system',
        items: [
          { title: 'nav.tasks', url: '/admin/tasks', icon: ListChecksIcon },
          { title: 'nav.waiting_room', url: '/admin/waiting-room', icon: ShieldCheck },
        ],
      },
    ],
  },
  {
    id: 'main',
    match: '/',
    sections: [
      {
        title: 'nav.discover',
        items: [
          { title: 'nav.home', url: '/', icon: Home },
          { title: 'nav.events', url: '/events', icon: CalendarRange },
          { title: 'nav.my_tickets', url: '/tickets', icon: Ticket },
          { title: 'nav.saved_attendees', url: '/attendees', icon: ContactRound },
          { title: 'nav.settings', url: '/settings', icon: Settings },
        ],
      },
      {
        title: 'nav.admin',
        guard: (user: SidebarGuardUser) => user?.isAdmin === true,
        items: [
          { title: 'nav.admin_dashboard', url: '/admin', icon: LayoutDashboardIcon },
        ],
      },
    ],
  },
]

export function getAllSidebarItems(): SidebarItem[] {
  return SIDEBAR_CONTEXTS.flatMap(ctx =>
    ctx.sections.flatMap(section => section.items),
  )
}
