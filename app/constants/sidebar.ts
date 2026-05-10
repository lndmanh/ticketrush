import type { SidebarContext, SidebarGuardUser, SidebarItem } from '~~/types/common'
import {
  CalendarRange,
  ContactRound,
  FlagIcon,
  Home,
  LayoutDashboardIcon,
  ListChecksIcon,
  MapPin,
  Settings,
  Shield,
  ShieldCheck,
  Ticket,
  UserCog2Icon,
  UsersIcon,
} from '@lucide/vue'

export const SIDEBAR_CONTEXTS: SidebarContext[] = [
  {
    id: 'settings',
    match: '/settings',
    variant: 'inset',
    showBack: true,
    sections: [
      {
        title: 'Account',
        items: [
          { title: 'Security', url: '/settings/security', icon: Shield },
          { title: 'Saved Attendees', url: '/settings/saved-attendees', icon: ContactRound },
        ],
      },
    ],
  },
  {
    id: 'admin',
    match: '/admin',
    variant: 'inset',
    showBack: true,
    guard: (user: SidebarGuardUser) => user?.isAdmin === true,
    sections: [
      {
        title: 'Overview',
        items: [
          { title: 'Dashboard', url: '/admin', icon: LayoutDashboardIcon },
          { title: 'Events', url: '/admin/events', icon: CalendarRange },
          { title: 'Venues', url: '/admin/venues', icon: MapPin },
        ],
      },
      {
        title: 'Users',
        items: [
          { title: 'Users', url: '/admin/users', icon: UsersIcon },
        ],
      },
      {
        title: 'System',
        items: [
          { title: 'Tasks', url: '/admin/tasks', icon: ListChecksIcon },
          { title: 'Waiting Room', url: '/admin/waiting-room', icon: ShieldCheck },
          { title: 'Feature Flags', url: '/admin/feature-flags', icon: FlagIcon },
        ],
      },
    ],
  },
  {
    id: 'main',
    match: '/',
    sections: [
      {
        title: 'Discover',
        items: [
          { title: 'Home', url: '/', icon: Home },
          { title: 'Events', url: '/events', icon: CalendarRange },
          { title: 'My Tickets', url: '/tickets', icon: Ticket },
          { title: 'Saved Attendees', url: '/tickets/saved-attendees', icon: ContactRound },
          { title: 'Settings', url: '/settings/security', icon: Settings },
        ],
      },
      {
        title: 'Admin',
        guard: (user: SidebarGuardUser) => user?.isAdmin === true,
        items: [
          { title: 'Admin Dashboard', url: '/admin', icon: LayoutDashboardIcon },
        ],
      },
      {
        title: 'Support',
        secondary: true,
        items: [
          { title: 'Help & Support', url: '/support', icon: UserCog2Icon },
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
