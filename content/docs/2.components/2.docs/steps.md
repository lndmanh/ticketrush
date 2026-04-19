---
title: Steps
icon: lucide:arrow-down-0-1
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtSteps.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4 md:p-6"}
    ::ct-steps
      ### Get Starter Template

      ::ct-code-group
        ```bash [npm]
        npx nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit
        ```
        ```bash [pnpm]
        pnpm dlx nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit
        ```
        ```bash [bun]
        bunx nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit
        ```
      ::

      ::ct-alert
      Alternatively, you can clone or download the template from the [GitHub repo](https://github.com/No-Name-Studio-VN/Nuxt-Starter-Kit).
      ::

      ### Install Dependencies

      ::ct-code-group
        ```bash [npm]
        npm install
        ```
        ```bash [pnpm]
        pnpm install
        ```
        ```bash [bun]
        bun install
        ```
      ::

      ### Development Server

      ::ct-code-group
        ```bash [npm]
        npm run dev -- -o
        ```
        ```bash [pnpm]
        pnpm dev -o
        ```
        ```bash [bun]
        bun run dev -o
        ```
      ::
    ::
  ::
  ```mdc height=400
  ::ct-steps
    ### Get Starter Template

    ::ct-code-group
      ```bash [npm]
      npx nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit
      ```
      ```bash [pnpm]
      pnpm dlx nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit
      ```
      ```bash [bun]
      bunx nuxi@latest init <project-name> -t github:No-Name-Studio-VN/Nuxt-Starter-Kit
      ```
    ::

    ::ct-alert
    Alternatively, you can clone or download the template from the [GitHub repo](https://github.com/No-Name-Studio-VN/Nuxt-Starter-Kit).
    ::

    ### Install Dependencies

    ::ct-code-group
      ```bash [npm]
      npm install
      ```
      ```bash [pnpm]
      pnpm install
      ```
      ```bash [bun]
      bun install
      ```
    ::

    ### Development Server

    ::ct-code-group
      ```bash [npm]
      npm run dev -- -o
      ```
      ```bash [pnpm]
      pnpm dev -o
      ```
      ```bash [bun]
      bun run dev -o
      ```
    ::
  ::
  ```
::

### Multi-level headings
:ct-badge[0.4.6]{variant="outline"}

::ct-stack
  ::div{class="p-4 md:p-6"}
    ::ct-steps{:level="5"}
      ##### Specify the level of headings to use

      ```mdc
      ::ct-steps{:level="5"}
      ```

      ##### Available Headings

      `h1` through `h6`. Defaults to `h3`.
    ::
  ::
  ```mdc
  ::ct-steps{:level="5"}
    ##### Multi-level headings

    ```mdc
    ::ct-steps{:level="5"}
    ```

    ##### Available Headings

    `h1` through `h6`. Defaults to `h3`.
  ::
  ```
::

## Props

:ct-field{name="level" type="number"}[Specify the level of headings to use]
