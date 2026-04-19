---
title: Package Manager
icon: lucide:package
description: ''
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtPmInstall.vue
    target: _blank
  - value: 0.8.0
---

## Usage

The package managers shown can be configured in [`main.pm`](/api/configuration/shadcn-docs#main).

### Install

::ct-stack
  ::div{class="p-4"}
    :ct-pm-install{name="Nuxt Starter Kit"}
    :ct-pm-install{name="Nuxt Starter Kit" save-dev}
    :ct-pm-install
    :ct-pm-install{name="-g nuxi@latest"}
  ::
  ```mdc
  :ct-pm-install{name="Nuxt Starter Kit"}
  :ct-pm-install{name="Nuxt Starter Kit" save-dev}
  :ct-pm-install
  :ct-pm-install{name="-g nuxi@latest"}
  ```
::

### Run

::ct-stack
  ::div{class="p-4"}
    :ct-pm-run{script="dev"}
    :ct-pm-run{script="build --watch -o"}
  ::
  ```mdc
  :ct-pm-run{script="dev"}
  :ct-pm-run{script="build --watch -o"}
  ```
::

### X

::ct-stack
  ::div{class="p-4"}
  :ct-pm-x{command="nuxi@latest init <project-name>"}
  ::
  ```mdc
  :ct-pm-x{command="nuxi@latest init <project-name>"}
  ```
::

### No Sync

::ct-stack
  ::div{class="p-4"}
    :ct-pm-x{command="nuxi@latest init <project-name>" no-sync}
  ::
  ```mdc
  :ct-pm-x{command="nuxi@latest init <project-name>" no-sync}
  ```
::
