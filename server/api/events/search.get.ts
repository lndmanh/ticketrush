import { z } from 'zod'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'
import type { EventSearchApiItem } from '~~/types/events'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'

const eventSearchQuerySchema = z.object({
  query: z.string().trim().min(1, 'Search query is required.'),
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, rawQuery => eventSearchQuerySchema.parse(rawQuery))

  const events = await eventService.searchEventCardList(query.query, query.limit, query.locale)

  const response: EventSearchApiItem[] = events.map(item => ({
    id: `/events/${item.slug}`,
    title: item.title,
    subtitle: item.subtitle,
    content: item.description,
    slug: item.slug,
    venueName: item.venue?.name ?? null,
    venueCity: item.venue?.city ?? null,
    sessions: item.sessions.map(session => ({
      startsAt: session.startsAt,
      label: session.label,
    })),
  }))

  return success(response)
})
