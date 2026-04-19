---
title: Umami
icon: lucide:cloud
description: Integration for Umami analytics.
---

**Nuxt Starter Kit** uses [Nuxt Scripts](https://scripts.nuxt.com/scripts/analytics/umami-analytics) under the hood for [Umami Analytics](https://umami.is/). Add your Umami `data-website-id` to `docs.config.ts`.

```ts [docs.config.ts]
export const DOCS_CONFIG = {
  site: {
    umami: {
      enable: true,
      src: 'https://cloud.umami.is/script.js',
      dataWebsiteId: 'your-data-website-id',
    },
  },
};
```

## Parameters

::ct-field-group
  ::ct-field{name="enable" type="boolean" default-value="false"}
  Whether to turn on the umami integration.
  ::
  ::ct-field{name="src" type="string" default-value="https://cloud.umami.is/script.js"}
  The link src in the tracking code.
  ::
  ::ct-field{name="dataWebsiteId" type="string"}
  The _Website ID_ from umami dashboard.
  ::
::
