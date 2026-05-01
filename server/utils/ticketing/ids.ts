function compactId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().split('-').join('')}`
}

export function createPublicVenueId() {
  return compactId('ven')
}

export function createPublicEventId() {
  return compactId('evt')
}

export function createPublicEventSessionId() {
  return compactId('ses')
}

export function createPublicHoldId() {
  return compactId('hold')
}

export function createPublicOrderId() {
  return compactId('ord')
}

export function createPublicTicketId() {
  return compactId('tkt')
}

export function createQueuePassToken() {
  return compactId('pass')
}

export function createQrToken(ticketPublicId: string) {
  return `${ticketPublicId}.${crypto.randomUUID().split('-').join('')}`
}
