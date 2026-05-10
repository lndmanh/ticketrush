import { apiRoutes } from '#shared/apiRoutes'

export default defineEventHandler((event) => {
  return sendRedirect(event, apiRoutes.AUTH_LOGIN)
})
