---
title: Stack
icon: lucide:rows-3
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtStack.vue
    target: _blank
  - value: 0.6.2
---

## Usage

::ct-stack
  ::div{class="p-4 md:p-8"}
    ::ct-stack
      ::div{class="p-6 text-3xl font-bold"}
      ✨ Nuxt Starter Kit
      ::

      ```mdc
      ---
      title: Installation
      description: How to install Nuxt Starter Kit in your app.
      icon: lucide:play
      ---

      ## Using the starter template
      ```

      :ct-pm-x{command="nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit"}

      :ct-read-more{title="Installation" to="/getting-started/installation"}

      ::ct-card
      ---
      title: Components
      icon: lucide:box
      ---
      See MDC components provided by **Nuxt Starter Kit**.
      ::
    ::
  ::

  ```mdc
  ::ct-stack
    ::div{class="p-6 text-3xl font-bold"}
    ✨ Nuxt Starter Kit
    ::

    ```mdc
    ---
    title: Installation
    description: How to install Nuxt Starter Kit in your app.
    icon: lucide:play
    ---

    ## Using the starter template
    ```

    :ct-pm-x{command="nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit"}

    :ct-read-more{title="Installation" to="/getting-started/installation"}

    ::ct-card
    ---
    title: Components
    icon: lucide:box
    ---
    See MDC components provided by **Nuxt Starter Kit**.
    ::
  ::
  ```
::

Stackable components:

- `div`
- Code Blocks
- `alert`
- `callout`
- `read-more`
- `code-group`
- `code-tree`
- `card`
- `tabs`
- `pm-install`
- `pm-run`
- `pm-x`
