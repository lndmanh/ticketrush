import type { PaginationMeta } from '~~/types/models/pagination'
import type {
  ApiErrorDetails,
  ApiFieldErrors,
  ApiResponse,
  ApiResponseFailure,
  ApiResponseSuccess,
  PaginatedApiResponse,
} from '~~/types/api'
import { reportServerError } from '~~/server/utils/reportServerError'

export type { ApiErrorDetails, ApiFieldErrors, ApiResponse, ApiResponseFailure, ApiResponseSuccess, PaginatedApiResponse }

export type ApiErrorOptions = {
  status: number
  statusText: string
  message: string
  code?: string
  fieldErrors?: ApiFieldErrors
  details?: ApiErrorDetails
  cause?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getIssueMessage(issue: unknown): string | null {
  if (!isRecord(issue) || typeof issue.message !== 'string') return null
  return issue.message
}

function getIssuePath(issue: unknown): string | null {
  if (!isRecord(issue) || !Array.isArray(issue.path)) return null
  if (issue.path.some(part => typeof part !== 'string' && typeof part !== 'number')) return null
  if (issue.path.length === 0) return null
  return issue.path.join('.')
}

export function zodErrorToFieldErrors(error: unknown): ApiFieldErrors {
  if (!isRecord(error) || !Array.isArray(error.issues)) return {}

  return error.issues.reduce<ApiFieldErrors>((fieldErrors, issue) => {
    const path = getIssuePath(issue)
    const message = getIssueMessage(issue)
    if (path === null || message === null) return fieldErrors

    const existing = fieldErrors[path] ?? []
    fieldErrors[path] = [...existing, message]
    return fieldErrors
  }, {})
}

export function success<T>(data: T, message?: string): ApiResponseSuccess<T> {
  return {
    success: true,
    data,
    ...(message === undefined ? {} : { message }),
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
    ...(message === undefined ? {} : { message }),
    timestamp: new Date().toISOString(),
  }
}

// Error response helper
export function fail(message: string, code: string = 'ERROR', fieldErrors?: ApiFieldErrors, details?: ApiErrorDetails): ApiResponseFailure {
  const error = {
    code,
    message,
    ...(fieldErrors === undefined ? {} : { fieldErrors }),
    ...(details === undefined ? {} : { details }),
  }

  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  }
}

export function apiError(options: ApiErrorOptions) {
  if (options.cause !== undefined) {
    reportServerError(options.cause, {
      code: options.code,
      status: options.status,
      statusText: options.statusText,
    })
  }

  return createError({
    status: options.status,
    statusText: options.statusText,
    data: fail(options.message, options.code, options.fieldErrors, options.details),
  })
}
