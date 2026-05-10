type SupportedDisplayLocale = 'en' | 'vi'

interface LocalizedEventCopy {
  title: string
  subtitle: string
  description?: string
}

const viEventCopyBySlug: Record<string, LocalizedEventCopy> = {
  'sunset-beats-saigon-2026': {
    title: 'Nhịp Hoàng Hôn Sài Gòn 2026',
    subtitle: 'Đêm nhạc điện tử ngoài trời bên sông',
    description: 'Showcase nhạc điện tử với DJ khu vực, visual sống động và khung cảnh thành phố lúc hoàng hôn.',
  },
  'indie-lights-festival-ho-chi-minh': {
    title: 'Lễ Hội Ánh Sáng Indie',
    subtitle: 'Hai sân khấu cùng các nghệ sĩ indie đang lên',
    description: 'Lễ hội indie được tuyển chọn với các màn trình diễn pha trộn thể loại và khu ẩm thực tương tác.',
  },
  'city-jazz-under-stars': {
    title: 'Jazz Thành Phố Dưới Sao',
    subtitle: 'Đêm jazz đương đại với nền trời thành phố',
    description: 'Trải nghiệm jazz ngồi ghế cao cấp với nghệ sĩ tuyển chọn, cocktail theo chủ đề và ánh sáng ambient.',
  },
}

const viEventTitleByTitle: Record<string, string> = {
  'Sunset Beats Saigon 2026': viEventCopyBySlug['sunset-beats-saigon-2026'].title,
  'Indie Lights Festival Ho Chi Minh': viEventCopyBySlug['indie-lights-festival-ho-chi-minh'].title,
  'City Jazz Under Stars': viEventCopyBySlug['city-jazz-under-stars'].title,
}

const viVenueNameByName: Record<string, string> = {
  'Saigon River Stage': 'Sân khấu Bờ sông Sài Gòn',
}

const viCityByName: Record<string, string> = {
  'Ho Chi Minh City': 'TP. Hồ Chí Minh',
}

const viTicketTypeByName: Record<string, string> = {
  'General Admission': 'Vé thường',
  'VIP Pass': 'Vé VIP',
}

function normalizeLocale(locale: string): SupportedDisplayLocale {
  return locale === 'vi' ? 'vi' : 'en'
}

export function getLocalizedEventDisplay<T extends { slug?: string, title: string, subtitle?: string | null, description?: string | null }>(event: T, locale: string) {
  const normalizedLocale = normalizeLocale(locale)
  if (normalizedLocale !== 'vi' || !event.slug) {
    return {
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
    }
  }

  const copy = viEventCopyBySlug[event.slug]
  if (!copy) {
    return {
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
    }
  }

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    description: copy.description ?? event.description,
  }
}

export function getLocalizedVenueName(name: string | null | undefined, locale: string) {
  if (!name) {
    return name
  }

  return normalizeLocale(locale) === 'vi' ? (viVenueNameByName[name] ?? name) : name
}

export function getLocalizedEventTitle(title: string | null | undefined, locale: string) {
  if (!title) {
    return title
  }

  return normalizeLocale(locale) === 'vi' ? (viEventTitleByTitle[title] ?? title) : title
}

export function getLocalizedCityName(name: string | null | undefined, locale: string) {
  if (!name) {
    return name
  }

  return normalizeLocale(locale) === 'vi' ? (viCityByName[name] ?? name) : name
}

export function getDisplayDateLocale(locale: string) {
  return normalizeLocale(locale) === 'vi' ? 'vi-VN' : 'en-US'
}

export function getLocalizedTicketTypeName(name: string | null | undefined, locale: string) {
  if (!name) {
    return name
  }

  return normalizeLocale(locale) === 'vi' ? (viTicketTypeByName[name] ?? name) : name
}
