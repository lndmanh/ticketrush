---
title: Button Link
icon: lucide:external-link
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtButtonLink.vue
    target: _blank
  - value: 0.6.5
---

## Usage

::ct-stack
  ::div{class="p-3 flex gap-4"}
  ::ct-button-link{right-icon="lucide:arrow-up-right" to="/getting-started" target="_blank"}
    Get Started
  ::
  ::ct-button-link{left-icon="lucide:github" variant="outline" to="https://github.com/No-Name-Studio-VN/Homepage" target="_blank"}
    GitHub
  ::
  ::ct-button-link{left-icon="lucide:ghost" variant="ghost" href="https://github.com/No-Name-Studio-VN/Homepage" blank}
    Ghost
  ::
  ::
  ```mdc
  ::ct-button-link{right-icon="lucide:arrow-up-right" to="/getting-started" target="_blank"}
    Get Started
  ::
  ::ct-button-link{left-icon="lucide:github" variant="outline" to="https://github.com/No-Name-Studio-VN/Homepage" target="_blank"}
    GitHub
  ::
  ::ct-button-link{left-icon="lucide:ghost" variant="ghost" href="https://github.com/No-Name-Studio-VN/Homepage" blank}
    Ghost
  ::
  ```
::

## Props

::ct-field-group
  :ct-field{name="variant" type="'default' | 'secondary' | 'link' | 'destructive' | 'outline' | 'ghost'" default-value="'default'"}
  :ct-field{name="size" type="'default' | 'icon' | 'sm' | 'xs' | 'lg'" default-value="'default'"}
  :ct-field{name="leftIcon" type="string"}[Icon on the left]
  :ct-field{name="rightIcon" type="string"}[Icon on the right]
  :ct-field{name="to" type="string"}[Link URL]
  :ct-field{name="href" type="string"}[Alias to `to`]
  :ct-field{name="target" type="Target"}[A `target` attribute value to apply on the link]
  :ct-field{name="blank" type="boolean"}[Alias to `target='_blank'`]
::
