---
title: File Tree
badges:
  - value: 0.8.10
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtFileTree.vue
    target: _blank
breadcrumb: true
collapse: false
editLink: true
fullpage: false
icon: lucide:folder-tree
navTruncate: false
prevNext: false
readingTime: 2
sitemap:
  loc: /components/docs/file-tree
---

## Usage

::ct-stack
  :::div{.p-4}
    ::::ct-file-tree
    ---
    tree:
      - app:
          - components:
              - Header.vue
              - Footer.vue
          - composables:
              - useErrorHandler.ts
          - ^app.vue^
      - docs:
          - index.md
    ---
    ::::
  :::

```mdc
::ct-file-tree
---
tree:
  - app:
    - components:
      - Header.vue
      - Footer.vue
    - composables:
      - useErrorHandler.ts
    - ^app.vue^ # This is highlighted
  - docs:
    - index.md
---
::
```
::

### Customizations

::ct-stack
  :::div{.p-4}
    ::::ct-file-tree
    ---
    autoSlash: false
    showArrow: true
    tree:
      - components:
          - layout:
              - Header.vue
              - Footer.vue
              - ...
          - content:
              - Accordion.vue
              - Alert.vue
              - ProseCode.vue
              - ...
    icon: lucide:folder-tree
    title: File Tree Title
    ---
    ::::
  :::

```mdc
::ct-file-tree
---
title: File Tree Title
icon: lucide:folder-tree
autoSlash: false   # Whether to add a slash after every folder automatically
showArrow: true    # Whether to show the collapse arrow
tree:
  - components:
    - layout:
      - Header.vue
      - Footer.vue
      - ...
    - content:
      - Accordion.vue
      - Alert.vue
      - ProseCode.vue
      - ...
---
::
```
::

### Disable Icons

::ct-stack
  :::div{.p-4}
    ::::ct-file-tree
    ---
    showIcon: false
    tree:
      - app:
          - components:
              - Header.vue
              - Footer.vue
          - composables:
              - useErrorHandler.ts
          - ^app.vue^
      - docs:
          - index.md
    ---
    ::::
  :::

```mdc
::ct-file-tree
---
showIcon: false
tree:
  - app:
    - components:
      - Header.vue
      - Footer.vue
    - composables:
      - useErrorHandler.ts
    - ^app.vue^
  - docs:
    - index.md
---
::
```
::

### Diff

::ct-stack
  :::div{.p-4}
    ::::ct-file-tree
    ---
    showIcon: false
    tree:
      - app:
          - + components:
              - Header.vue
              - "- Footer.vue"
          - composables:
              - useErrorHandler.ts
          - ^app.vue^
      - docs:
          - index.md
    ---
    ::::
  :::

```mdc
::ct-file-tree
---
showIcon: false
tree:
  - app:
    - + components:
      - Header.vue
      - "- Footer.vue"
    - composables:
      - useErrorHandler.ts
    - ^app.vue^
  - docs:
    - index.md
---
::
```
::

## Props

::ct-field-group
  :::ct-field{name="tree"}
  The file tree
  :::

  :::ct-field{name="title" type="string"}
  File tree title
  :::

  :::ct-field{name="icon" type="string"}
  File tree title icon
  :::

  :::ct-field{default-value="true" name="autoSlash" type="boolean"}
  Whether to add a slash after every folder automatically
  :::

  :::ct-field{default-value="false" name="showArrow" type="boolean"}
  Whether to show the collapse arrow
  :::

  :::ct-field{default-value="true" name="showIcon" type="boolean"}
  Whether to show file & folder icons
  :::
::
