export enum DeviceType {
  Mobile = 'mobile',
  Tablet = 'tablet',
  Desktop = 'desktop',
}

/**
 * Time in seconds
 */
export enum CACHE_TTL {
  ONE_HOUR = 3600,
  ONE_DAY = 86400,
  ONE_WEEK = 604800,
  ONE_YEAR = 31536000,
}

export enum EventStatus {
  Draft = 'draft',
  Published = 'published',
  OnSale = 'on_sale',
  SoldOut = 'sold_out',
  Ended = 'ended',
  Cancelled = 'cancelled',
}

export enum EventDraftAutosaveStatus {
  Active = 'active',
  Converted = 'converted',
  Discarded = 'discarded',
}

export enum SeatStatus {
  Available = 'available',
  Locked = 'locked',
  Sold = 'sold',
  Unavailable = 'unavailable',
}

export enum HoldStatus {
  Active = 'active',
  Expired = 'expired',
  Converted = 'converted',
  Released = 'released',
}

export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

export enum OrderPaymentMethod {
  Visa = 'visa',
  Mastercard = 'mastercard',
  Paypal = 'paypal',
  Bank = 'bank',
}

export enum TicketStatus {
  Issued = 'issued',
  CheckedIn = 'checked_in',
  Cancelled = 'cancelled',
}

export enum QueueStatus {
  Waiting = 'waiting',
  Admitted = 'admitted',
  Expired = 'expired',
  Completed = 'completed',
}

export enum TicketHolderSource {
  Account = 'account',
  SavedAttendee = 'saved-attendee',
  Manual = 'manual',
}

export enum PricingMode {
  Uniform = 'uniform',
  Section = 'section',
}

export enum SeatLayoutMode {
  Automatic = 'automatic',
  Manual = 'manual',
}

export enum AgeBracket {
  EighteenToTwentyFour = '18-24',
  TwentyFiveToThirtyFour = '25-34',
  ThirtyFiveToFortyFour = '35-44',
  FortyFivePlus = '45+',
}

export enum SeatPricingSource {
  Section = 'section',
  SeatOverride = 'seat_override',
  HoldSnapshot = 'hold_snapshot',
}

export enum AuthTokenType {
  EmailVerification = 'email_verification',
  PasswordReset = 'password_reset',
}

export enum SavedAttendeeGender {
  Female = 'female',
  Male = 'male',
  NonBinary = 'non-binary',
  PreferNotToSay = 'prefer-not-to-say',
}

export enum EventCatalogStatusFilter {
  All = 'all',
  Published = 'published',
  OnSale = 'on_sale',
  SoldOut = 'sold_out',
  Ended = 'ended',
}

export enum EventCatalogDateFilter {
  All = 'all',
  Today = 'today',
  Week = 'week',
  Month = 'month',
}

export enum EventCatalogSort {
  Soonest = 'soonest',
  Newest = 'newest',
  EndingSoon = 'ending_soon',
}

export enum AdminAnalyticsTimeRange {
  Last24Hours = 'last_24h',
  Last3Days = 'last_3d',
  Last7Days = 'last_7d',
  Last30Days = 'last_30d',
}
