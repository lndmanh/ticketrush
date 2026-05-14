import type { ApiResponse } from '~~/types/api'
import type { UserProfileModel } from '~~/types/models/profile'

export default defineNuxtRouteMiddleware(async (to) => {
  const { user } = useUserSession()

  if (!user.value) {
    return navigateTo({
      path: '/auth/login',
      query: {
        redirectTo: to.fullPath,
      },
    })
  }

  if (user.value.isAdmin) {
    return
  }

  try {
    const profile = await $fetch<ApiResponse<UserProfileModel>>('/api/users/me')
    if (profile.success && profile.data.isAdmin) {
      return
    }
  }
  catch {
    // keep default forbidden behavior below
  }

  return createError({
    statusCode: 403,
    statusMessage: 'Forbidden',
  })
})
