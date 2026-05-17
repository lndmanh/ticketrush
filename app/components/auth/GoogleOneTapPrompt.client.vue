<template>
</template>

<script setup lang="ts">
import { apiRoutes } from '#shared/apiRoutes'
import type { ApiResponse } from '~~/types/api'
import type { GoogleOneTapPayload } from '~~/types/auth'
import { apiRequest } from '@/utils/apiRequest'
import { cancelGoogleOneTapPrompt, loadGoogleIdentityScript, type GoogleCredentialResponse } from '@/utils/googleOneTap'

const { loggedIn, fetch: refreshSession } = useUserSession()
const { public: publicConfig } = useRuntimeConfig()

const googleClientId = computed(() => {
  const clientId = publicConfig.googleOneTapClientId
  return typeof clientId === 'string' ? clientId.trim() : ''
})

let promptStarted = false
let isCancelling = false

function stopPrompt() {
  if (isCancelling) return
  isCancelling = true
  cancelGoogleOneTapPrompt()
  isCancelling = false
}

async function submitCredential(response: GoogleCredentialResponse) {
  try {
    const result = await apiRequest<ApiResponse<GoogleOneTapPayload>>(apiRoutes.AUTH_GOOGLE_ONE_TAP, {
      method: 'POST',
      body: {
        credential: response.credential,
      },
    })

    if (result.success) {
      await refreshSession()
      return
    }
  }
  catch {
    // ignore
  }

  stopPrompt()
}

async function startPrompt() {
  if (promptStarted || loggedIn.value || !googleClientId.value) {
    if (loggedIn.value) {
      stopPrompt()
    }
    return
  }

  promptStarted = true

  const accountsId = await loadGoogleIdentityScript()
  if (!accountsId || loggedIn.value || !googleClientId.value) {
    promptStarted = false
    return
  }

  accountsId.initialize({
    client_id: googleClientId.value,
    callback: submitCredential,
    auto_select: true,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,
  })

  accountsId.prompt()
}

watch(loggedIn, (value) => {
  if (value) {
    stopPrompt()
    return
  }

  promptStarted = false
  void startPrompt()
}, { immediate: true })

onBeforeUnmount(() => {
  stopPrompt()
})
</script>
