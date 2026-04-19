/**
 * Nuxt Module: Content Prerender
 *
 * Automatically discovers all content .md files and registers them
 * as prerender routes so they are generated as static HTML at build time.
 * This is critical for Cloudflare Workers free plan (10ms CPU limit)
 * where SSR is too expensive.
 */

import { defineNuxtModule } from '@nuxt/kit'
import { readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Recursively find all .md files in a directory
 */
function findMarkdownFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          findMarkdownFiles(fullPath, files)
        }
        else if (entry.endsWith('.md')) {
          files.push(fullPath)
        }
      }
      catch {
        // Skip files we can't access
      }
    }
  }
  catch {
    // Skip directories we can't access
  }

  return files
}

/**
 * Convert a content file path to URL path
 * e.g. content/1.products/1.nuxt-starter-kit/1.getting-started/1.introduction.md
 *   -> /products/nuxt-starter-kit/getting-started/introduction
 */
function contentFileToUrlPath(filePath: string, contentDir: string): string {
  let relativePath = filePath
    .replace(contentDir, '')
    .replace(/\\/g, '/')

  // Remove .md extension
  relativePath = relativePath.replace(/\.md$/, '')

  // Split into segments and clean each one
  const segments = relativePath.split('/').filter(Boolean)
  const cleanSegments = segments.map((segment) => {
    // Remove numeric prefix (e.g., "1.products" -> "products")
    return segment.replace(/^\d+\./, '')
  })

  // Handle index files — remove "index" from the path
  if (cleanSegments.length > 0 && cleanSegments[cleanSegments.length - 1] === 'index') {
    cleanSegments.pop()
  }

  return '/' + cleanSegments.join('/')
}

export default defineNuxtModule({
  meta: {
    name: 'content-prerender',
    configKey: 'contentPrerender',
  },

  defaults: {
    enabled: true,
  },

  setup(options, nuxt) {
    if (!options.enabled) return

    const contentDir = join(nuxt.options.rootDir, 'content')

    // Add content routes to prerender list
    nuxt.hook('nitro:config', (nitroConfig) => {
      const markdownFiles = findMarkdownFiles(contentDir)
      const routes: string[] = []

      for (const file of markdownFiles) {
        const urlPath = contentFileToUrlPath(file, contentDir)

        // Skip empty paths
        if (!urlPath || urlPath === '/') continue

        routes.push(urlPath)
      }

      // Merge with existing prerender routes
      nitroConfig.prerender = nitroConfig.prerender || {}
      nitroConfig.prerender.routes = nitroConfig.prerender.routes || []
      nitroConfig.prerender.routes.push(...routes)

      console.log(`[content-prerender] Registered ${routes.length} content routes for prerendering`)
      for (const route of routes) {
        console.log(`[content-prerender]   ${route}`)
      }
    })
  },
})
