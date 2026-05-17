export interface VenuePickerOption {
  id: number
  name: string
  city: string
  country: string
  address: string
  capacity: number
}

export function filterVenuePickerOptions(venues: readonly VenuePickerOption[], search: string) {
  const searchTerm = search.trim().toLocaleLowerCase()

  if (!searchTerm) {
    return venues
  }

  return venues.filter(venue => [
    venue.name,
    venue.city,
    venue.country,
    venue.address,
  ].some(value => value.toLocaleLowerCase().includes(searchTerm)))
}

export function getVenuePageCount(totalItems: number, pageSize: number) {
  if (pageSize < 1) {
    return 1
  }

  return Math.max(Math.ceil(totalItems / pageSize), 1)
}

export function getVenuePageItems<T>(items: readonly T[], page: number, pageSize: number) {
  if (pageSize < 1) {
    return []
  }

  const pageCount = getVenuePageCount(items.length, pageSize)
  const currentPage = Math.min(Math.max(Math.trunc(page), 1), pageCount)
  const start = (currentPage - 1) * pageSize

  return items.slice(start, start + pageSize)
}
