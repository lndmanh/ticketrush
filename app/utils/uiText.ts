export const uiFallbackText: Record<string, string> = {
  'nav.home': 'Trang chủ',
  'nav.quick_search': 'Tìm kiếm nhanh',
  'nav.open_breadcrumb': 'Mở đường dẫn breadcrumb',
  'nav.overview': 'Tổng quan',
  'nav.events': 'Sự kiện',
  'nav.dashboard': 'Bảng điều khiển',
  'nav.venues': 'Địa điểm',
  'nav.transactions': 'Giao dịch',
  'nav.users': 'Người dùng',
  'nav.system': 'Hệ thống',
  'nav.tasks': 'Tác vụ',
  'nav.waiting_room': 'Phòng chờ',
  'nav.feature_flags': 'Cờ tính năng',
  'common.admin': 'Quản trị',
  'common.back': 'Quay lại',
  'common.optional': 'Tùy chọn',
  'common.edit': 'Chỉnh sửa',
  'admin.event_create.page_title': 'Tạo sự kiện',
  'admin.event_create.breadcrumb': 'Tạo sự kiện',
}

export function getUiFallbackText(key: string) {
  return uiFallbackText[key] ?? key
}
