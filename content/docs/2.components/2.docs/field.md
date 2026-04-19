---
title: Field
icon: lucide:settings-2
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtField.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
    ::ct-field{name="Field" type="string" defaultValue="'default'" required}
    The _description_ can be set as prop or in the default slot with full **markdown** support.
    ::
  ::
  ```mdc
  ::ct-field{name="Field" type="string" defaultValue="'default'" required}
  The _description_ can be set as prop or in the default slot with full **markdown** support.
  ::
  ```
::

The text `required` is configurable in [`main.fieldRequiredText`](/api/configuration/shadcn-docs#main).

## Props

::ct-field-group
  :ct-field{name="name" type="string"}[Field name]
  :ct-field{name="type" type="string"}[Field type]
  :ct-field{name="description" type="string"}[Field description]
  :ct-field{name="defaultValue" type="string"}[Field default value]
  :ct-field{name="required" type="boolean"}[Whether the field is required]
::
