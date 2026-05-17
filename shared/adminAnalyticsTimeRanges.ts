import { AdminAnalyticsTimeRange } from '#shared/commonEnums'
import { timeRangeDurations } from '#shared/timeRangeDurations'

export const DEFAULT_ADMIN_ANALYTICS_TIME_RANGE = AdminAnalyticsTimeRange.Last7Days

export interface AdminAnalyticsTimeRangeOption {
  value: AdminAnalyticsTimeRange
}

export const adminAnalyticsTimeRangeOptions: AdminAnalyticsTimeRangeOption[] = [
  { value: AdminAnalyticsTimeRange.Last24Hours },
  { value: AdminAnalyticsTimeRange.Last3Days },
  { value: AdminAnalyticsTimeRange.Last7Days },
  { value: AdminAnalyticsTimeRange.Last30Days },
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
