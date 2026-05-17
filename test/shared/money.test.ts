import { describe, expect, it } from 'vitest'
import { convertMoneyCents, formatMoney, getDisplayCurrency } from '@/lib/money'

describe('money display utilities', () => {
  it('keeps VND as the fallback display currency', () => {
    expect(getDisplayCurrency(null)).toBe('VND')
    expect(getDisplayCurrency('EUR')).toBe('VND')
  })

  it('converts VND cents to USD display amounts', () => {
    expect(convertMoneyCents(50000000, 'VND', 'USD')).toBeCloseTo(500000 / 26355)
  })

  it('converts USD cents to VND display amounts', () => {
    expect(convertMoneyCents(2000, 'USD', 'VND')).toBe(527100)
  })

  it('formats money in the requested display currency', () => {
    expect(formatMoney(50000000, 'VND', 'USD', 'en-US')).toBe('$18.97')
    expect(formatMoney(2000, 'USD', 'VND', 'vi-VN')).toBe('527.100 ₫')
  })

  it('uses full Vietnamese compact currency units', () => {
    expect(formatMoney(241500000000, 'VND', 'VND', 'vi-VN', {
      notation: 'compact',
      maximumFractionDigits: 1,
    })).toBe('2,4 tỉ ₫')
    expect(formatMoney(241500000, 'VND', 'VND', 'vi-VN', {
      notation: 'compact',
      maximumFractionDigits: 1,
    })).toBe('2,4 triệu ₫')
  })
})
