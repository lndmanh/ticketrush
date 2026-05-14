import type { SidebarContext, SidebarGuardUser, SidebarItem } from '~~/types/common'
import {
  CalendarRange,
  ContactRound,
  Home,
  LayoutDashboardIcon,
  ListChecksIcon,
  MapPin,
  ReceiptText,
  Shield,
  ShieldCheck,
  Ticket,
  UserRound,
  UserCog2Icon,
  UsersIcon,
} from '@lucide/vue'

export const SIDEBAR_CONTEXTS: SidebarContext[] = [
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
          { title: 'nav.account', url: '/settings/account', icon: UserRound },
          { title: 'nav.saved_attendees', url: '/tickets/saved-attendees', icon: ContactRound },
          { title: 'nav.security', url: '/settings/security', icon: Shield },
        ],
      },
      {
        title: 'nav.admin',
        guard: (user: SidebarGuardUser) => user?.isAdmin === true,
        items: [
          { title: 'nav.admin_dashboard', url: '/admin', icon: LayoutDashboardIcon },
        ],
      },
      {
        title: 'nav.support',
        secondary: true,
        items: [
          { title: 'nav.help_support', url: '/settings/security', icon: UserCog2Icon },
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
