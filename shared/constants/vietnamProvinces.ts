import type { Locale } from '../../i18n-constants'

export interface VietnamProvinceName {
  vi: string
  en: string
}

export const VIETNAM_PROVINCES = {
  hanoi: { vi: 'Hà Nội', en: 'Hanoi' },
  cao_bang: { vi: 'Cao Bằng', en: 'Cao Bang' },
  tuyen_quang: { vi: 'Tuyên Quang', en: 'Tuyen Quang' },
  dien_bien: { vi: 'Điện Biên', en: 'Dien Bien' },
  lai_chau: { vi: 'Lai Châu', en: 'Lai Chau' },
  son_la: { vi: 'Sơn La', en: 'Son La' },
  lao_cai: { vi: 'Lào Cai', en: 'Lao Cai' },
  thai_nguyen: { vi: 'Thái Nguyên', en: 'Thai Nguyen' },
  lang_son: { vi: 'Lạng Sơn', en: 'Lang Son' },
  quang_ninh: { vi: 'Quảng Ninh', en: 'Quang Ninh' },
  bac_ninh: { vi: 'Bắc Ninh', en: 'Bac Ninh' },
  phu_tho: { vi: 'Phú Thọ', en: 'Phu Tho' },
  haiphong: { vi: 'Hải Phòng', en: 'Hai Phong' },
  hung_yen: { vi: 'Hưng Yên', en: 'Hung Yen' },
  ninh_binh: { vi: 'Ninh Bình', en: 'Ninh Binh' },
  thanh_hoa: { vi: 'Thanh Hóa', en: 'Thanh Hoa' },
  nghe_an: { vi: 'Nghệ An', en: 'Nghe An' },
  ha_tinh: { vi: 'Hà Tĩnh', en: 'Ha Tinh' },
  quang_tri: { vi: 'Quảng Trị', en: 'Quang Tri' },
  hue: { vi: 'Huế', en: 'Hue' },
  danang: { vi: 'Đà Nẵng', en: 'Da Nang' },
  quang_ngai: { vi: 'Quảng Ngãi', en: 'Quang Ngai' },
  gia_lai: { vi: 'Gia Lai', en: 'Gia Lai' },
  khanh_hoa: { vi: 'Khánh Hòa', en: 'Khanh Hoa' },
  daklak: { vi: 'Đắk Lắk', en: 'Dak Lak' },
  lam_dong: { vi: 'Lâm Đồng', en: 'Lam Dong' },
  dong_nai: { vi: 'Đồng Nai', en: 'Dong Nai' },
  ho_chi_minh_city: { vi: 'Hồ Chí Minh', en: 'Ho Chi Minh' },
  tay_ninh: { vi: 'Tây Ninh', en: 'Tay Ninh' },
  dong_thap: { vi: 'Đồng Tháp', en: 'Dong Thap' },
  vinh_long: { vi: 'Vĩnh Long', en: 'Vinh Long' },
  an_giang: { vi: 'An Giang', en: 'An Giang' },
  cantho: { vi: 'Cần Thơ', en: 'Can Tho' },
  ca_mau: { vi: 'Cà Mau', en: 'Ca Mau' },
} satisfies Record<string, VietnamProvinceName>

export type VietnamProvinceKey = keyof typeof VIETNAM_PROVINCES

export const VIETNAM_PROVINCE_KEYS = [
  'an_giang',
  'bac_ninh',
  'ca_mau',
  'cantho',
  'cao_bang',
  'danang',
  'daklak',
  'dien_bien',
  'dong_nai',
  'dong_thap',
  'gia_lai',
  'ha_tinh',
  'hanoi',
  'haiphong',
  'ho_chi_minh_city',
  'hue',
  'hung_yen',
  'khanh_hoa',
  'lai_chau',
  'lam_dong',
  'lang_son',
  'lao_cai',
  'nghe_an',
  'ninh_binh',
  'phu_tho',
  'quang_ngai',
  'quang_ninh',
  'quang_tri',
  'son_la',
  'tay_ninh',
  'thai_nguyen',
  'thanh_hoa',
  'tuyen_quang',
  'vinh_long',
] satisfies VietnamProvinceKey[]

export const VIETNAM_PROVINCE_OPTIONS = VIETNAM_PROVINCE_KEYS.map(value => ({
  value,
  label: VIETNAM_PROVINCES[value],
}))

