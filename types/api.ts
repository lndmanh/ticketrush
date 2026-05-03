import type { PaginationMeta } from '~~/types/models/pagination'

export interface ApiResponseSuccess<T> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ApiResponseFailure {
  success: false
  error: {
    code: string
    message: string
  }
  timestamp: string
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseFailure

export type PaginatedApiResponse<T> = (ApiResponseSuccess<T> & {
  pagination: PaginationMeta
}) | ApiResponseFailure
