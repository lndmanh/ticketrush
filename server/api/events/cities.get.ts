import { z } from 'zod'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'

const eventCitiesQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, rawQuery => eventCitiesQuerySchema.parse(rawQuery))
  const cities = await eventService.getEventCatalogCities(query.locale)
  const response: Awaited<ReturnType<typeof eventService.getEventCatalogCities>> = cities
  return success(response)
})
