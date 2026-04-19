---
title: Card
icon: lucide:square
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtCard.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
  ::ct-card
  ---
  icon: lucide:box
  ---

  #title
  Card Title

  #description
  Description

  #content
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._

  #footer
  Footer
  ::
  ::
  ```mdc
  ::ct-card
  ---
  icon: lucide:box
  ---

  #title
  Card Title

  #description
  Description

  #content
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._

  #footer
  Footer
  ::
  ```
::

### Link

::ct-stack
  ::div{class="p-4"}
  ::ct-card
  ---
  to: https://github.com/No-Name-Studio-VN/Homepage
  target: _blank
  # showLinkIcon: false
  ---

  #title
  Link Card

  #content
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._
  ::
  ::
  ```mdc
  ::ct-card
  ---
  to: https://github.com/No-Name-Studio-VN/Homepage
  target: _blank
  # showLinkIcon: false
  ---

  #title
  Link Card

  #content
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._
  ::
  ```
::

### Horizontal

::ct-stack
  ::div{class="p-4"}
  ::ct-card
  ---
  icon: 'lucide:fold-horizontal'
  icon-size: 26
  horizontal: true
  ---

  #title
  Horizontal Card

  #description
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._
  ::
  ::
  ```mdc
  ::ct-card
  ---
  icon: 'lucide:fold-horizontal'
  icon-size: 26
  horizontal: true
  ---

  #title
  Horizontal Card

  #description
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._
  ::
  ```
::

### Image

::ct-stack
  ::div{class="p-4"}
  ::ct-card
  ---
  img: /og-nuxt.png
  ---
  #title
  Image Card

  #content
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._
  ::
  ::
  ```mdc
  ::ct-card
  ---
  img: /og-nuxt.png
  ---
  #title
  Image Card

  #content
  Beautifully designed **Nuxt Content** template with **shadcn-vue**. _Customizable. Compatible. Open Source._
  ::
  ```
::

## Props

::ct-field-group
  :ct-field{name="title" type="string"}[Card title]
  :ct-field{name="description" type="string"}[Card description]
  :ct-field{name="content" type="string"}[Card content]
  :ct-field{name="footer" type="string"}[Card footer]
  :ct-field{name="icon" type="string"}[Card icon]
  :ct-field{name="horizontal" type="boolean" default-value="false"}
  :ct-field{name="to" type="string"}[Link URL]
  :ct-field{name="target" type="Target"}[A `target` attribute value to apply on the link]
  :ct-field{name="iconSize" type="number" default-value="24"}
  :ct-field{name="img" type="string"}[Image URL]
  :ct-field{name="showLinkIcon" type="boolean" default-value="true"}[Whether to show the link indicator :icon{name="lucide:arrow-up-right"}]
::
