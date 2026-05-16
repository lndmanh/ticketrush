export function getWaitingRoomRemainingSeconds(estimatedWaitSeconds: number, stateReceivedAt: number, currentAt: number) {
  if (estimatedWaitSeconds <= 0) {
    return 0
  }

  const elapsedSeconds = Math.floor(Math.max(currentAt - stateReceivedAt, 0) / 1000)
  return Math.max(estimatedWaitSeconds - elapsedSeconds, 0)
}

export function formatWaitingRoomDuration(totalSeconds: number) {
  const safeSeconds = Math.max(Math.floor(totalSeconds), 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
