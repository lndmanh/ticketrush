import { OrderStatus } from '#shared/commonEnums'

export type CheckoutSuccessRouteState = 'confirmed' | 'checkout' | 'cancelled'

export function getCheckoutRoutePath(orderId: string) {
  return `/checkout/${encodeURIComponent(orderId)}`
}

export function getCheckoutSuccessPath(orderId: string) {
  return `${getCheckoutRoutePath(orderId)}/success`
}

export function getCheckoutSuccessRouteState(status: OrderStatus | null | undefined): CheckoutSuccessRouteState {
  if (status === OrderStatus.Confirmed) {
    return 'confirmed'
  }

  if (status === OrderStatus.Cancelled || status === OrderStatus.Expired) {
    return 'cancelled'
  }

  return 'checkout'
}

export function getCheckoutTicketCount(ticketCount: number, itemCount: number) {
  return ticketCount > 0 ? ticketCount : itemCount
}

export function getCheckoutEventPath(slug: string | null | undefined) {
  return slug && slug.length > 0 ? `/events/${slug}` : '/events'
}
