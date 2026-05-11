import { z } from 'zod'
import checkoutService from '~~/server/utils/ticketing/checkout'
import eventService from '~~/server/utils/database/event'
import { apiError, success } from '~~/server/utils/apiResponse'
import { localeSchema } from '#shared/schemas/ticketingSchema'
import { sourceLocale } from '~~/i18n-constants'

const checkoutQuerySchema = z.object({
  locale: localeSchema.default(sourceLocale).catch(sourceLocale),
})

export default defineEventHandler(async (event) => {
  const userSession = await requireUserSession(event)
  const query = await getValidatedQuery(event, rawQuery => checkoutQuerySchema.parse(rawQuery))
  const orderId = getRouterParam(event, 'orderId')
  if (!orderId) {
    throw apiError({ status: 400, statusText: 'Bad Request', code: 'INVALID_ORDER_ID', message: 'Order ID is required.' })
  }

  const checkout = await checkoutService.getCheckoutByPublicId(orderId)
  if (!checkout || checkout.order.userId !== userSession.user.id) {
    throw apiError({ status: 404, statusText: 'Not Found', code: 'CHECKOUT_NOT_FOUND', message: 'Checkout not found.' })
  }

  const localizedEvent = checkout.event
    ? await eventService.getLocalizedById(checkout.event.id, query.locale)
    : undefined
  const localizedItems = await eventService.localizeOrderItemsForLocale(checkout.items, query.locale)
  const response: Awaited<ReturnType<typeof checkoutService.getCheckoutByPublicId>> = {
    ...checkout,
    items: localizedItems,
    event: localizedEvent ?? checkout.event,
  }
  return success(response)
})
