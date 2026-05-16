const EVENT_SESSION_GATE_FETCH_KEY_PREFIX = 'event-session-gate'
const EVENT_SESSION_SEATMAP_FETCH_KEY_PREFIX = 'event-session-seatmap'
const DEFAULT_GATE_PASS_KEY = 'default'

type ClearNuxtDataByPredicate = (predicate: (key: string) => boolean) => void

export function getEventSessionGateFetchKey(sessionPublicId: string, passToken?: string) {
  return `${EVENT_SESSION_GATE_FETCH_KEY_PREFIX}:${sessionPublicId}:${passToken ?? DEFAULT_GATE_PASS_KEY}`
}

export function getEventSessionSeatmapFetchKey(sessionPublicId: string, locale: string) {
  return `${EVENT_SESSION_SEATMAP_FETCH_KEY_PREFIX}:${sessionPublicId}:${locale}`
}

export function isEventSessionAccessFetchKey(key: string, sessionPublicId: string) {
  return key.startsWith(`${EVENT_SESSION_GATE_FETCH_KEY_PREFIX}:${sessionPublicId}:`)
    || key.startsWith(`${EVENT_SESSION_SEATMAP_FETCH_KEY_PREFIX}:${sessionPublicId}:`)
}

export function clearEventSessionAccessData(sessionPublicId: string, clearData: ClearNuxtDataByPredicate) {
  clearData(key => isEventSessionAccessFetchKey(key, sessionPublicId))
}
