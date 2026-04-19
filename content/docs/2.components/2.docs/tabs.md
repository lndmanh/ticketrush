---
title: Tabs
badges:
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtTabs.vue
    target: _blank
breadcrumb: true
collapse: false
editLink: true
fullpage: false
icon: lucide:table-2
navTruncate: false
prevNext: false
readingTime: 5
sitemap:
  loc: /components/docs/tabs
---

## Usage

::ct-stack
  :::div{.p-4}
    ::::ct-tabs
      :::::div{icon="lucide:database" label="PostgreSQL"}
      ### PostgreSQL column types

      ```ts
      import { integer, pgTable } from 'drizzle-orm/pg-core';

      export const table = pgTable('table', {
        int: integer('int')
      });
      ```
      :::::

      :::::div{label="MySQL"}
      ### MySQL column types

      ```ts
      import { int, mysqlTable } from 'drizzle-orm/mysql-core';

      const table = mysqlTable('table', {
        int: int('int')
      });
      ```
      :::::

      :::::div{label="SQLite"}
      ### SQLite column types

      ```ts
      import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

      const table = sqliteTable('table', {
        id: integer('id')
      });

      // you can customize integer mode to be number, boolean, timestamp, timestamp_ms
      integer('id', { mode: 'number' });
      integer('id', { mode: 'boolean' });
      integer('id', { mode: 'timestamp_ms' });
      integer('id', { mode: 'timestamp' }); // Date
      ```
      :::::
    ::::
  :::

````mdc
::ct-tabs
  ::div{label="PostgreSQL" icon="lucide:database"}
  ### PostgreSQL column types

  ```ts
  import { integer, pgTable } from 'drizzle-orm/pg-core';

  export const table = pgTable('table', {
    int: integer('int')
  });
  ```
  ::
  ::div{label="MySQL"}
  ### MySQL column types

  ```ts
  import { int, mysqlTable } from 'drizzle-orm/mysql-core';

  const table = mysqlTable('table', {
    int: int('int')
  });
  ```
  ::
  ::div{label="SQLite"}
  ### SQLite column types

  ```ts
  import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

  const table = sqliteTable('table', {
    id: integer('id')
  });

  // you can customize integer mode to be number, boolean, timestamp, timestamp_ms
  integer('id', { mode: 'number' });
  integer('id', { mode: 'boolean' });
  integer('id', { mode: 'timestamp_ms' });
  integer('id', { mode: 'timestamp' }); // Date
  ```
  ::
::
````
::

### Card Style

::ct-stack
  :::div{.p-4}
    ::::ct-tabs{variant="card"}
      :::::div{label="Card Tab"}
      ### This is a card-style tab
      :::::

      :::::div{icon="lucide:atom" label="Tab 2"}
      This is Tab #2
      :::::

    ```ts [Code Tab]
    console.log('Hello World!');
    ```
    ::::
  :::

````mdc
::ct-tabs{variant="card"}
  ::div{label="Card Tab"}
  ### This is a card-style tab
  ::
  ::div{label="Tab 2" icon="lucide:atom"}
  This is Tab #2
  ::
  ```ts [Code Tab]
  console.log('Hello World!');
  ```
::
````
::

### Line Style

::ct-badge{variant="outline"}
0.6.4
::

::ct-stack
  :::div{.p-4}
    ::::ct-tabs{variant="line"}
      :::::div
      ---
      class: border flex min-h-[200px] w-full justify-center p-10 items-center
        rounded-lg shadow-xs
      label: Preview
      ---
        ::::::ct-badge
        Badge
        ::::::
      :::::

      :::::div{label="Code"}
      ```tsx
      import { Badge } from "@/components/ui/badge"

      export function BadgeDemo() {
        return <Badge>Badge</Badge>
      }
      ```
      :::::
    ::::
  :::

````mdc
::ct-tabs{variant="line"}
  ::div{label="Preview" class="border flex min-h-[200px] w-full justify-center p-10 items-center rounded-lg shadow-xs"}
    :ct-badge[Badge]
  ::
  ::div{label="Code"}
    ```tsx
    import { Badge } from "@/components/ui/badge"

    export function BadgeDemo() {
      return <Badge>Badge</Badge>
    }
    ```
  ::
::
````
::

### Combobox Style

::ct-badge{variant="outline"}
0.7.5
::

::ct-stack
  :::div{.p-4}
    ::::ct-tabs
    ---
    search-empty: No database found.
    search-placeholder: Search database...
    variant: combobox
    ---
      :::::div{label="PostgreSQL"}
      ### PostgreSQL column types

      ```ts
      import { integer, pgTable } from 'drizzle-orm/pg-core';

      export const table = pgTable('table', {
        int: integer('int')
      });
      ```
      :::::

      :::::div{label="MySQL"}
      ### MySQL column types

      ```ts
      import { int, mysqlTable } from 'drizzle-orm/mysql-core';

      const table = mysqlTable('table', {
        int: int('int')
      });
      ```
      :::::

      :::::div{label="SQLite"}
      ### SQLite column types

      ```ts
      import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

      const table = sqliteTable('table', {
        id: integer('id')
      });

      // you can customize integer mode to be number, boolean, timestamp, timestamp_ms
      integer('id', { mode: 'number' });
      integer('id', { mode: 'boolean' });
      integer('id', { mode: 'timestamp_ms' });
      integer('id', { mode: 'timestamp' }); // Date
      ```
      :::::
    ::::
  :::

