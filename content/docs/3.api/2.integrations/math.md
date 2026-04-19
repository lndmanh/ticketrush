---
icon: lucide:sigma
title: Math Equations
description: Write LaTeX in Nuxt Starter Kit.
---

::ct-tabs{variant="line"}
  ::div{label="KaTeX"}
    ::ct-steps
    ### Install Plugins
    :ct-pm-install{name="remark-math rehype-katex" save-dev}

    ### Add Plugins to Nuxt Config
    ```ts [nuxt.config.ts]
    export default defineNuxtConfig({
      devtools: { enabled: true },
      css: [
        'katex/dist/katex.min.css',
      ],
      content: {
        build: {
          markdown: {
            remarkPlugins: [
              'remark-math',
            ],
            rehypePlugins: {
              'rehype-katex': {
                output: 'html',
              },
            },
          },
        },
      },
    });
    ```

    ### Write LaTeX
    ````mdc
    #### Inline
    $E = mc^2$

    #### Centered
    When $a \ne 0$, there are two solutions to $(ax^2 + bx + c = 0)$ and they are
    $$ x = {-b \pm \sqrt{b^2-4ac} \over 2a} $$

    #### Math Block
    ```math
    L = \frac{1}{2} \rho v^2 S C_L
    ```
    ````
    ::
  ::
  ::div{label="MathJax"}
    ::ct-steps
    ### Install Plugins
    :ct-pm-install{name="remark-math rehype-mathjax" save-dev}

    ### Add Plugins to Nuxt Config
    ```ts [nuxt.config.ts]
    export default defineNuxtConfig({
      devtools: { enabled: true },
      content: {
        build: {
          markdown: {
            remarkPlugins: [
              'remark-math',
            ],
            rehypePlugins: [
              'rehype-mathjax',
            ],
          },
        },
      },
    });
    ```

    ### Write LaTeX
    ````mdc
    $E = mc^2$

    $$
    E = mc^2
    $$

    ```math
    E = mc^2
    ```
    ````
    ::
  ::
::
