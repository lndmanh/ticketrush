---
title: Read More
icon: lucide:bookmark
badges:
  - value: undocs
    to: https://undocs.pages.dev/guide/components#read-more
    target: _blank
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtReadMore.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
    :ct-read-more{to="/getting-started/writing/markdown"}
    :ct-read-more{title="Nuxt website" to="https://nuxt.com/"}
    :ct-read-more{to="https://nuxt.com/"}
    :ct-read-more{icon="lucide:link" to="https://nuxt.com/"}
  ::

  ```mdc
  :ct-read-more{to="/getting-started/writing/markdown"}
  :ct-read-more{title="Nuxt website" to="https://nuxt.com/"}
  :ct-read-more{to="https://nuxt.com/"}
  :ct-read-more{icon="lucide:link" to="https://nuxt.com/"}
  ```
::

## Props

::ct-field-group
  :ct-field{name="title" type="string"}[Read More title]
  :ct-field{name="icon" type="string"}[Read More icon]
  :ct-field{name="to" type="string"}[Link URL]
  :ct-field{name="target" type="Target"}[A `target` attribute value to apply on the link]
::
