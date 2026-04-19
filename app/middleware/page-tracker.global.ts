import { storeCurrentPage } from '@/composables/usePageTracker'

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.noPageTrack) {
    console.debug('Page tracking skipped for', to.fullPath || to.path)
  }
  else {
    storeCurrentPage(to.fullPath || to.path)
  }
  return
})
