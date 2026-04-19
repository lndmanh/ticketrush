/**
 * Nuxt Module: Navigation Redirects
 *
 * Automatically generates Netlify _redirects from .navigation.yml files.
 * This allows redirects to be managed through Nuxt Studio while still working on Netlify.
 */

import { defineNuxtModule } from '@nuxt/kit'
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { isEmpty } from 'es-toolkit/compat'

interface RedirectEntry {
  from: string
  to: string
}

/**
 * Simple YAML parser for navigation files (handles key: value format)
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.substring(0, colonIndex).trim()
    let value = trimmed.substring(colonIndex + 1).trim()

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

/**
 * Recursively find all .navigation.yml files
 */
function findNavigationFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          findNavigationFiles(fullPath, files)
        }
        else if (entry === '.navigation.yml') {
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
 * Convert content path to URL path
 */
function contentPathToUrlPath(filePath: string, contentDir: string): string {
  const relativePath = filePath
    .replace(contentDir, '')
    .replace(/\\/g, '/')
    .replace(/\/.navigation\.yml$/, '')

  const segments = relativePath.split('/').filter(Boolean)
  const cleanSegments = segments.map((segment) => {
    return segment.replace(/^\d+\./, '')
  })

  return '/' + cleanSegments.join('/')
}

/**
 * Parse navigation file and extract redirect
 */
function parseNavigationFile(filePath: string, contentDir: string): RedirectEntry | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const parsed = parseSimpleYaml(content)

    // Check for redirect in 'navigation.redirect' key (flat YAML format)
    const redirect = parsed['navigation.redirect']

    if (typeof redirect === 'string' && !isEmpty(redirect)) {
      const from = contentPathToUrlPath(filePath, contentDir)
      return { from, to: redirect }
    }
  }
  catch {
    console.warn(`[navigation-redirects] Warning: Could not parse ${filePath}`)
  }

  return null
}

/**
 * Generate all redirects with validation
 */
function generateRedirects(contentDir: string): RedirectEntry[] {
  const navigationFiles = findNavigationFiles(contentDir)
  const redirects: RedirectEntry[] = []

  for (const file of navigationFiles) {
    const redirect = parseNavigationFile(file, contentDir)
    if (redirect) {
      // Validate: warn if redirect target equals source (self-redirect loop)
      if (redirect.from === redirect.to || redirect.from + '/' === redirect.to) {
        console.warn(`[navigation-redirects] WARNING: Self-redirect detected: ${redirect.from} -> ${redirect.to}`)
        continue
      }
      redirects.push(redirect)
    }
  }

  return redirects
}

export default defineNuxtModule({
  meta: {
    name: 'navigation-redirects',
    configKey: 'navigationRedirects',
  },

  defaults: {
    enabled: true,
  },

  setup(options, nuxt) {
    if (!options.enabled) return

    // const resolver = createResolver(import.meta.url)
    const contentDir = join(nuxt.options.rootDir, 'content')

    // Generate redirects and add to route rules
    nuxt.hook('nitro:config', (nitroConfig) => {
      console.log('[navigation-redirects] Generating redirects from .navigation.yml files...')

      const redirects = generateRedirects(contentDir)
      console.log(`[navigation-redirects] Found ${redirects.length} redirects`)

      // Add to Nitro route rules
      nitroConfig.routeRules = nitroConfig.routeRules || {}

      for (const { from, to } of redirects) {
        nitroConfig.routeRules[from] = { redirect: { to, statusCode: 301 } }
        // Also add trailing slash variant
        nitroConfig.routeRules[from + '/'] = { redirect: { to, statusCode: 301 } }

        // Add lowercase variants for case-insensitive matching
        const fromLower = from.toLowerCase()
        if (fromLower !== from) {
          nitroConfig.routeRules[fromLower] = { redirect: { to, statusCode: 301 } }
          nitroConfig.routeRules[fromLower + '/'] = { redirect: { to, statusCode: 301 } }
        }

        console.log(`[navigation-redirects]   ${from} -> ${to}`)
      }
    })

    // Also generate _redirects file in public folder for Netlify
    nuxt.hook('build:before', () => {
      const redirects = generateRedirects(contentDir)

      if (redirects.length === 0) return

      const publicDir = join(nuxt.options.rootDir, 'public')

      // Ensure public directory exists
      if (!existsSync(publicDir)) {
        mkdirSync(publicDir, { recursive: true })
      }

      // Generate _redirects content
      const lines: string[] = [
        '# Auto-generated from .navigation.yml files',
        '# Do not edit manually - changes will be overwritten on build',
        '',
      ]

      for (const { from, to } of redirects) {
        // The ! at the end means "force" - redirect even if file exists
        lines.push(`${from} ${to} 301`)
        lines.push(`${from}/ ${to} 301`)

        // Also add lowercase variants for case-insensitive matching
        const fromLower = from.toLowerCase()
        if (fromLower !== from) {
          lines.push(`${fromLower} ${to} 301`)
          lines.push(`${fromLower}/ ${to} 301`)
        }
      }

      const redirectsPath = join(publicDir, '_redirects')
      writeFileSync(redirectsPath, lines.join('\n'))
      console.log(`[navigation-redirects] Written ${redirectsPath}`)
    })
  },
})
