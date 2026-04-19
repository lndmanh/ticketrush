import { useCookie, useRequestURL } from '#app'

const PWA_LAST_PAGE_KEY = 'pwa_last_page'
const SKIP_PAGES = ['/auth/', '/api/', '/pwa', '/proxy/', '/~offline']

const shouldSkip = (p: string) => SKIP_PAGES.some(x => p.startsWith(x))

export function storeCurrentPage(path?: string) {
  let fullPath = path
  if (!fullPath) {
    if (import.meta.server) {
      const url = useRequestURL()
      fullPath = url.pathname + (url.search || '')
    }
    else {
      fullPath = location.pathname + location.search + location.hash
    }
  }
  if (!fullPath || shouldSkip(fullPath)) return

  const cookie = useCookie<string | null>(PWA_LAST_PAGE_KEY, {
    path: '/', sameSite: 'lax',
    // maxAge: 60 * 60 * 24 * 30, // optional
  })
  cookie.value = fullPath

  if (import.meta.client) {
    localStorage.setItem(PWA_LAST_PAGE_KEY, fullPath)
  }
}

export function getLastStoredPage() {
  if (import.meta.client) {
    const v = localStorage.getItem(PWA_LAST_PAGE_KEY)
    if (v) return v
  }
  const cookie = useCookie<string | null>(PWA_LAST_PAGE_KEY)
  return cookie.value ?? null
}
