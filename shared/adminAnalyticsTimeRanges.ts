import { AdminAnalyticsTimeRange } from '#shared/commonEnums'

export const DEFAULT_ADMIN_ANALYTICS_TIME_RANGE = AdminAnalyticsTimeRange.Last7Days

export interface AdminAnalyticsTimeRangeOption {
  value: AdminAnalyticsTimeRange
  label: string
}

export const adminAnalyticsTimeRangeOptions: AdminAnalyticsTimeRangeOption[] = [
  { value: AdminAnalyticsTimeRange.Last24Hours, label: 'Last 24 hours' },
  { value: AdminAnalyticsTimeRange.Last3Days, label: 'Last 3 days' },
  { value: AdminAnalyticsTimeRange.Last7Days, label: 'Last 7 days' },
  { value: AdminAnalyticsTimeRange.Last30Days, label: 'Last 30 days' },
]

const adminAnalyticsTimeRangeDurations: Record<AdminAnalyticsTimeRange, number> = {
  [AdminAnalyticsTimeRange.Last24Hours]: 24 * 60 * 60 * 1000,
  [AdminAnalyticsTimeRange.Last3Days]: 3 * 24 * 60 * 60 * 1000,
  [AdminAnalyticsTimeRange.Last7Days]: 7 * 24 * 60 * 60 * 1000,
  [AdminAnalyticsTimeRange.Last30Days]: 30 * 24 * 60 * 60 * 1000,
}

export function getAdminAnalyticsRangeStart(range: AdminAnalyticsTimeRange, now = new Date()) {
  return new Date(now.getTime() - adminAnalyticsTimeRangeDurations[range])
}
