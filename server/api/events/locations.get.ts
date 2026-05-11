import { z } from 'zod'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'

const eventLocationsQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, rawQuery => eventLocationsQuerySchema.parse(rawQuery))
  const locations = await eventService.getEventCatalogLocationOptions(query.locale)
  return success(locations)
})
