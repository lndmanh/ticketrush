import { APP_MANIFEST } from '#shared/constants/manifest'

export function useConfig() {
  const config = {
    site: {
      name: APP_MANIFEST.name,
      description: APP_MANIFEST.description,
      ogImage: '/hero.png',
      ogImageComponent: 'OgImageDocs',
      ogImageColor: 'light',
      umami: {
        enable: true,
        src: 'https://cloud.umami.is/script.js',
        dataWebsiteId: '59f6944e-8a7c-463d-a01c-f5a255b3b26b',
      },
    },
    banner: {
      enable: false,
      showClose: true,
      content: `Welcome to **${APP_MANIFEST.name}**`,
      to: 'https://github.com/No-Name-Studio-VN/Homepage',
      target: '_blank',
      border: true,
    },
    header: {
      title: APP_MANIFEST.name,
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
      nav: [
        {
          title: 'nav.home',
          to: '/',
          showLinkIcon: false,
        },
        {
          title: 'nav.events',
          to: '/events',
          showLinkIcon: false,
        },
      ],
      links: [
        {
          icon: 'lucide:github',
          to: 'https://github.com/No-Name-Studio-VN/Homepage',
          target: '_blank',
        },
      ],
    },
    footer: {
      border: true,
      credits: 'FOOTER_CREDIT',
      links: [
        {
          icon: 'lucide:twitter',
          to: 'https://x.com/nn_myt',
          target: '_blank',
        },
        {
          icon: 'lucide:github',
          to: 'https://github.com/No-Name-Studio-VN/Homepage',
          target: '_blank',
        },
        {
          icon: 'lucide:mail',
          to: 'mailto:contact@nnsvn.me',
          target: '_blank',
        },
      ],
    },
    search: {
      enable: true,
      inAside: false,
      style: 'input',
      placeholder: 'search.title',
      placeholderDetailed: 'search.document',
    },
  }

  const { user } = useUserSession()
  if (user.value?.isAdmin) {
    config.header.nav.push({
      title: 'nav.admin',
      to: '/admin',
      showLinkIcon: false,
    })
  }

  return config
}
