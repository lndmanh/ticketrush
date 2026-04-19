import { createDefu } from 'defu'
import type { ContentNavigationItem } from '@nuxt/content'
import type { DefaultConfig } from '~~/types'
import { navPageOverrides } from './useContentHelpers'
import { usePageData } from '@/composables/usePageData'
import { APP_MANIFEST } from '#shared/constants/manifest'

const customDefu = createDefu((obj, key, value) => {
  if (Array.isArray(value) && value.every((x: unknown) => typeof x === 'string')) {
    obj[key] = value
    return true
  }
})

/** Config sections that support per-page overrides via navigation and frontmatter. */
const OVERRIDE_SECTIONS = ['header', 'banner', 'main', 'aside', 'toc', 'footer'] as const

const defaultConfig: DefaultConfig = {
  site: {
    name: APP_MANIFEST.name,
    description: APP_MANIFEST.description,
    ogImage: '/hero.png',
    ogImageComponent: 'OgImageDocs',
    ogImageColor: 'light',
    umami: {
      enable: false,
      src: 'https://cloud.umami.is/script.js',
      dataWebsiteId: '',
    },
  },
  theme: {
    customizable: true,
    color: 'zinc',
    radius: 0.5,
  },
  banner: {
    enable: false,
    showClose: true,
    content: `Welcome to **${APP_MANIFEST.name}**`,
    to: '',
    target: '_blank',
    border: true,
  },
  header: {
    showLoadingIndicator: true,
    title: APP_MANIFEST.short_name,
    showTitle: true,
    logo: {
      light: '/favicon.svg',
      dark: '/favicon.svg',
    },
    showTitleInMobile: false,
    border: false,
    darkModeToggle: true,
    languageSwitcher: {
      enable: true,
      triggerType: 'icon',
      dropdownType: 'select',
    },
    nav: [],
    links: [],
  },
  aside: {
    useLevel: true,
    levelStyle: 'aside',
    headerLevelNavAlign: 'start',
    collapse: false,
    collapseLevel: 1,
    folderStyle: 'default',
  },
  main: {
    breadCrumb: true,
    showTitle: true,
    codeCopyToast: false,
    codeCopyToastText: 'common.copy.success',
    fieldRequiredText: 'required',
    padded: true,
    editLink: {
      enable: false,
      pattern: '',
      text: 'Edit this page',
      icon: 'lucide:square-pen',
      placement: ['docsFooter'],
    },
    issueLink: {
      enable: false,
      pattern: '',
      text: 'Create an issue',
      icon: 'lucide:circle-dot',
      placement: ['docsFooter'],
    },
    backToTop: true,
    pm: ['npm', 'pnpm', 'bun', 'yarn'],
    imageZoom: true,
  },
  footer: {
    border: true,
    credits: '',
    links: [],
  },
  toc: {
    enable: true,
    enableInMobile: false,
    enableInHomepage: false,
    progressBar: true,
    title: 'docs.toc.title',
    links: [],
    iconLinks: [],
    carbonAds: {
      enable: false,
      disableInDev: false,
      disableInMobile: false,
      fallback: false,
      fallbackMessage: 'errors.adblock',
      code: '',
      placement: '',
      format: 'cover',
    },
  },
  search: {
    enable: true,
    inAside: false,
    style: 'input',
    placeholder: 'search.title',
    placeholderDetailed: 'search.document',
  },
}

export function useConfig() {
  const appConfig = useRuntimeConfig().public.docs

  const route = useRoute()

  // Safely attempt to get page data — may not be available in all contexts
  // (e.g., plugins, error pages, non-content pages)
  let page: Ref<Record<string, unknown> | null | undefined> = shallowRef(undefined)
  let navigation: Ref<ContentNavigationItem[] | null | undefined> = shallowRef(undefined)

  try {
    const pageData = usePageData()
    page = pageData.page as typeof page
    navigation = pageData.navigation as typeof navigation
  }
  catch {
    // usePageData() not available in this context — config will use defaults only
  }

  return computed(() => {
    const processedConfig = customDefu(appConfig, defaultConfig)

    const navOverrides = navPageOverrides(route.path, OVERRIDE_SECTIONS, navigation.value)
    const pageData = page.value

    const sectionOverrides = {} as Record<string, unknown>
    for (const key of OVERRIDE_SECTIONS) {
      const navOverride = navOverrides[key] as Record<string, unknown> | undefined
      const pageOverride = pageData?.[key] as Record<string, unknown> | undefined
      sectionOverrides[key] = {
        ...processedConfig[key],
        ...navOverride,
        ...pageOverride,
      }
    }

    return {
      ...processedConfig,
      ...sectionOverrides,
    }
  })
}
