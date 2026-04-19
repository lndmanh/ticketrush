/**
 * Pagination metadata for offset-based pagination
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number
  /** Number of items per page */
  pageSize: number
  /** Total number of items across all pages */
  totalItems: number
  /** Total number of pages */
  totalPages: number
  /** Whether there is a next page available */
  hasNextPage: boolean
  /** Whether there is a previous page available */
  hasPreviousPage: boolean
}

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed, default: 1) */
  page?: number
  /** Number of items per page (default: 10) */
  pageSize?: number
  /** Maximum allowed page size (default: 100) */
  maxPageSize?: number
}
