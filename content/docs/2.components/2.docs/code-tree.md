---
title: Code Tree
badges:
  - value: 0.8.17
  - value: Source
    icon: lucide:code
    to: https://github.com/No-Name-Studio-VN/Homepage/blob/main/app/components/content/CtCodeTree.vue
    target: _blank
breadcrumb: true
collapse: false
editLink: true
fullpage: false
icon: lucide:folder-code
navTruncate: false
prevNext: false
readingTime: 3
sitemap:
  loc: /components/docs/code-tree
---

## Usage

::ct-stack
  :::div{.p-4}
    ::::ct-code-tree{default-value="nuxt.config.ts" title="Sample Nuxt App"}
    ```css [app/assets/main.css]
    @import "tailwindcss" theme(static);
    @import "@nuxt/ui-pro";
    ```

    ```ts [app/app.config.ts]
    export default defineAppConfig({
      ui: {
        colors: {
          primary: 'sky',
          colors: 'slate'
        }
      }
    });
    ```

    ```vue [app/app.vue]
    <template>
      <UApp>
        <NuxtPage />
      </UApp>
    </template>
    ```

    ```json [package.json]
    {
      "name": "nuxt-app",
      "private": true,
      "type": "module",
      "scripts": {
        "build": "nuxt build",
        "dev": "nuxt dev",
        "generate": "nuxt generate",
        "preview": "nuxt preview",
        "postinstall": "nuxt prepare",
        "typecheck": "nuxt typecheck"
      },
      "dependencies": {
        "@iconify-json/lucide": "^1.2.18",
        "@nuxt/ui-pro": "3.0.0-alpha.10",
        "nuxt": "^3.15.1"
      },
      "devDependencies": {
        "typescript": "^5.7.2",
        "vue-tsc": "^2.2.0"
      }
    }
    ```

    ```json [tsconfig.json]
    {
      "extends": "./.nuxt/tsconfig.json"
    }
    ```

    ```ts [nuxt.config.ts]
    export default defineNuxtConfig({
      modules: ['@nuxt/ui-pro'],

      future: {
        compatibilityVersion: 4
      },

      css: ['~/assets/main.css']
    });
    ```

    ````md [README.md]
    # Nuxt 4 Minimal Starter

    Look at the [Nuxt 4 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

    ## Setup

    Make sure to install the dependencies:

    ```bash
    # npm
    npm install

    # pnpm
    pnpm install

    # yarn
    yarn install

    # bun
    bun install
    ```

    ## Development Server

    Start the development server on `http://localhost:3000`:

    ```bash
    # npm
    npm run dev

    # pnpm
    pnpm run dev

    # yarn
    yarn dev

    # bun
    bun run dev
    ```

    ## Production

    Build the application for production:

    ```bash
    # npm
    npm run build

    # pnpm
    pnpm run build

    # yarn
    yarn build

    # bun
    bun run build
    ```

    Locally preview production build:

    ```bash
    # npm
    npm run preview

    # pnpm
    pnpm run preview

    # yarn
    yarn preview

    # bun
    bun run preview
    ```

    Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
    ````
    ::::
  :::
::

`````mdc
::ct-code-tree{defaultValue="nuxt.config.ts" title="Sample Nuxt App"}

```css [app/assets/main.css]
@import "tailwindcss" theme(static);
@import "@nuxt/ui-pro";
```

```ts [app/app.config.ts]
export default defineAppConfig({
ui: {
colors: {
primary: 'sky',
colors: 'slate'
}
}
});
```

```vue [app/app.vue]
<template>
<UApp>
<NuxtPage />
</UApp>
</template>
```

```json [package.json]
{
"name": "nuxt-app",
"private": true,
"type": "module",
"scripts": {
"build": "nuxt build",
"dev": "nuxt dev",
"generate": "nuxt generate",
"preview": "nuxt preview",
"postinstall": "nuxt prepare",
"typecheck": "nuxt typecheck"
},
"dependencies": {
"@iconify-json/lucide": "^1.2.18",
"@nuxt/ui-pro": "3.0.0-alpha.10",
"nuxt": "^3.15.1"
},
"devDependencies": {
"typescript": "^5.7.2",
"vue-tsc": "^2.2.0"
}
}
```

```json [tsconfig.json]
{
"extends": "./.nuxt/tsconfig.json"
}
```

```ts [nuxt.config.ts]
export default defineNuxtConfig({
modules: ['@nuxt/ui-pro'],

future: {
compatibilityVersion: 4
},

css: ['~/assets/main.css']
};
```

````md [README.md]
# Nuxt 4 Minimal Starter

Look at the [Nuxt 4 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm run build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm run preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
````

::
`````

\::

## Props

::ct-field-group
  :::ct-field{name="defaultValue"}
  Default open file
  :::

  :::ct-field{name="title" type="string"}
  Code tree title
  :::

:ct-field{default-value="400" name="height" type="number"}
::
