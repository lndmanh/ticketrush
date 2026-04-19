import { defineContentConfig, defineCollection, property } from '@nuxt/content'
import { z } from 'zod'
import { asSeoCollection } from '@nuxtjs/seo/content'

export default defineContentConfig({
  collections: {
    content: defineCollection(asSeoCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        // Exclude all dot files except .navigation.yml (required for navigation)
        exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**'],
      },
      schema: z.looseObject({
        // Basic metadata
        title: z.string(),
        description: z.string().optional(),

        // Date information
        publishedAt: z.string().optional(),

        // Reading time
        readingTime: z.number().optional(),

        // Categorization
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),

        // SEO
        seo: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          keywords: z.array(z.string()).optional(),
          ogImage: z.string().optional(),
        }).optional(),

        navigation: z.object({
          redirect: z.string().optional(),
          target: z.enum(['_blank', '_self', '_parent', '_top']).optional(),
        }).optional(),

        icon: property(z.string().optional()).editor({ input: 'icon' }),
        navBadges: z.array(z.object({
          value: z.string(),
          variant: z.string().optional(),
          type: z.string().optional(),
          size: z.string().optional(),
        })).optional(),
        navTruncate: z.boolean().optional(),
        badges: z.array(z.looseObject({
          value: z.string(),
          to: z.url().optional(),
          target: z.enum(['_blank', '_self', '_parent', '_top']).optional(),
          type: z.string().optional(),
          variant: z.string().optional(),
          icon: z.string().optional(),
        })).optional(),
        authors: z.array(z.looseObject({
          name: z.string(),
          avatar: z.string().optional(),
          to: z.url().optional(),
          target: z.enum(['_blank', '_self', '_parent', '_top']).optional(),
        })).optional(),
        sidebar: z.object({
          style: z.string().optional(),
        }).optional(),
        collapse: z.boolean().optional(),
        editLink: z.boolean().optional().default(true),
        prevNext: z.boolean().optional(),
        breadcrumb: z.boolean().optional().default(true),
        fullpage: z.boolean().optional(),
        aside: z.union([z.boolean(), z.looseObject({})]).optional(),
        toc: z.union([z.boolean(), z.looseObject({})]).optional(),
        banner: z.looseObject({}).optional(),
        main: z.looseObject({}).optional(),
        footer: z.looseObject({}).optional(),
        prev: z.string().optional(),
        next: z.string().optional(),
      }),
    })),
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
