---
title: Collapsible
icon: lucide:list-collapse
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtCollapsible.vue
    target: _blank
  - value: 0.5.8
---

## Usage

### Simple

::ct-stack
  ::div{class="p-4 md:p-6"}
    ::ct-collapsible
    #title
    Show properties

    #content
    This is a **Simple** style collapsible.
    ::
  ::
  ```mdc
  ::ct-collapsible
  #title
  Show properties

  #content
  This is a **Simple** style collapsible.
  ::
  ```
::

### Card

::ct-stack
  ::div{class="p-4 md:p-6"}
    ::ct-collapsible{variant="card" title="@peduarte starred 3 repositories"}
    @radix-ui/primitives
    ::
  ::
  ```mdc
  ::ct-collapsible{variant="card" title="@peduarte starred 3 repositories"}
  @radix-ui/primitives
  ::
  ```
::

## Props

::ct-field-group
  :ct-field{name="variant" type="'simple' | 'card'" default-value="'simple'"}
  :ct-field{name="title" type="string"}[Collapsible title]
  :ct-field{name="defaultOpen" type="boolean" default-value="false"}
::
