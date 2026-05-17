import { blob } from 'hub:blob'
import { isAllowedImageUploadPathname } from '#shared/constants/imageUpload'

export default defineEventHandler(async (event) => {
  const pathname = getRouterParam(event, 'pathname')
  const isAllowedPathname = pathname !== undefined && isAllowedImageUploadPathname(pathname)

  if (!isAllowedPathname) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  setHeader(event, 'Content-Security-Policy', 'default-src \'none\';')
  return blob.serve(event, pathname)
})
