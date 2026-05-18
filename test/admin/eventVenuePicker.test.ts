import { describe, expect, it } from 'vitest'
import { filterVenuePickerOptions, getVenuePageCount, getVenuePageItems } from '../../app/lib/venuePicker'

const venues = [
  {
    id: 1,
    name: 'Saigon Opera House',
    city: 'Ho Chi Minh City',
    country: 'Vietnam',
    address: '7 Lam Son Square',
    capacity: 560,
  },
  {
    id: 2,
    name: 'Hanoi Creative Hall',
    city: 'Hanoi',
    country: 'Vietnam',
    address: '42 Trang Tien',
    capacity: 1200,
  },
  {
    id: 3,
    name: 'Da Nang Arena',
    city: 'Da Nang',
    country: 'Vietnam',
    address: '15 Bach Dang',
    capacity: 2400,
  },
]

describe('event venue picker helpers', () => {
  it('filters venues by name, city, country, or address without case sensitivity', () => {
    expect(filterVenuePickerOptions(venues, 'opera')).toEqual([venues[0]])
    expect(filterVenuePickerOptions(venues, 'hanoi')).toEqual([venues[1]])
    expect(filterVenuePickerOptions(venues, 'bach dang')).toEqual([venues[2]])
    expect(filterVenuePickerOptions(venues, 'vietnam')).toEqual(venues)
    expect(filterVenuePickerOptions(venues, '')).toEqual(venues)
  })

  it('calculates venue pages and clamps out-of-range page requests', () => {
    expect(getVenuePageCount(0, 6)).toBe(1)
    expect(getVenuePageCount(venues.length, 2)).toBe(2)
    expect(getVenuePageItems(venues, 0, 2)).toEqual(venues.slice(0, 2))
    expect(getVenuePageItems(venues, 2, 2)).toEqual(venues.slice(2, 3))
    expect(getVenuePageItems(venues, 99, 2)).toEqual(venues.slice(2, 3))
  })
})
