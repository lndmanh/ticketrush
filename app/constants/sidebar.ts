import type { SidebarContext, SidebarGuardUser, SidebarItem } from '~~/types/common'
import {
  FlagIcon,
  Home,
  LayoutDashboardIcon,
  Shield,
  UserCog2Icon,
  UserIcon,
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
          { title: 'Profile', url: '/settings/profile', icon: UserIcon },
          { title: 'Security', url: '/settings/security', icon: Shield },
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
