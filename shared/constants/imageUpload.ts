export enum ImageUploadKind {
  Event = 'event',
  Venue = 'venue',
}

export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
export const IMAGE_UPLOAD_MAX_SIZE_LABEL = '10MB'
export const IMAGE_UPLOAD_ALLOWED_TYPES_LABEL = 'JPG, PNG, WebP, GIF'
export const IMAGE_UPLOAD_ALLOWED_TYPES: string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]
export const IMAGE_UPLOAD_ACCEPT = IMAGE_UPLOAD_ALLOWED_TYPES.join(',')

export const imageUploadKindPrefixes: Record<ImageUploadKind, string> = {
  [ImageUploadKind.Event]: 'events',
  [ImageUploadKind.Venue]: 'venues',
}

const imageUploadTokenPattern = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const imageUploadExtensionPattern = '(?:jpg|png|webp|gif)'
const imageUploadFilenamePattern = `${imageUploadTokenPattern}\\.${imageUploadExtensionPattern}`
const imageUploadTokenRegex = new RegExp(`^${imageUploadTokenPattern}$`)
const imageUploadContentTypeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export const imageUploadPathnamePattern = new RegExp(
  `^(?:${imageUploadKindPrefixes[ImageUploadKind.Event]}/${imageUploadFilenamePattern}|${imageUploadKindPrefixes[ImageUploadKind.Venue]}/${imageUploadFilenamePattern})$`,
)

export const imageUploadAppPathPattern = new RegExp(
  `^/images/(?:${imageUploadKindPrefixes[ImageUploadKind.Event]}/${imageUploadFilenamePattern}|${imageUploadKindPrefixes[ImageUploadKind.Venue]}/${imageUploadFilenamePattern})$`,
)

export function normalizeImageUploadKind(value: unknown): ImageUploadKind | null {
  if (value === ImageUploadKind.Event) {
    return ImageUploadKind.Event
  }

  if (value === ImageUploadKind.Venue) {
    return ImageUploadKind.Venue
  }

  return null
}

export function isAllowedImageUploadType(value: string): boolean {
  return IMAGE_UPLOAD_ALLOWED_TYPES.includes(value)
}

export function buildImageUploadPathname(kind: ImageUploadKind, token: string, contentType: string): string | null {
  if (!imageUploadTokenRegex.test(token)) {
    return null
  }

  const extension = imageUploadContentTypeExtensions[contentType]
  if (extension === undefined) {
    return null
  }

  return `${imageUploadKindPrefixes[kind]}/${token}.${extension}`
}

export function isAllowedImageUploadPathname(value: string): boolean {
  return imageUploadPathnamePattern.test(value)
}
