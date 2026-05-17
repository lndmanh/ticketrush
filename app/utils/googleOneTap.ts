export const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export interface GoogleCredentialResponse {
  credential: string
  select_by?: string
  state?: string
}

export interface GooglePromptMomentNotification {
  isDisplayed?: () => boolean
  isNotDisplayed?: () => boolean
  isSkippedMoment?: () => boolean
  isDismissedMoment?: () => boolean
  getNotDisplayedReason?: () => string
  getSkippedReason?: () => string
  getDismissedReason?: () => string
}

export interface GoogleAccountsIdInitializeOptions {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  use_fedcm_for_prompt?: boolean
}

export interface GoogleAccountsId {
  initialize(options: GoogleAccountsIdInitializeOptions): void
  prompt(momentListener?: (notification: GooglePromptMomentNotification) => void): void
  cancel(): void
  disableAutoSelect(): void
}

interface GoogleIdentityServices {
  accounts?: {
    id?: GoogleAccountsId
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

let googleIdentityScriptPromise: Promise<GoogleAccountsId | null> | null = null
const GOOGLE_IDENTITY_DISABLE_AUTO_SELECT_TIMEOUT_MS = 1500

export function getGoogleAccountsId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.google?.accounts?.id ?? null
}

function resolveGoogleAccountsId() {
  return getGoogleAccountsId()
}

function findGoogleIdentityScriptElement() {
  const script = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`)

  return script instanceof HTMLScriptElement ? script : null
}

function waitForGoogleIdentityScript(script: HTMLScriptElement) {
  return new Promise<void>((resolve) => {
    if (getGoogleAccountsId()) {
      resolve()
      return
    }

    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => resolve(), { once: true })
  })
}

function loadGoogleIdentityScriptElement() {
  const existingScript = findGoogleIdentityScriptElement()

  if (existingScript) {
    return waitForGoogleIdentityScript(existingScript)
  }

  const script = document.createElement('script')
  script.src = GOOGLE_IDENTITY_SCRIPT_SRC
  script.async = true
  script.defer = true

  const loadPromise = waitForGoogleIdentityScript(script)
  document.head.appendChild(script)

  return loadPromise
}

export function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = loadGoogleIdentityScriptElement().then(() => resolveGoogleAccountsId())
  }

  return googleIdentityScriptPromise
}

export function cancelGoogleOneTapPrompt() {
  getGoogleAccountsId()?.cancel()
}

function waitForGoogleIdentityDisableAutoSelectTimeout() {
  return new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), GOOGLE_IDENTITY_DISABLE_AUTO_SELECT_TIMEOUT_MS)
  })
}

export async function disableGoogleOneTapAutoSelect() {
  if (typeof window === 'undefined') {
    return
  }

  await Promise.race([
    loadGoogleIdentityScript(),
    waitForGoogleIdentityDisableAutoSelectTimeout(),
  ])

  getGoogleAccountsId()?.disableAutoSelect()
}
