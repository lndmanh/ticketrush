import type { Locale } from '~~/i18n-constants'

export interface LocalizedLocationLabels {
  vi: string
  en: string
}

export interface LocationOption {
  value: string
  labels: LocalizedLocationLabels
}

export const VIETNAM_COUNTRY_VALUE = 'Vietnam'

export const VIETNAM_COUNTRY_OPTION: LocationOption = {
  value: VIETNAM_COUNTRY_VALUE,
  labels: {
    vi: 'Việt Nam',
    en: 'Vietnam',
  },
}

export const COUNTRY_OPTIONS: readonly LocationOption[] = [VIETNAM_COUNTRY_OPTION]

export const VIETNAM_PROVINCE_CITY_OPTIONS = [
  { value: 'An Giang', labels: { vi: 'An Giang', en: 'An Giang' } },
  { value: 'Ba Ria - Vung Tau', labels: { vi: 'Bà Rịa - Vũng Tàu', en: 'Ba Ria - Vung Tau' } },
  { value: 'Bac Giang', labels: { vi: 'Bắc Giang', en: 'Bac Giang' } },
  { value: 'Bac Kan', labels: { vi: 'Bắc Kạn', en: 'Bac Kan' } },
  { value: 'Bac Lieu', labels: { vi: 'Bạc Liêu', en: 'Bac Lieu' } },
  { value: 'Bac Ninh', labels: { vi: 'Bắc Ninh', en: 'Bac Ninh' } },
  { value: 'Ben Tre', labels: { vi: 'Bến Tre', en: 'Ben Tre' } },
  { value: 'Binh Dinh', labels: { vi: 'Bình Định', en: 'Binh Dinh' } },
  { value: 'Binh Duong', labels: { vi: 'Bình Dương', en: 'Binh Duong' } },
  { value: 'Binh Phuoc', labels: { vi: 'Bình Phước', en: 'Binh Phuoc' } },
  { value: 'Binh Thuan', labels: { vi: 'Bình Thuận', en: 'Binh Thuan' } },
  { value: 'Ca Mau', labels: { vi: 'Cà Mau', en: 'Ca Mau' } },
  { value: 'Can Tho', labels: { vi: 'Cần Thơ', en: 'Can Tho' } },
  { value: 'Cao Bang', labels: { vi: 'Cao Bằng', en: 'Cao Bang' } },
  { value: 'Da Nang', labels: { vi: 'Đà Nẵng', en: 'Da Nang' } },
  { value: 'Dak Lak', labels: { vi: 'Đắk Lắk', en: 'Dak Lak' } },
  { value: 'Dak Nong', labels: { vi: 'Đắk Nông', en: 'Dak Nong' } },
  { value: 'Dien Bien', labels: { vi: 'Điện Biên', en: 'Dien Bien' } },
  { value: 'Dong Nai', labels: { vi: 'Đồng Nai', en: 'Dong Nai' } },
  { value: 'Dong Thap', labels: { vi: 'Đồng Tháp', en: 'Dong Thap' } },
  { value: 'Gia Lai', labels: { vi: 'Gia Lai', en: 'Gia Lai' } },
  { value: 'Ha Giang', labels: { vi: 'Hà Giang', en: 'Ha Giang' } },
  { value: 'Ha Nam', labels: { vi: 'Hà Nam', en: 'Ha Nam' } },
  { value: 'Ha Noi', labels: { vi: 'Hà Nội', en: 'Ha Noi' } },
  { value: 'Ha Tinh', labels: { vi: 'Hà Tĩnh', en: 'Ha Tinh' } },
  { value: 'Hai Duong', labels: { vi: 'Hải Dương', en: 'Hai Duong' } },
  { value: 'Hai Phong', labels: { vi: 'Hải Phòng', en: 'Hai Phong' } },
  { value: 'Hau Giang', labels: { vi: 'Hậu Giang', en: 'Hau Giang' } },
  { value: 'Ho Chi Minh City', labels: { vi: 'Thành phố Hồ Chí Minh', en: 'Ho Chi Minh City' } },
  { value: 'Hoa Binh', labels: { vi: 'Hòa Bình', en: 'Hoa Binh' } },
  { value: 'Hung Yen', labels: { vi: 'Hưng Yên', en: 'Hung Yen' } },
  { value: 'Khanh Hoa', labels: { vi: 'Khánh Hòa', en: 'Khanh Hoa' } },
  { value: 'Kien Giang', labels: { vi: 'Kiên Giang', en: 'Kien Giang' } },
  { value: 'Kon Tum', labels: { vi: 'Kon Tum', en: 'Kon Tum' } },
  { value: 'Lai Chau', labels: { vi: 'Lai Châu', en: 'Lai Chau' } },
  { value: 'Lam Dong', labels: { vi: 'Lâm Đồng', en: 'Lam Dong' } },
  { value: 'Lang Son', labels: { vi: 'Lạng Sơn', en: 'Lang Son' } },
  { value: 'Lao Cai', labels: { vi: 'Lào Cai', en: 'Lao Cai' } },
  { value: 'Long An', labels: { vi: 'Long An', en: 'Long An' } },
  { value: 'Nam Dinh', labels: { vi: 'Nam Định', en: 'Nam Dinh' } },
  { value: 'Nghe An', labels: { vi: 'Nghệ An', en: 'Nghe An' } },
  { value: 'Ninh Binh', labels: { vi: 'Ninh Bình', en: 'Ninh Binh' } },
  { value: 'Ninh Thuan', labels: { vi: 'Ninh Thuận', en: 'Ninh Thuan' } },
  { value: 'Phu Tho', labels: { vi: 'Phú Thọ', en: 'Phu Tho' } },
  { value: 'Phu Yen', labels: { vi: 'Phú Yên', en: 'Phu Yen' } },
  { value: 'Quang Binh', labels: { vi: 'Quảng Bình', en: 'Quang Binh' } },
  { value: 'Quang Nam', labels: { vi: 'Quảng Nam', en: 'Quang Nam' } },
  { value: 'Quang Ngai', labels: { vi: 'Quảng Ngãi', en: 'Quang Ngai' } },
  { value: 'Quang Ninh', labels: { vi: 'Quảng Ninh', en: 'Quang Ninh' } },
  { value: 'Quang Tri', labels: { vi: 'Quảng Trị', en: 'Quang Tri' } },
  { value: 'Soc Trang', labels: { vi: 'Sóc Trăng', en: 'Soc Trang' } },
  { value: 'Son La', labels: { vi: 'Sơn La', en: 'Son La' } },
  { value: 'Tay Ninh', labels: { vi: 'Tây Ninh', en: 'Tay Ninh' } },
  { value: 'Thai Binh', labels: { vi: 'Thái Bình', en: 'Thai Binh' } },
  { value: 'Thai Nguyen', labels: { vi: 'Thái Nguyên', en: 'Thai Nguyen' } },
  { value: 'Thanh Hoa', labels: { vi: 'Thanh Hóa', en: 'Thanh Hoa' } },
  { value: 'Thua Thien Hue', labels: { vi: 'Thừa Thiên Huế', en: 'Thua Thien Hue' } },
  { value: 'Tien Giang', labels: { vi: 'Tiền Giang', en: 'Tien Giang' } },
  { value: 'Tra Vinh', labels: { vi: 'Trà Vinh', en: 'Tra Vinh' } },
  { value: 'Tuyen Quang', labels: { vi: 'Tuyên Quang', en: 'Tuyen Quang' } },
  { value: 'Vinh Long', labels: { vi: 'Vĩnh Long', en: 'Vinh Long' } },
  { value: 'Vinh Phuc', labels: { vi: 'Vĩnh Phúc', en: 'Vinh Phuc' } },
  { value: 'Yen Bai', labels: { vi: 'Yên Bái', en: 'Yen Bai' } },
]

export function getLocationOptionLabel(option: LocationOption, locale: Locale): string {
  return option.labels[locale]
}

export function getVietnamProvinceCityOptions(locale: Locale): Array<{ label: string, value: string }> {
  return VIETNAM_PROVINCE_CITY_OPTIONS.map(option => ({
    label: getLocationOptionLabel(option, locale),
    value: option.value,
  }))
}

export function getCountryOptions(locale: Locale): Array<{ label: string, value: string }> {
  return COUNTRY_OPTIONS.map(option => ({
    label: getLocationOptionLabel(option, locale),
    value: option.value,
  }))
}

export function getLocationLabelByValue(options: readonly LocationOption[], value: string, locale: Locale): string {
  return options.find(option => option.value === value)?.labels[locale] ?? value
}
