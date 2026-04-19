---
title: Code Group
icon: lucide:code-xml
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtCodeGroup.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
    ::ct-code-group
      ```vue [app.vue]
      <template>
        <div>
          <NuxtLayout>
            <NuxtPage />
          </NuxtLayout>
        </div>
      </template>
      ```

      ```vue [pages/index.vue]
      <template>
        <div>
          <h1>Welcome to the homepage</h1>
          <AppAlert>
            This is an auto-imported component
          </AppAlert>
        </div>
      </template>
      ```
    ::
  ::

  ```mdc
  ::ct-code-group
    ```vue [app.vue]
    <template>
      <div>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>
    </template>
    ```

    ```vue [pages/index.vue]
    <template>
      <div>
        <h1>Welcome to the homepage</h1>
        <AppAlert>
          This is an auto-imported component
        </AppAlert>
      </div>
    </template>
    ```
  ::
  ```
::

::ct-alert{to="/components/docs/tabs"}
`::ct-code-group`{lang="mdc"} is a wrapper around `::ct-tabs{variant="card"}`{lang="mdc"}.
::

## Props

:ct-field{name="sync" type="string"}[Sync scope for `::ct-tabs`]
