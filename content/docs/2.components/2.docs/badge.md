---
title: Badge
icon: lucide:badge
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtBadge.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-3"}
  ::ct-badge
    Default
  ::
  ::ct-badge{size="sm"}
    Small
  ::
  ::
  ```mdc
  ::ct-badge
    Default
  ::
  ::ct-badge{size="sm"}
    Small
  ::
  ```
::

### Variants

::ct-tabs{variant="line"}
  ::ct-stack{label="outline"}
    ::div{class="p-3"}
    :ct-badge[Outline]{variant="outline"}
    ::
    ```mdc
    :ct-badge[Outline]{variant="outline"}
    ```
  ::

  ::ct-stack{label="secondary"}
    ::div{class="p-3"}
    :ct-badge[Secondary]{variant="secondary"}
    ::
    ```mdc
    :ct-badge[Secondary]{variant="secondary"}
    ```
  ::

  ::ct-stack{label="info"}
    ::div{class="p-3"}
    :ct-badge[Info]{type="info"}
    ::
    ```mdc
    :ct-badge[Info]{type="info"}
    ```
  ::

  ::ct-stack{label="warning"}
    ::div{class="p-3"}
    :ct-badge[Warning]{type="warning"}
    ::
    ```mdc
    :ct-badge[Warning]{type="warning"}
    ```
  ::

  ::ct-stack{label="success"}
    ::div{class="p-3"}
    :ct-badge[Success]{type="success"}
    ::
    ```mdc
    :ct-badge[Success]{type="success"}
    ```
  ::

  ::ct-stack{label="lime"}
    ::div{class="p-3"}
    :ct-badge[lime]{type="lime"}
    ::
    ```mdc
    :ct-badge[lime]{type="lime"}
    ```
  ::

  ::ct-stack{label="danger"}
    ::div{class="p-3"}
    :ct-badge[Danger]{type="danger"}
    ::
    ```mdc
    :ct-badge[Danger]{type="danger"}
    ```
  ::
::

### Link

::ct-stack
  ::div{class="p-3"}
  ::ct-badge{variant="outline" type="info" to="https://github.com/No-Name-Studio-VN/Homepage" target="_blank"}
  Link
  ::
  ::
  ```mdc
  ::ct-badge{variant="outline" type="info" to="https://github.com/No-Name-Studio-VN/Homepage" target="_blank"}
  Link
  ::
  ```
::

## Props

::ct-field-group
  :ct-field{name="type" type="'default' | 'info' | 'warning' | 'success' | 'danger' | 'lime'" default-value="'default'"}
  :ct-field{name="variant" type="'default' | 'secondary' | 'destructive' | 'outline'" default-value="'default'"}
  :ct-field{name="size" type="'md' | 'sm'" default-value="'md'"}
  :ct-field{name="to" type="string"}[Link URL]
  :ct-field{name="target" type="Target"}[A `target` attribute value to apply on the link]
::
