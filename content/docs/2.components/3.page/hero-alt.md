---
title: HeroAlt
icon: lucide:align-left
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtHeroAlt.vue
    target: _blank
  - value: 0.4.0
toc: false
---

## Usage

::ct-stack
  ::div{class="p-4"}
    ::ct-hero-alt
    ---
    announcement:
      title: 'Introducing Charts'
      icon: 'lucide:pie-chart'
      to: /getting-started
    actions:
      - name: Get Started
        to: /getting-started
      - name: GitHub
        variant: ghost
        to: https://github.com/No-Name-Studio-VN/Homepage
    ---

    #title
    Build your component library

    #description
    Beautifully designed components that you can copy and paste into your apps.
    ::
  ::
```mdc
::ct-hero-alt
---
announcement:
  title: 'Introducing Charts'
  icon: 'lucide:pie-chart'
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
Build your component library

#description
Beautifully designed components that you can copy and paste into your apps.
::
```
::

### Right

::ct-stack
  ::div{class="p-4"}
    ::ct-hero-alt
    ---
    announcement:
      title: 'Introducing Charts'
      icon: 'lucide:pie-chart'
      to: /getting-started
    actions:
      - name: Get Started
        to: /getting-started
      - name: GitHub
        variant: ghost
        to: https://github.com/No-Name-Studio-VN/Homepage
    mobileRight: 'top' # 'top' | 'bottom'
    ---

    #title
    Build your component library

    #description
    Beautifully designed components that you can copy and paste into your apps.

    #right
    ![logo](/favicon.svg)
    ::
  ::
```mdc
::ct-hero-alt
---
announcement:
  title: 'Introducing Charts'
  icon: 'lucide:pie-chart'
  to: /getting-started
actions:
  - name: Get Started
    to: /getting-started
  - name: GitHub
    variant: ghost
    to: https://github.com/No-Name-Studio-VN/Homepage
mobileRight: 'top' # 'top' | 'bottom'
---

#title
Build your component library

#description
Beautifully designed components that you can copy and paste into your apps.

#right
![logo](/favicon.svg)
::
```
::
