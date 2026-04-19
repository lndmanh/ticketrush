---
title: Playground
icon: lucide:app-window
navBadges:
  - value: New
    type: lime
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtPlayground.vue
    target: _blank
---

## Usage

### Stackblitz

::ct-stack
  ::div{class="p-4"}
    ::ct-playground
    ---
    provider: stackblitz
    repo: nuxt/starter
    branch: v3
    file: app.vue
    ---
    ::
  ::
  ```mdc
  ::ct-playground
  ---
  provider: stackblitz
  repo: nuxt/starter
  branch: v3
  file: app.vue
  ---
  ::
  ```
::

### CodeSandbox

::ct-stack
  ::div{class="p-4"}
    ::ct-playground
    ---
    provider: codesandbox
    repo: nuxt/starter
    branch: v3
    file: app.vue
    ---
    ::
  ::
  ```mdc
  ::ct-playground
  ---
  provider: codesandbox
  repo: nuxt/starter
  branch: v3
  file: app.vue
  ---
  ::
  ```
::

## Props

::ct-field-group
  :ct-field{name="provider" type="'stackblitz' | 'codesandbox'"}[Provider to use]
  :ct-field{name="repo" type="string"}[GitHub repository name (e.g. `nuxt/starter`)]
  :ct-field{name="branch" type="string" default-value="main"}[Branch name]
  ::ct-field{name="id" type="string"}
  Repository ID (e.g. for Stackblitz `github-t1vjvm`, for Codesandbox `8hq5qn`)

    ::ct-alert{icon="lucide:info" type="info"}
    You need to provide either `repo` or `id` prop, but not both.
    ::
  ::
  :ct-field{name="dir" type="string" default-value="''"}[Directory to open in the playground (optional)]
  :ct-field{name="file" type="string"}[File path to open]
  :ct-field{name="title" type="string" default-value="Playground"}[Title of the iframe]
::
