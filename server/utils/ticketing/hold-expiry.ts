import { HoldStatus } from '#shared/commonEnums'

export interface HoldExpiryScope {
  eventSessionId?: number
  holdPublicId?: string
  sessionKey?: string
}

export interface HoldExpiryCandidate {
  publicId: string
  eventSessionId: number | null
  sessionKey: string
  status: HoldStatus
  expiresAt: Date
}

export function isExpiredActiveHold(hold: HoldExpiryCandidate, now: Date, scope: HoldExpiryScope = {}) {
  if (hold.status !== HoldStatus.Active) {
    return false
  }

  if (hold.expiresAt.getTime() > now.getTime()) {
    return false
  }

  if (scope.eventSessionId !== undefined && hold.eventSessionId !== scope.eventSessionId) {
    return false
  }

  if (scope.holdPublicId !== undefined && hold.publicId !== scope.holdPublicId) {
    return false
  }

  if (scope.sessionKey !== undefined && hold.sessionKey !== scope.sessionKey) {
    return false
  }

  return true
}
