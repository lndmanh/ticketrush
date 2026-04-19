import type { SidebarContext, SidebarSection } from '~~/types/common'
import { SIDEBAR_CONTEXTS } from '@/constants/sidebar'

const DEFAULT_CONTEXT = SIDEBAR_CONTEXTS[SIDEBAR_CONTEXTS.length - 1]!

export function useSidebarContext() {
  const route = useRoute()
  const { user } = useUserSession()

  const activeContext = computed<SidebarContext>(() => {
    const path = route.path
    return SIDEBAR_CONTEXTS.find((ctx) => {
      if (ctx.match !== '/' && !path.startsWith(ctx.match)) return false
      if (ctx.match === '/' && path !== '/' && SIDEBAR_CONTEXTS.some(c => c.match !== '/' && path.startsWith(c.match))) return false
      if (ctx.guard && !ctx.guard(user.value)) return false
      return true
    }) ?? DEFAULT_CONTEXT
  })

  const visibleSections = computed<SidebarSection[]>(() => {
    return activeContext.value.sections.filter(
      section => !section.guard || section.guard(user.value),
    )
  })

  const primarySections = computed(() =>
    visibleSections.value.filter(s => !s.secondary),
  )

  const secondarySections = computed(() =>
    visibleSections.value.filter(s => s.secondary),
  )

  const sidebarVariant = computed(() => activeContext.value.variant ?? 'inset')
  const showBack = computed(() => activeContext.value.showBack ?? false)
  const isContextView = computed(() => activeContext.value.id !== 'main')

  return {
    activeContext,
    visibleSections,
    primarySections,
    secondarySections,
    sidebarVariant,
    showBack,
    isContextView,
  }
}
