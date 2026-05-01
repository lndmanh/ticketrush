import { createDefu } from 'defu'
import type { DefaultConfig } from '~~/types'
import { APP_MANIFEST } from '#shared/constants/manifest'

const customDefu = createDefu((obj, key, value) => {
  if (Array.isArray(value) && value.every((x: unknown) => typeof x === 'string')) {
    obj[key] = value
    return true
  }
})

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

  return computed(() => {
    const processedConfig = customDefu(appConfig, defaultConfig)
    const sectionOverrides = {} as Record<string, unknown>

    return {
      ...processedConfig,
      ...sectionOverrides,
    }
  })
}
