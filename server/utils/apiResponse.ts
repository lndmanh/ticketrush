import type { ApiResponseFailure, ApiResponseSuccess, PaginatedApiResponse } from '~~/types/api'
import type { PaginationMeta } from '~~/types/models/pagination'

export function success<T>(data: T, message?: string): ApiResponseSuccess<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create a paginated success response
 */
export function successPaginated<T>(data: T, pagination: PaginationMeta, message?: string): PaginatedApiResponse<T> {
  return {
    success: true,
    data,
    pagination,
    message,
    timestamp: new Date().toISOString(),
  }
}

export function fail(message: string, code: string = 'ERROR'): ApiResponseFailure {
  return {
    success: false,
    error: { code, message },
    timestamp: new Date().toISOString(),
  }
}
