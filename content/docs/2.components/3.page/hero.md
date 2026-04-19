---
title: Hero
icon: lucide:align-center
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtHero.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
    ::ct-hero
    ---
    announcement:
      title: 'Release v1.0.0'
      icon: 'lucide:party-popper'
      to: /getting-started
    actions:
      - name: Get Started
        to: /getting-started
      - name: GitHub
        variant: outline
        to: https://github.com/No-Name-Studio-VN/Homepage
        leftIcon: 'lucide:github'
    ---

    #title
    Effortless and Beautiful :br Docs Template.

    #description
    Beautifully designed Nuxt Content template with shadcn-vue. :br Customizable. Compatible. Open Source.
    ::
  ::
  ```mdc
  ::ct-hero
  ---
  announcement:
    title: 'Release v1.0.0'
    icon: 'lucide:party-popper'
    to: /getting-started
  actions:
    - name: Get Started
      to: /getting-started
    - name: GitHub
      variant: outline
      to: https://github.com/No-Name-Studio-VN/Homepage
      leftIcon: 'lucide:github'
  ---

  #title
  Effortless and Beautiful :br Docs Template.

  #description
  Beautifully designed Nuxt Content template with shadcn-vue. :br Customizable. Compatible. Open Source.
  ::
  ```
::
