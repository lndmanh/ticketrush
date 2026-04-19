---
title: Carbon Ads
icon: lucide:chart-line
description: Run ads at the bottom of the TOC section.
---

**Nuxt Starter Kit** uses [Nuxt Scripts](https://scripts.nuxt.com/scripts/ads/carbon-ads) under the hood for [Carbon Ads](https://www.carbonads.net/). Add your Carbon Ads credentials to `docs.config.ts` and ads will be displayed at the bottom of the toc section.

```ts [docs.config.ts]
export const DOCS_CONFIG = {
  toc: {
    enable: true,
    carbonAds: {
      enable: true,
      disableInDev: false,
      disableInMobile: false,
      fallback: false, // whether to show fallback message when blocked by ad blockers
      code: 'your-carbon-code', // aka the 'serve' code
      placement: 'your-carbon-placement',
      format: 'your-carbon-format', // defaults to 'cover'
    },
  },
};
```

:ct-read-more{title="Carbon Ads website" to="https://www.carbonads.net/"}

### Disabling on certain pages

```md
---
title: Page Title
toc:
  carbonAds:
    enable: false
---

<!-- Page Content -->
```

## Parameters

::ct-field-group
  ::ct-field{name="enable" type="boolean" default-value="false"}
  Whether to turn on Carbon Ads.
  ::
  ::ct-field{name="disableInDev" type="boolean" default-value="false"}
  Whether to disable Carbon Ads in dev environment.
  ::
  ::ct-field{name="disableInMobile" type="boolean" default-value="false"}
  Whether to disable Carbon Ads on mobile.
  ::
  ::ct-field{name="fallback" type="boolean" default-value="false"}
  Whether to show fallback message when blocked by ad blockers
  ::
  ::ct-field{name="fallbackMessage" type="string" default-value="'Please support us by disabling your ad blocker.'"}
  Fallback message.
  ::
  ::ct-field{name="code" type="string"}
  Carbon Ads serve code.
  ::
  ::ct-field{name="placement" type="string"}
  Carbon Ads placement.
  ::
  ::ct-field{name="format" type="'cover' | 'responsive'" default-value="cover"}
  Carbon Ads format.
  ::
::
