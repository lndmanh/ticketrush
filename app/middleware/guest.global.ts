const ignoredPaths = ['/auth/login', '/auth/register']

export default defineNuxtRouteMiddleware((to) => {
  if (ignoredPaths.includes(to.path)) {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return
    }

    return navigateTo('/')
  }
})
