---
title: Card Group
icon: lucide:layout-grid
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtCardGroup.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
    ::ct-card-group
      ::ct-card
      ---
      title: Components
      icon: lucide:box
      to: https://nuxt.com/docs/api/components/client-only
      target: _blank
      ---
      Explore Nuxt built-in components for pages, layouts, head, and more.
      ::
      ::ct-card
      ---
      title: Composables
      icon: lucide:arrow-right-left
      to: https://nuxt.com/docs/api/composables/use-app-config
      target: _blank
      ---
      Discover Nuxt composable functions for data-fetching, head management and more.
      ::
      ::ct-card
      ---
      title: Utils
      icon: lucide:scissors
      to: https://nuxt.com/docs/api/utils/dollarfetch
      target: _blank
      ---
      Learn about Nuxt utility functions for navigation, error handling and more.
      ::
      ::ct-card
      ---
      title: Commands
      icon: lucide:square-terminal
      to: https://nuxt.com/docs/api/commands/add
      target: _blank
      ---
      List of Nuxt CLI commands to init, analyze, build, and preview your application.
      ::
    ::
  ::
  ```mdc
  ::ct-card-group
    ::ct-card
    ---
    title: Components
    icon: lucide:box
    to: https://nuxt.com/docs/api/components/client-only
    target: _blank
    ---
    Explore Nuxt built-in components for pages, layouts, head, and more.
    ::

    ::ct-card
    ---
    title: Composables
    icon: lucide:arrow-right-left
    to: https://nuxt.com/docs/api/composables/use-app-config
    target: _blank
    ---
    Discover Nuxt composable functions for data-fetching, head management and more.
    ::

    ::ct-card
    ---
    title: Utils
    icon: lucide:scissors
    to: https://nuxt.com/docs/api/utils/dollarfetch
    target: _blank
    ---
    Learn about Nuxt utility functions for navigation, error handling and more.
    ::

    ::ct-card
    ---
    title: Commands
    icon: lucide:square-terminal
    to: https://nuxt.com/docs/api/commands/add
    target: _blank
    ---
    List of Nuxt CLI commands to init, analyze, build, and preview your application.
    ::
  ::
  ```
::

### Cols

::ct-stack
  ::div{class="p-4"}
    ::ct-card-group{:cols="3"}
      ::ct-card
      ---
      title: Components
      icon: lucide:box
      to: https://nuxt.com/docs/api/components/client-only
      target: _blank
      ---
      Explore Nuxt built-in components for pages, layouts, head, and more.
      ::
      ::ct-card
      ---
      title: Composables
      icon: lucide:arrow-right-left
      to: https://nuxt.com/docs/api/composables/use-app-config
      target: _blank
      ---
      Discover Nuxt composable functions for data-fetching, head management and more.
      ::
      ::ct-card
      ---
      title: Utils
      icon: lucide:scissors
      to: https://nuxt.com/docs/api/utils/dollarfetch
      target: _blank
      ---
      Learn about Nuxt utility functions for navigation, error handling and more.
      ::
    ::
  ::
  ```mdc
  ::ct-card-group{:cols="3"}
    ::ct-card
    ---
    title: Components
    icon: lucide:box
    to: https://nuxt.com/docs/api/components/client-only
    target: _blank
    ---
    Explore Nuxt built-in components for pages, layouts, head, and more.
    ::

    ::ct-card
    ---
    title: Composables
    icon: lucide:arrow-right-left
    to: https://nuxt.com/docs/api/composables/use-app-config
    target: _blank
    ---
    Discover Nuxt composable functions for data-fetching, head management and more.
    ::

    ::ct-card
    ---
    title: Utils
    icon: lucide:scissors
    to: https://nuxt.com/docs/api/utils/dollarfetch
    target: _blank
    ---
    Learn about Nuxt utility functions for navigation, error handling and more.
    ::
  ::
  ```
::

## Props

::ct-field-group
  :ct-field{name="cols" type="1 | 2 | 3 | 4 | 5 | 6" default-value="2"}[Number of columns (only for desktop)]
::
