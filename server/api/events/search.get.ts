import { z } from 'zod'
import eventService from '~~/server/utils/database/event'
import { success } from '~~/server/utils/apiResponse'
import type { EventSearchApiItem } from '~~/types/events'

const eventSearchQuerySchema = z.object({
  query: z.string().trim().min(1, 'Search query is required.'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, rawQuery => eventSearchQuerySchema.parse(rawQuery))

  const events = await eventService.searchEventCardList(query.query, query.limit)

  const results: EventSearchApiItem[] = events.map(item => ({
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

  return success(results)
})
