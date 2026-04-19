---
icon: lucide:triangle-alert
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtAlert.vue
    target: _blank
---

## Usage

::ct-stack
  ::div{class="p-4"}
  ::ct-alert{icon="lucide:info"}
    A **default** alert with `code` and a [link](/).
  ::

  ::ct-alert{type="secondary" icon="lucide:info"}
    A **secondary** alert with `code` and a [link](/).
  ::
  ::
  ```mdc
  ::ct-alert{icon="lucide:info"}
    A **default** alert with `code` and a [link](/).
  ::

  ::ct-alert{type="secondary" icon="lucide:info"}
    A **secondary** alert with `code` and a [link](/).
  ::
  ```
::

### Link

::ct-stack
  ::div{class="p-4"}
  ::ct-alert{to="https://github.com/No-Name-Studio-VN/Homepage" target="_blank" icon="lucide:link"}
    A **link** alert.
  ::
  ::
  ```mdc
  ::ct-alert{to="https://github.com/No-Name-Studio-VN/Homepage" target="_blank" icon="lucide:link"}
    A **link** alert.
  ::
  ```
::

### Variants

::ct-tabs{variant="line"}
  ::ct-stack{label="info" icon="lucide:info"}
    ::div{class="p-3"}
    ::ct-alert{type="info" icon="lucide:info"}
      An **info** alert with `code` and a [link](/).
    ::
    ::
    ```mdc
    ::ct-alert{type="info" icon="lucide:info"}
      An **info** alert with `code` and a [link](/).
    ::
    ```
  ::

  ::ct-stack{label="note" icon="lucide:pencil"}
    ::div{class="p-3"}
    ::ct-alert{type="note" icon="lucide:pencil"}
      A **note** alert with `code` and a [link](/).
    ::
    ::
    ```mdc
    ::ct-alert{type="note" icon="lucide:pencil"}
      A **note** alert with `code` and a [link](/).
    ::
    ```
  ::

  ::ct-stack{label="success" icon="lucide:lightbulb"}
    ::div{class="p-3"}
    ::ct-alert{type="success" icon="lucide:lightbulb"}
      A **success** alert with `code` and a [link](/).
    ::
    ::
    ```mdc
    ::ct-alert{type="success" icon="lucide:lightbulb"}
      A **success** alert with `code` and a [link](/).
    ::
    ```
  ::

  ::ct-stack{label="example" icon="lucide:test-tube"}
    ::div{class="p-3"}
    ::ct-alert{type="example" icon="lucide:test-tube"}
      An **example** alert with `code` and a [link](/).
    ::
    ::
    ```mdc
    ::ct-alert{type="example" icon="lucide:test-tube"}
      An **example** alert with `code` and a [link](/).
    ::
    ```
  ::

  ::ct-stack{label="warning" icon="lucide:triangle-alert"}
    ::div{class="p-3"}
    ::ct-alert{type="warning" icon="lucide:triangle-alert"}
      A **warning** alert with `code` and a [link](/).
    ::
    ::
    ```mdc
    ::ct-alert{type="warning" icon="lucide:triangle-alert"}
      A **warning** alert with `code` and a [link](/).
    ::
    ```
  ::

  ::ct-stack{label="danger" icon="lucide:circle-x"}
    ::div{class="p-3"}
    ::ct-alert{type="danger" icon="lucide:circle-x"}
      A **danger** alert with `code` and a [link](/).
    ::
    ::
    ```mdc
    ::ct-alert{type="danger" icon="lucide:circle-x"}
      A **danger** alert with `code` and a [link](/).
    ::
    ```
  ::
::

### Title

::ct-stack
  ::div{class="p-4"}
  ::ct-alert{title="Title" icon="lucide:layout-list"}
    An alert with a title.
  ::
  ::
  ```mdc
  ::ct-alert{title="Title" icon="lucide:layout-list"}
    An alert with a title.
  ::
  ```
::

## Props

::ct-field-group
  :ct-field{name="title" type="string"}[Alert title]
  :ct-field{name="icon" type="string"}[Alert icon]
  :ct-field{name="type" type="'default' | 'info' | 'warning' | 'success' | 'danger' | 'secondary'" default-value="'default'"}
  :ct-field{name="to" type="string"}[Link URL]
  :ct-field{name="target" type="Target"}[A `target` attribute value to apply on the link]
  :ct-field{name="external" type="boolean"}[Alias to `target='_blank'`]
  :ct-field{name="showLinkIcon" type="boolean" default-value="true"}[Whether to show the link indicator :ct-icon{name="lucide:arrow-up-right"}]
::
