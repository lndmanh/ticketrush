import type { ContentNavigationItem, ContentCollectionItem } from '@nuxt/content'

/**
 * Shared data store for page content, navigation, and surroundings.
 *
 * This composable does NOT fetch data — it only provides shared reactive state.
 * Data is populated by the page component ([...slug].vue) via useAsyncData,
 * and all other consumers (layout, sidebar, breadcrumb, toc, etc.) read from here.
 */
export function usePageData() {
  const page = useState<ContentCollectionItem | null>('docs-page', () => null)
  const navigation = useState<ContentNavigationItem[] | null>('docs-navigation', () => null)
  const surroundings = useState<Record<string, unknown>[] | null>('docs-surroundings', () => null)

  return { page, navigation, surroundings }
}