const VIETNAM_PROVINCE_ALIASES: Record<string, VietnamProvinceKey> = {
  hanoi: 'hanoi',
  'ha noi': 'hanoi',
  'thanh pho ha noi': 'hanoi',
  'cao bang': 'cao_bang',
  'tinh cao bang': 'cao_bang',
  'tuyen quang': 'tuyen_quang',
  'tinh tuyen quang': 'tuyen_quang',
  'dien bien': 'dien_bien',
  'tinh dien bien': 'dien_bien',
  'lai chau': 'lai_chau',
  'tinh lai chau': 'lai_chau',
  'son la': 'son_la',
  'tinh son la': 'son_la',
  'lao cai': 'lao_cai',
  'tinh lao cai': 'lao_cai',
  'thai nguyen': 'thai_nguyen',
  'tinh thai nguyen': 'thai_nguyen',
  'lang son': 'lang_son',
  'tinh lang son': 'lang_son',
  'quang ninh': 'quang_ninh',
  'tinh quang ninh': 'quang_ninh',
  'bac ninh': 'bac_ninh',
  'tinh bac ninh': 'bac_ninh',
  'phu tho': 'phu_tho',
  'tinh phu tho': 'phu_tho',
  haiphong: 'haiphong',
  'hai phong': 'haiphong',
  'thanh pho hai phong': 'haiphong',
  'hung yen': 'hung_yen',
  'tinh hung yen': 'hung_yen',
  'ninh binh': 'ninh_binh',
  'tinh ninh binh': 'ninh_binh',
  'thanh hoa': 'thanh_hoa',
  'tinh thanh hoa': 'thanh_hoa',
  'nghe an': 'nghe_an',
  'tinh nghe an': 'nghe_an',
  'ha tinh': 'ha_tinh',
  'tinh ha tinh': 'ha_tinh',
  'quang tri': 'quang_tri',
  'tinh quang tri': 'quang_tri',
  hue: 'hue',
  'thanh pho hue': 'hue',
  danang: 'danang',
  'da nang': 'danang',
  'thanh pho da nang': 'danang',
  'quang ngai': 'quang_ngai',
  'tinh quang ngai': 'quang_ngai',
  'gia lai': 'gia_lai',
  'tinh gia lai': 'gia_lai',
  'khanh hoa': 'khanh_hoa',
  'tinh khanh hoa': 'khanh_hoa',
  daklak: 'daklak',
  'dak lak': 'daklak',
  'tinh dak lak': 'daklak',
  'lam dong': 'lam_dong',
  'tinh lam dong': 'lam_dong',
  'dong nai': 'dong_nai',
  'tinh dong nai': 'dong_nai',
  hcm: 'ho_chi_minh_city',
  tphcm: 'ho_chi_minh_city',
  'ho chi minh': 'ho_chi_minh_city',
  'ho chi minh city': 'ho_chi_minh_city',
  'thanh pho ho chi minh': 'ho_chi_minh_city',
  'tay ninh': 'tay_ninh',
  'tinh tay ninh': 'tay_ninh',
  'dong thap': 'dong_thap',
  'tinh dong thap': 'dong_thap',
  'vinh long': 'vinh_long',
  'tinh vinh long': 'vinh_long',
  'an giang': 'an_giang',
  'tinh an giang': 'an_giang',
  cantho: 'cantho',
  'can tho': 'cantho',
  'thanh pho can tho': 'cantho',
  'ca mau': 'ca_mau',
  'tinh ca mau': 'ca_mau',
}

function normalizeProvinceSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function isVietnamProvinceKey(value: string): value is VietnamProvinceKey {
  return value in VIETNAM_PROVINCES
}

export function normalizeVietnamProvinceKey(value: string | null | undefined): VietnamProvinceKey | null {
  if (!value) {
    return null
  }

  if (isVietnamProvinceKey(value)) {
    return value
  }

  return VIETNAM_PROVINCE_ALIASES[normalizeProvinceSearchValue(value)] ?? null
}

export function getVietnamProvinceName(value: string | null | undefined, locale: Locale | string): string {
  const provinceKey = normalizeVietnamProvinceKey(value)
  if (!provinceKey) {
    return value?.trim() ?? ''
  }

  return locale === 'en' ? VIETNAM_PROVINCES[provinceKey].en : VIETNAM_PROVINCES[provinceKey].vi
}
