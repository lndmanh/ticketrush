import { z } from 'zod'
import eventService from '~~/server/utils/database/event'
import { successPaginated } from '~~/server/utils/apiResponse'
import type { EventCatalogQueryOptions } from '~~/types/events'
import type { PaginationMeta } from '~~/types/models/pagination'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'
import { EventCatalogDateFilter, EventCatalogSort, EventCatalogStatusFilter } from '#shared/commonEnums'

const eventCatalogQuerySchema = z.object({
  q: z.string().trim().default('').catch(''),
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
  location: z.string().trim().default('').catch(''),
  status: z.enum(EventCatalogStatusFilter).default(EventCatalogStatusFilter.All).catch(EventCatalogStatusFilter.All),
  country: z.string().trim().default('all').catch('all'),
  city: z.string().trim().default('all').catch('all'),
  area: z.string().trim().default('').catch(''),
  venue: z.string().trim().default('all').catch('all'),
  date: z.union([
    z.enum(EventCatalogDateFilter),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ]).default(EventCatalogDateFilter.All).catch(EventCatalogDateFilter.All),
  sort: z.enum(EventCatalogSort).default(EventCatalogSort.Soonest).catch(EventCatalogSort.Soonest),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(24).catch(9),
})

function getPaginationMeta(page: number, pageSize: number, totalItems: number): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  }
}

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, rawQuery => eventCatalogQuerySchema.parse(rawQuery))
  const options: EventCatalogQueryOptions = {
    locale: query.locale,
    q: query.q,
    location: query.location,
    status: query.status,
    country: query.country || 'all',
    city: query.city || 'all',
    area: query.area,
    venue: query.venue || 'all',
    date: query.date,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  }

  const result = await eventService.getEventCatalog(options)
  const pagination = getPaginationMeta(options.page, options.pageSize, result.totalItems)

  if (result.totalItems > 0 && options.page > pagination.totalPages) {
    const clampedResult = await eventService.getEventCatalog({
      ...options,
      page: pagination.totalPages,
    })

    return successPaginated(
      clampedResult.items,
      getPaginationMeta(pagination.totalPages, options.pageSize, clampedResult.totalItems),
    )
  }

  return successPaginated(result.items, pagination)
})
