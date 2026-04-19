import type { ContentNavigationItem } from '@nuxt/content'

export interface BreadcrumbItemType {
  title: string
  href: string
}

export function useBreadcrumb(url: string, nav: ContentNavigationItem[] = []): BreadcrumbItemType[] {
  const breadcrumbItems: BreadcrumbItemType[] = []
  // Remove empty segments
  const segments = url.split('/').filter(segment => segment !== '')

  // Construct breadcrumb for each segment
  let href = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!.replace('.html', '')
    href += `/${segment}`
    // Nuxt Content v3: ._path is now .path
    const page = nav.find(x => x.path === href)
    nav = page?.children || []
    breadcrumbItems.push({ title: page?.title ?? segment, href })
  }
  return breadcrumbItems
}
