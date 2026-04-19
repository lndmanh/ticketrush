---
title: Icon
breadcrumb: true
collapse: false
editLink: true
fullpage: false
icon: lucide:star
navTruncate: false
prevNext: false
readingTime: 3
sitemap:
  loc: /components/docs/icon
---

::ct-alert
---
target: _blank
to: https://lucide.dev/guide/packages/@lucide/vue
---
The icon component uses **Lucide Vue** under the hood for string icon names. Check out the full icon list from Lucide.
::

## Overview

`ct-icon` is a smart icon component that automatically detects and renders the correct element based on the `name` prop:

| Input type            | Example                   | Renders                         |
| --------------------- | ------------------------- | ------------------------------- |
| Empty / undefined     | —                         | Default fallback (`CircleHelp`) |
| Vue Component         | `:name="MyIcon"`          | `<component :is>`               |
| Emoji                 | `name="🚀"`               | `<span>` with font-size         |
| Image URL or path     | `name="/logo.svg"`        | `<NuxtImg>` with lazy loading   |
| File extension / name | `name="js"`, `name="vue"` | Matched icon via `useFileIcon`  |
| Lucide icon string    | `name="lucide:box"`       | Resolved Lucide component       |
| Unresolved string     | `name="unknown"`          | Default fallback (`CircleHelp`) |

## Usage

### Lucide Icons

Pass a Lucide icon name using the `lucide:` prefix or just the kebab-case name directly.

::ct-stack
  :::div{.p-4}
  **Lucide**

    ::::div{.space-x-2}
    :ct-icon{name="lucide:box"}

    :ct-icon{name="lucide:star"}

    :ct-icon{name="lucide:heart"}

    :ct-icon{name="arrow-right"}
    ::::
  :::

```mdc
:ct-icon{name="lucide:box"}
:ct-icon{name="lucide:star"}
:ct-icon{name="lucide:heart"}
:ct-icon{name="arrow-right"}
```
::

### File-Type Icons

Pass a file extension or known filename to automatically resolve a technology icon (e.g. TypeScript, Vue, Python).

::ct-stack
  :::div{.p-4}
  **File Types**

    ::::div{.space-x-2}
    :ct-icon{name="js"}

    :ct-icon{name="vue"}

    :ct-icon{name="ts"}

    :ct-icon{name="py"}

    :ct-icon{name="css"}
    ::::
  :::

```mdc
:ct-icon{name="js"}
:ct-icon{name="vue"}
:ct-icon{name="ts"}
:ct-icon{name="py"}
:ct-icon{name="css"}
```
::

### Emojis

Pass an emoji string directly. Use the `:size` prop to control the font size.

::ct-stack
  :::div{.p-4}
  **Emojis**

    ::::div{.space-x-2}
    :ct-icon{name="😍"}

    :ct-icon{name="🚀"}

      :::::ct-icon{:size='30' name="🎉"}
      :::::
    ::::
  :::

```mdc
:ct-icon{name="😍"}
:ct-icon{name="🚀"}
:ct-icon{name="🎉" :size="30"}
```
::

### Images (URL or Path)

Pass an image URL or local path. The component renders a `<NuxtImg>` with lazy loading and explicit `width`/`height` for better performance.

::ct-stack
  :::div{.p-4}
  **URL**

    ::::div{.space-x-2}
    :ct-icon{name="/favicon.svg"}

      :::::ct-icon{:size='40' name="https://vueuse.org/favicon.svg"}
      :::::
    ::::
  :::

```mdc
:ct-icon{name="/favicon.svg"}
:ct-icon{name="https://vueuse.org/favicon.svg" :size="40"}
```
::

### Default Fallback

When no `name` is provided or the name cannot be resolved, a default `CircleHelp` icon is rendered.

::ct-stack
  :::div{.p-4}
  **Fallback**

    ::::div{.space-x-2}
    :ct-icon

    :ct-icon{name="unknown-icon-name"}
    ::::
  :::

```mdc
:ct-icon{}
:ct-icon{name="unknown-icon-name"}
```
::

## Props

::ct-field-group
  :::ct-field{name="name" type="string | Component"}
  Icon name, emoji, image URL, file extension, or a Vue component. Falls back to `CircleHelp` when empty or unresolved.
  :::

  :::ct-field{default-value="16" name="size" type="number"}
  Icon size in pixels. Controls both `width`/`height` for images and `size` prop for Lucide icons.
  :::

  :::ct-field{name="class" type="string"}
  Additional CSS classes to apply to the rendered element.
  :::
::

## Resolution Order

The component resolves the `name` prop in the following priority:

1. **Empty** → renders the default `CircleHelp` icon.
2. **Vue Component** → renders the component directly via `<component :is>`.
3. **Emoji** → renders inside a `<span>` with matching font size.
4. **Image** → renders via `<NuxtImg>` with `lazy` loading, explicit `width` and `height`.
5. **File-type match** → resolves via `useFileIcon` (supports extensions like `js`, `vue`, `ts`, `py`, and known filenames like `package.json`).
6. **Lucide icon** → converts the name to PascalCase and looks up the Lucide icon registry.
7. **Unresolved** → falls back to the default `CircleHelp` icon.
