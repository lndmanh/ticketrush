type OAuthPopupCompleteMessage = {
  type: 'oauth:complete'
  url: string
}

export default defineNuxtPlugin(() => {
  if (!window.opener || !window.name.startsWith('oauth-')) {
    return
  }

  const payload: OAuthPopupCompleteMessage = {
    type: 'oauth:complete',
    url: window.location.href,
  }

  try {
    window.opener.postMessage(payload, window.location.origin)
  }
  catch {
    return
  }

  window.close()
})
