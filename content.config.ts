import { defineContentConfig, defineCollection, property } from '@nuxt/content'
import { z } from 'zod'
import { asSeoCollection } from '@nuxtjs/seo/content'

export default defineContentConfig({
  collections: {
    landing: defineCollection(asSeoCollection({
      type: 'data',
      source: {
        include: '**/landing.yml',
        exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**'],
      },
      schema: z.object({
        hero: z.object({
          title: z.string(),
          subtitle: z.string(),
        }),
      }),
    })),
  },
})