````mdc
::ct-tabs{variant="combobox" search-placeholder="Search database..." search-empty="No database found."}
  ::div{label="PostgreSQL"}
  ### PostgreSQL column types

  ```ts
  import { integer, pgTable } from 'drizzle-orm/pg-core';

  export const table = pgTable('table', {
    int: integer('int')
  });
  ```
  ::
  ::div{label="MySQL"}
  ### MySQL column types

  ```ts
  import { int, mysqlTable } from 'drizzle-orm/mysql-core';

  const table = mysqlTable('table', {
    int: int('int')
  });
  ```
  ::
  ::div{label="SQLite"}
  ### SQLite column types

  ```ts
  import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';

  const table = sqliteTable('table', {
    id: integer('id')
  });

  // you can customize integer mode to be number, boolean, timestamp, timestamp_ms
  integer('id', { mode: 'number' });
  integer('id', { mode: 'boolean' });
  integer('id', { mode: 'timestamp_ms' });
  integer('id', { mode: 'timestamp' }); // Date
  ```
  ::
::
````
::

### Synced Tabs

::ct-badge{variant="outline"}
0.8.0
::

:ct-read-more{to="/components/docs/pm"}

::ct-stack
  :::div{.p-4.md:p-8}
  #### Scope 1

    ::::ct-tabs{sync="your-scope-name" variant="card"}
      :::::div{label="Card Tab"}
      ### This is a card-style tab
      :::::

    ```ts [Code Tab]
    console.log('Hello World!');
    ```
    ::::

    ::::ct-tabs{sync="your-scope-name" variant="card"}
      :::::div{label="Card Tab"}
      ### This is a card-style tab
      :::::

      :::::div{icon="lucide:atom" label="Tab 2"}
      This is Tab #2
      :::::

    ```ts [Code Tab]
    console.log('Hello World!');
    ```
    ::::

  #### Scope 2

    ::::ct-tabs{sync="scope2" variant="line"}
      :::::div{label="Card Tab"}
      ### This is a card-style tab
      :::::

      :::::div{icon="lucide:atom" label="Tab 2"}
      This is Tab #2
      :::::

    ```ts [Code Tab]
    console.log('Hello World!');
    ```
    ::::

    ::::ct-tabs{sync="scope2" variant="separate"}
      :::::div{label="Card Tab"}
      ### This is a card-style tab
      :::::

      :::::div{icon="lucide:atom" label="Tab 2"}
      This is Tab #2
      :::::

    ```ts [Code Tab]
    console.log('Hello World!');
    ```
    ::::
  :::

````mdc
#### Scope 1
::ct-tabs{variant="card" sync="your-scope-name"}
  ::div{label="Card Tab"}
  ### This is a card-style tab
  ::
  ```ts [Code Tab]
  console.log('Hello World!');
  ```
::
::ct-tabs{variant="card" sync="your-scope-name"}
  ::div{label="Card Tab"}
  ### This is a card-style tab
  ::
  ::div{label="Tab 2" icon="lucide:atom"}
  This is Tab #2
  ::
  ```ts [Code Tab]
  console.log('Hello World!');
  ```
::

#### Scope 2
::ct-tabs{variant="line" sync="scope2"}
  ::div{label="Card Tab"}
  ### This is a card-style tab
  ::
  ::div{label="Tab 2" icon="lucide:atom"}
  This is Tab #2
  ::
  ```ts [Code Tab]
  console.log('Hello World!');
  ```
::
::ct-tabs{variant="separate" sync="scope2"}
  ::div{label="Card Tab"}
  ### This is a card-style tab
  ::
  ::div{label="Tab 2" icon="lucide:atom"}
  This is Tab #2
  ::
  ```ts [Code Tab]
  console.log('Hello World!');
  ```
::
````
::

## Props

::ct-field-group
:ct-field{default-value="'separate'" name="variant" type="'separate' | 'card' | 'line' | 'combobox'"}

:ct-field{default-value="true" name="padded" type="boolean"}

  :::ct-field{default-value="false" name="disableSearch" type="boolean"}
  For combobox variant
  :::

  :::ct-field
  ---
  default-value: "'Search Tab...'"
  name: searchPlaceholder
  type: string
  ---
  For combobox variant
  :::

  :::ct-field{default-value="'No tab found.'" name="searchEmpty" type="string"}
  For combobox variant
  :::

  :::ct-field{name="sync" type="string"}
  Sync scope
  :::
::
