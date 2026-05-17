import { blob } from 'hub:blob'
import {
  IMAGE_UPLOAD_MAX_BYTES,
  buildImageUploadPathname,
  isAllowedImageUploadType,
  normalizeImageUploadKind,
} from '#shared/constants/imageUpload'
import { apiError, success } from '~~/server/utils/apiResponse'

function readErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return 'Image upload failed validation.'
}

function readErrorStatus(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  if ('status' in error && typeof error.status === 'number') {
    return error.status
  }

  return null
}

export default defineEventHandler(async (event) => {
  const kind = normalizeImageUploadKind(getQuery(event).kind)
  if (!kind) {
    throw apiError({
      status: 400,
      statusText: 'Bad Request',
      code: 'INVALID_IMAGE_UPLOAD_KIND',
      message: 'Invalid image upload target.',
      fieldErrors: { kind: ['Invalid image upload target.'] },
    })
  }

  try {
    const formData = await readFormData(event)
    const files = formData.getAll('files')
    const file = files.length === 1 ? files[0] : null

    if (!(file instanceof File)) {
      throw apiError({
        status: 400,
        statusText: 'Bad Request',
        code: 'INVALID_IMAGE_UPLOAD_FILE',
        message: 'Image upload must include exactly one file.',
      })
    }

    if (file.size <= 0) {
      throw apiError({
        status: 400,
        statusText: 'Bad Request',
        code: 'INVALID_IMAGE_UPLOAD_FILE',
        message: 'Image upload must include exactly one file.',
      })
    }

    if (!isAllowedImageUploadType(file.type)) {
      throw apiError({
        status: 400,
        statusText: 'Bad Request',
        code: 'IMAGE_UPLOAD_VALIDATION_ERROR',
        message: 'Image upload failed validation.',
      })
    }

    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      throw apiError({
        status: 400,
        statusText: 'Bad Request',
        code: 'IMAGE_UPLOAD_VALIDATION_ERROR',
        message: 'Image upload failed validation.',
      })
    }

    const pathname = buildImageUploadPathname(kind, crypto.randomUUID(), file.type)
    if (pathname === null) {
      throw apiError({
        status: 400,
        statusText: 'Bad Request',
        code: 'IMAGE_UPLOAD_VALIDATION_ERROR',
        message: 'Image upload failed validation.',
      })
    }

    await blob.put(pathname, file, { contentType: file.type })

    return success({
      pathname,
      url: `/images/${pathname}`,
    })
  }
  catch (error: unknown) {
    const status = readErrorStatus(error)
    if (status !== null && status >= 400 && status < 500) {
      throw apiError({
        status: 400,
        statusText: 'Bad Request',
        code: 'IMAGE_UPLOAD_VALIDATION_ERROR',
        message: readErrorMessage(error),
      })
    }

    throw error
  }
})
