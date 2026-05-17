import { describe, expect, it } from 'vitest'
import {
  ImageUploadKind,
  buildImageUploadPathname,
  imageUploadAppPathPattern,
  isAllowedImageUploadPathname,
} from '#shared/constants/imageUpload'

describe('image upload path utilities', () => {
  it('builds controlled event and venue pathnames from safe tokens and image types', () => {
    expect(buildImageUploadPathname(ImageUploadKind.Event, '123e4567-e89b-42d3-a456-426614174000', 'image/jpeg')).toBe('events/123e4567-e89b-42d3-a456-426614174000.jpg')
    expect(buildImageUploadPathname(ImageUploadKind.Venue, '123e4567-e89b-42d3-a456-426614174001', 'image/webp')).toBe('venues/123e4567-e89b-42d3-a456-426614174001.webp')
  })

  it('rejects unsafe tokens and unsupported image types when building pathnames', () => {
    expect(buildImageUploadPathname(ImageUploadKind.Event, 'abc-123', 'image/jpeg')).toBeNull()
    expect(buildImageUploadPathname(ImageUploadKind.Event, 'bad name', 'image/png')).toBeNull()
    expect(buildImageUploadPathname(ImageUploadKind.Event, '../bad', 'image/png')).toBeNull()
    expect(buildImageUploadPathname(ImageUploadKind.Event, 'abc', 'image/svg+xml')).toBeNull()
  })

  it('allows only app-served event and venue image paths with one file segment', () => {
    expect(isAllowedImageUploadPathname('events/123e4567-e89b-42d3-a456-426614174000.png')).toBe(true)
    expect(isAllowedImageUploadPathname('venues/123e4567-e89b-42d3-a456-426614174001.webp')).toBe(true)
    expect(isAllowedImageUploadPathname('events')).toBe(false)
    expect(isAllowedImageUploadPathname('events/nested/cover.png')).toBe(false)
    expect(isAllowedImageUploadPathname('events/bad name.png')).toBe(false)
    expect(isAllowedImageUploadPathname('events/123e4567-e89b-42d3-a456-426614174000.svg')).toBe(false)
    expect(isAllowedImageUploadPathname('events/123e4567-e89b-42d3-a456-426614174000.txt')).toBe(false)
    expect(isAllowedImageUploadPathname('events/123e4567-e89b-42d3-a456-426614174000')).toBe(false)
    expect(isAllowedImageUploadPathname('events/cover-1.png')).toBe(false)
    expect(imageUploadAppPathPattern.test('/images/events/123e4567-e89b-42d3-a456-426614174000.png')).toBe(true)
    expect(imageUploadAppPathPattern.test('/images/events/123e4567-e89b-42d3-a456-426614174000.svg')).toBe(false)
    expect(imageUploadAppPathPattern.test('/images/events/123e4567-e89b-42d3-a456-426614174000')).toBe(false)
    expect(imageUploadAppPathPattern.test('/images/foo/123e4567-e89b-42d3-a456-426614174000.png')).toBe(false)
  })
})
