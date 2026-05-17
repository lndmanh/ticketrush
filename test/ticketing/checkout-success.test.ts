import { describe, expect, it } from 'vitest'
import { OrderStatus } from '#shared/commonEnums'
import {
  getCheckoutEventPath,
  getCheckoutRoutePath,
  getCheckoutSuccessPath,
  getCheckoutSuccessRouteState,
  getCheckoutTicketCount,
} from '@/utils/checkoutSuccess'

describe('checkout success helpers', () => {
  it('builds checkout and success paths from the public order id', () => {
    expect(getCheckoutRoutePath('ord_123')).toBe('/checkout/ord_123')
    expect(getCheckoutSuccessPath('ord_123')).toBe('/checkout/ord_123/success')
  })

  it('encodes route params before building checkout paths', () => {
    expect(getCheckoutSuccessPath('order with space')).toBe('/checkout/order%20with%20space/success')
  })

  it('selects the correct route state from order status', () => {
    expect(getCheckoutSuccessRouteState(OrderStatus.Confirmed)).toBe('confirmed')
    expect(getCheckoutSuccessRouteState(OrderStatus.Pending)).toBe('checkout')
    expect(getCheckoutSuccessRouteState(OrderStatus.Cancelled)).toBe('cancelled')
    expect(getCheckoutSuccessRouteState(OrderStatus.Expired)).toBe('cancelled')
    expect(getCheckoutSuccessRouteState(undefined)).toBe('checkout')
  })

  it('uses issued tickets for the summary count and falls back to order items', () => {
    expect(getCheckoutTicketCount(3, 5)).toBe(3)
    expect(getCheckoutTicketCount(0, 5)).toBe(5)
  })

  it('links back to the event when a slug exists and events otherwise', () => {
    expect(getCheckoutEventPath('opera-night')).toBe('/events/opera-night')
    expect(getCheckoutEventPath(null)).toBe('/events')
    expect(getCheckoutEventPath('')).toBe('/events')
  })
})
