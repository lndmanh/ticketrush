import type { PaginationMeta } from '~~/types/models/pagination'

export type ApiResponseSuccess<T> = {
  success: true
  data: T
  message?: string
  timestamp: string
}

export type ApiResponseFailure = {
  success: false
  error: {
    code: string
    message: string
  }
  timestamp: string
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseFailure
export type PaginatedApiResponse<T> = ApiResponseSuccess<T> & {
  pagination: PaginationMeta
} | ApiResponseFailure

export function success<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  } as ApiResponseSuccess<T>
}

/**
 * Create a paginated success response
 */
export function successPaginated<T>(data: T, pagination: PaginationMeta, message?: string) {
  return {
    success: true,
    data,
    pagination,
    message,
    timestamp: new Date().toISOString(),
  } as PaginatedApiResponse<T>
}

// Error response helper
export function fail(message: string, code: string = 'ERROR') {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  } as ApiResponseFailure
}
