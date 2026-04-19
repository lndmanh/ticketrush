<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Lock, Eye, EyeOff, Fingerprint } from '@lucide/vue'
import { getAuthErrorMessage } from '#shared/constants/authMessages'
import { AVAILABLE_PROVIDERS } from '#shared/constants/oauthProviders'
import { apiRoutes } from '#shared/apiRoutes'
import { Field as VeeField, useForm } from 'vee-validate'
import { loginSchema } from '#shared/schemas/userSchema'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import type { ApiResponse } from '~~/server/utils/apiResponse'

const formSchema = loginSchema.pick({ username: true, password: true })

const { authenticate } = useWebAuthn()
const route = useRoute()
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')
const turnstileToken = ref('')
const oauthLoadingProvider = ref<string | null>(null)
const oauthPopup = ref<Window | null>(null)
const oauthPopupTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const oauthPopupCloseMonitor = ref<ReturnType<typeof setInterval> | null>(null)

type OAuthPopupCompleteMessage = {
  type: 'oauth:complete'
  url: string
}

function getQueryString(value: string | string[] | null | undefined) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return ''
}

function stopOAuthPopupTimeout() {
  if (oauthPopupTimeout.value) {
    clearTimeout(oauthPopupTimeout.value)
    oauthPopupTimeout.value = null
  }
}

function stopOAuthPopupCloseMonitor() {
  if (oauthPopupCloseMonitor.value) {
    clearInterval(oauthPopupCloseMonitor.value)
    oauthPopupCloseMonitor.value = null
  }
}

function onOAuthPopupComplete(event: MessageEvent<OAuthPopupCompleteMessage>) {
  if (event.origin !== window.location.origin) return
  if (event.data?.type !== 'oauth:complete') return
  if (!oauthPopup.value || event.source !== oauthPopup.value) return

  stopOAuthPopupCloseMonitor()
  stopOAuthPopupTimeout()
  oauthPopup.value = null
  oauthLoadingProvider.value = null

  let target: URL
  try {
    target = new URL(event.data.url)
  }
  catch {
    error.value = 'Authentication completed but response URL was invalid. Please try again.'
    return
  }

  window.location.assign(`${target.pathname}${target.search}${target.hash}`)
}

const { handleSubmit, values } = useForm({
  initialValues: {
    username: '',
    password: '',
  },
  validationSchema: formSchema,
})

const onSubmit = handleSubmit(async () => {
  // Native form submission for server-side auth
  const formEl = document.querySelector('form[action="/api/auth/login-password"]') as HTMLFormElement
  if (formEl) formEl.submit()
})

const redirectTo = computed(() => getQueryString(route.query.redirectTo) || '/')

