import type { User } from '~~/shared/db'

export type SidebarItem = {
  title: string
  url?: string
  icon?: Component
  items?: SidebarItem[]
}

export type SidebarGuardUser = User | null | undefined

export interface SidebarSection {
  title: string
  items: SidebarItem[]
  /** Push to bottom of sidebar (e.g. "Support") */
  secondary?: boolean
  /** Per-section access guard */
  guard?: (user: SidebarGuardUser) => boolean
}

export interface SidebarContext {
  /** Unique key used as transition key */
  id: string
  /** Route prefix that activates this context (e.g. '/settings') */
  match: string
  /** Grouped nav sections to render */
  sections: SidebarSection[]
  /** Sidebar variant override (defaults to 'inset') */
  variant?: 'sidebar' | 'inset' | 'floating'
  /** Show "Back" button in header */
  showBack?: boolean
  /** Access guard — return false to skip this context */
  guard?: (user: SidebarGuardUser) => boolean
}

export type BreadcrumbItemType = {
  title: string
  href: string
}
