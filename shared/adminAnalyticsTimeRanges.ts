import { AdminAnalyticsTimeRange } from '#shared/commonEnums'
import { timeRangeDurations } from '#shared/timeRangeDurations'

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
  [AdminAnalyticsTimeRange.Last24Hours]: timeRangeDurations.last24Hours,
  [AdminAnalyticsTimeRange.Last3Days]: timeRangeDurations.last3Days,
  [AdminAnalyticsTimeRange.Last7Days]: timeRangeDurations.last7Days,
  [AdminAnalyticsTimeRange.Last30Days]: timeRangeDurations.last30Days,
}

export function getAdminAnalyticsRangeStart(range: AdminAnalyticsTimeRange, now = new Date()) {
  return new Date(now.getTime() - adminAnalyticsTimeRangeDurations[range])
}