watch(() => route.query.error, (queryValue) => {
  const errorCode = getQueryString(queryValue)
  if (errorCode) {
    error.value = getAuthErrorMessage(errorCode) || 'An error occurred during login'
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('message', onOAuthPopupComplete)
})

async function signInWithPasskey() {
  if (!values.username?.trim()) {
    error.value = 'Username is required'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authenticate(values.username)
    window.location.href = redirectTo.value
  }
  catch (err) {
    createError({ statusCode: 401, statusMessage: 'Unauthorized. Passkey authentication failed. Please ensure your passkey is set up correctly.', data: err })
    error.value = 'Authentication failed. Please ensure your passkey is set up correctly, or sign in with your password.'
    isLoading.value = false
  }
}

async function signInWithProvider(provider: string) {
  if (oauthLoadingProvider.value) return

  oauthLoadingProvider.value = provider
  error.value = ''

  try {
    const response = await $fetch<ApiResponse<{ url: string }>>(apiRoutes.AUTH_OAUTH_URL, {
      method: 'POST',
      body: { provider, action: 'login' },
    })
    if (!response.success) {
      throw new Error(response.error.message)
    }

    const popupWidth = Math.min(560, window.outerWidth - 40)
    const popupHeight = Math.min(720, window.outerHeight - 80)
    const popupLeft = window.screenX + Math.max(0, (window.outerWidth - popupWidth) / 2)
    const popupTop = window.screenY + Math.max(0, (window.outerHeight - popupHeight) / 2)
    const popup = window.open(
      response.data.url,
      `oauth-${provider}`,
      `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop},location=0,resizable,scrollbars,toolbar=0,menubar=0,popup=true`,
    )

    if (!popup) {
      throw new Error('Popup blocked')
    }

    popup.focus()
    oauthPopup.value = popup
    stopOAuthPopupCloseMonitor()
    stopOAuthPopupTimeout()

    oauthPopupCloseMonitor.value = setInterval(() => {
      if (!oauthPopup.value) {
        stopOAuthPopupCloseMonitor()
        return
      }

      let isClosed = false
      try {
        isClosed = oauthPopup.value.closed
      }
      catch {
        return
      }

      if (!isClosed) {
        return
      }

      stopOAuthPopupCloseMonitor()
      stopOAuthPopupTimeout()
      oauthPopup.value = null
      oauthLoadingProvider.value = null
    }, 500)

    oauthPopupTimeout.value = setTimeout(() => {
      stopOAuthPopupCloseMonitor()
      stopOAuthPopupTimeout()
      oauthPopup.value = null
      oauthLoadingProvider.value = null
      error.value = 'OAuth session timed out or popup was closed. Please try again.'
    }, 120000)
  }
  catch {
    stopOAuthPopupCloseMonitor()
    stopOAuthPopupTimeout()
    oauthPopup.value = null
    error.value = 'Unable to continue with provider right now. Please try again.'
    oauthLoadingProvider.value = null
  }
}

onBeforeUnmount(() => {
  stopOAuthPopupCloseMonitor()
  stopOAuthPopupTimeout()
  window.removeEventListener('message', onOAuthPopupComplete)
})

definePageMeta({
  layout: 'empty',
  title: 'Login',
  breadcrumb: 'Login',
})
</script>

<template>
  <CenteredAppLayout title="Login">
    <Card class="w-full max-w-md mx-4">
      <CardHeader class="text-center relative">
        <template v-if="route.query.step === '2fa'">
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>Enter the code from your authenticator app</CardDescription>
        </template>
        <template v-else>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </template>
      </CardHeader>

      <CardContent>
        <Alert
          v-if="error"
          variant="destructive"
          class="mb-4"
        >
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <form
          action="/api/auth/login-password"
          method="POST"
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <input
            type="hidden"
            name="redirectTo"
            :value="redirectTo"
          >
          <VeeField
            v-slot="{ field, errors }"
            name="username"
          >
            <Field
              :data-invalid="!!errors.length"
              class="space-y-2"
            >
              <FieldLabel
                for="username"
                class="text-sm font-medium"
              >
                Username
              </FieldLabel>
              <div class="relative">
                <User class="absolute left-3 top-3 h-4 w-4" />
                <Input
                  id="username"
                  v-bind="field"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  class="pl-9 h-11"
                  :disabled="isLoading"
                  :aria-invalid="!!errors.length"
                />
              </div>
              <FieldError
                v-if="errors.length"
                :errors="errors"
              />
            </Field>
          </VeeField>

          <VeeField
            v-slot="{ field, errors }"
            name="password"
          >
            <Field
              :data-invalid="!!errors.length"
              class="space-y-2"
            >
              <FieldLabel
                for="password"
                class="text-sm font-medium"
              >
                Password
              </FieldLabel>
              <div class="relative">
                <Lock class="absolute left-3 top-3 h-4 w-4" />
                <Input
                  id="password"
                  v-bind="field"
                  name="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  class="pl-9 pr-9 h-11"
                  :disabled="isLoading"
                  :aria-invalid="!!errors.length"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="absolute right-1 top-1 h-9 w-9 p-0 hover:bg-transparent"
                  @click="showPassword = !showPassword"
                >
                  <Eye
                    v-if="!showPassword"
                    class="h-4 w-4"
                  />
                  <EyeOff
                    v-else
                    class="h-4 w-4"
                  />
                </Button>
              </div>
              <FieldError
                v-if="errors.length"
                :errors="errors"
              />
            </Field>
          </VeeField>

          <div class="space-y-3">
            <NuxtTurnstile v-model="turnstileToken" />
            <Button
              type="submit"
              class="w-full h-11"
              :is-loading="isLoading"
            >
              <Lock
                class="h-4 w-4"
              />
              Sign In with Password
            </Button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-card/60 px-2 text-gray-500 dark:text-gray-400 rounded-xl">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              class="w-full"
              :disabled="!values.username?.trim()"
              :is-loading="isLoading"
              @click="signInWithPasskey"
            >
              <Fingerprint
                class="h-4 w-4"
              />
              Sign In with a Passkey
            </Button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <span class="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-card/60 px-2 text-gray-500 dark:text-gray-400 rounded-xl">Or</span>
              </div>
            </div>

            <template
              v-for="provider in AVAILABLE_PROVIDERS"
              :key="provider.id"
            >
              <Button
                type="button"
                variant="outline"
                class="w-full"
                :is-loading="oauthLoadingProvider === provider.id"
                :disabled="isLoading || oauthLoadingProvider !== null"
                @click="signInWithProvider(provider.id)"
              >
                <div class="h-4 w-4 flex items-center justify-center">
                  <OAuthIcon :provider="provider.id" />
                </div>
                Continue with {{ provider.name }}
              </Button>
            </template>
          </div>
        </form>

        <div
          v-if="route.query.step !== '2fa'"
          class="text-center mt-6 space-y-3"
        >
          <div class="text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to our
            <NuxtLink
              to="https://nnsvn.me/terms"
              class="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </NuxtLink>
            and
            <NuxtLink
              to="https://nnsvn.me/privacy"
              class="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </NuxtLink>
          </div>

          <div class="text-sm text-gray-600 dark:text-gray-300">
            Don't have an account?
            <NuxtLink
              to="/auth/register"
              class="text-primary hover:underline font-medium"
            >
              Sign Up
            </NuxtLink>
          </div>
        </div>
      </CardContent>
    </Card>
  </CenteredAppLayout>
</template>
