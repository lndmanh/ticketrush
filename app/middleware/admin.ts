export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession()

  if (!user.value) {
    return navigateTo({
      path: '/auth/login',
      query: {
        redirectTo: to.fullPath,
      },
    })
  }

  if (!user.value.isAdmin) {
    return createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }
})
