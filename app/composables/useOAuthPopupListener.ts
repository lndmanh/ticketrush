import {
  OAUTH_POPUP_COMPLETE_CHANNEL,
  OAUTH_POPUP_COMPLETE_STORAGE_KEY,
  type OAuthPopupCompleteMessage,
} from '~~/types/auth'

function isOAuthPopupCompleteMessage(value: unknown): value is OAuthPopupCompleteMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  return 'type' in value
    && value.type === 'oauth:complete'
    && 'url' in value
    && typeof value.url === 'string'
}

function parseOAuthPopupCompleteMessage(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(value)
    return isOAuthPopupCompleteMessage(parsed) ? parsed : null
  }
  catch {
    return null
  }
}

export function useOAuthPopupListener(onComplete: (message: OAuthPopupCompleteMessage) => void) {
  let channel: BroadcastChannel | null = null

  function handleMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return
    if (!isOAuthPopupCompleteMessage(event.data)) return

    onComplete(event.data)
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== OAUTH_POPUP_COMPLETE_STORAGE_KEY) return

    const message = parseOAuthPopupCompleteMessage(event.newValue)
    if (!message) return

    onComplete(message)
  }

  function handleBroadcast(event: MessageEvent) {
    if (!isOAuthPopupCompleteMessage(event.data)) return

    onComplete(event.data)
  }

  function start() {
    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)

    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(OAUTH_POPUP_COMPLETE_CHANNEL)
      channel.addEventListener('message', handleBroadcast)
    }
  }

  function stop() {
    window.removeEventListener('message', handleMessage)
    window.removeEventListener('storage', handleStorage)
    channel?.removeEventListener('message', handleBroadcast)
    channel?.close()
    channel = null
  }

  return { start, stop }
}
