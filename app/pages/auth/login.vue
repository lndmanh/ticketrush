<script setup lang="ts">
import { ChevronLeftIcon, Eye, EyeOff, Fingerprint, Grid2x2PlusIcon, Lock, User } from '@lucide/vue'
import { motion } from 'motion-v'
import { getAuthErrorMessage, AUTH_SUCCESS_MESSAGES } from '#shared/constants/authMessages'
import { AVAILABLE_PROVIDERS } from '#shared/constants/oauthProviders'
import { apiRoutes } from '#shared/apiRoutes'
import { Field as VeeField, useForm } from 'vee-validate'
import { loginSchema } from '#shared/schemas/userSchema'
import type { ApiResponse } from '~~/types/api'

const { authenticate } = useWebAuthn()
const route = useRoute()
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const turnstileToken = ref('')
const turnstileRenderKey = ref(0)
const oauthLoadingProvider = ref<string | null>(null)
const oauthPopup = ref<Window | null>(null)
const oauthPopupTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const oauthPopupCloseMonitor = ref<ReturnType<typeof setInterval> | null>(null)

type OAuthPopupCompleteMessage = {
  type: 'oauth:complete'
  url: string
}

type FloatingPath = {
  id: number
  d: string
  width: number
  opacity: number
  duration: number
}

function createFloatingPaths(position: number): FloatingPath[] {
  return Array.from({ length: 36 }, (_, index) => ({
    id: index,
    d: `M-${380 - index * 5 * position} -${189 + index * 6}C-${
      380 - index * 5 * position
    } -${189 + index * 6} -${312 - index * 5 * position} ${216 - index * 6} ${
      152 - index * 5 * position
    } ${343 - index * 6}C${616 - index * 5 * position} ${470 - index * 6} ${
      684 - index * 5 * position
    } ${875 - index * 6} ${684 - index * 5 * position} ${875 - index * 6}`,
    width: 0.5 + index * 0.03,
    opacity: 0.1 + index * 0.03,
    duration: 20 + (index % 10),
  }))
}

const floatingPaths = [
  ...createFloatingPaths(1),
  ...createFloatingPaths(-1),
]

function isAuthSuccessMessageKey(value: string): value is keyof typeof AUTH_SUCCESS_MESSAGES {
  return value in AUTH_SUCCESS_MESSAGES
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

function getErrorMessage(errorValue: object, fallback: string) {
  if ('data' in errorValue && errorValue.data && typeof errorValue.data === 'object' && 'statusMessage' in errorValue.data && typeof errorValue.data.statusMessage === 'string') {
    return errorValue.data.statusMessage
  }

  if ('message' in errorValue && typeof errorValue.message === 'string') {
    return errorValue.message
  }

  return fallback
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

const redirectTo = computed(() => getQueryString(route.query.redirectTo) || '/')
const isTwoFactorStep = computed(() => getQueryString(route.query.step) === '2fa')

const {
  handleSubmit,
  setFieldError,
  setFieldValue,
  values,
} = useForm({
  initialValues: {
    'username': '',
    'password': '',
    'cf-turnstile-response': '',
    'redirect-to': redirectTo.value,
  },
  validationSchema: loginSchema,
})

watch(turnstileToken, (token) => {
  setFieldValue('cf-turnstile-response', token)
})

watch(redirectTo, (value) => {
  setFieldValue('redirect-to', value)
})

const onSubmit = handleSubmit(async (formValues) => {
  isLoading.value = true
  error.value = ''
  success.value = ''

  try {
    const response = await $fetch<{ redirectTo: string }>('/api/auth/login-password', {
      method: 'POST',
      body: formValues,
    })

    await navigateTo(response.redirectTo, { external: response.redirectTo.startsWith('http') })
  }
  catch (submitError) {
    const message = submitError && typeof submitError === 'object'
      ? getErrorMessage(submitError, 'Unable to sign in. Please try again')
      : 'Unable to sign in. Please try again'

    error.value = message
    setFieldError('password', message)
    turnstileToken.value = ''
    setFieldValue('cf-turnstile-response', '')
    turnstileRenderKey.value += 1
  }
  finally {
    isLoading.value = false
  }
})

watch(() => route.query.error, (queryValue) => {
  const errorCode = getQueryString(queryValue)
  if (errorCode) {
    error.value = getAuthErrorMessage(errorCode) || 'An error occurred during login'
    success.value = ''
  }
}, { immediate: true })

watch(() => route.query.success, (queryValue) => {
  const successCode = getQueryString(queryValue)
  if (successCode) {
    success.value = isAuthSuccessMessageKey(successCode) ? AUTH_SUCCESS_MESSAGES[successCode] : ''
    error.value = ''
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
  <main class="relative h-[100dvh] overflow-hidden bg-background lg:grid lg:grid-cols-2">
    <section class="relative hidden h-full flex-col overflow-hidden border-r bg-muted/60 p-10 lg:flex">
      <div class="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
      <div class="relative flex items-center gap-2">
        <Grid2x2PlusIcon class="size-6" />
        <p class="text-xl font-semibold">
          Ticket Rush
        </p>
      </div>

      <div
        class="pointer-events-none absolute inset-0 text-slate-950 dark:text-white"
        aria-hidden="true"
      >
        <svg
          class="h-full w-full"
          viewBox="0 0 696 316"
          fill="none"
        >
          <motion.path
            v-for="path in floatingPaths"
            :key="`${path.id}-${path.d}`"
            :d="path.d"
            stroke="currentColor"
            :stroke-width="path.width"
            :stroke-opacity="path.opacity"
            :initial="{ pathLength: 0.3, opacity: 0.6 }"
            :animate="{ pathLength: 1, opacity: [0.3, 0.6, 0.3], pathOffset: [0, 1, 0] }"
            :transition="{ duration: path.duration, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }"
          />
        </svg>
      </div>

      <div class="relative mt-auto max-w-xl">
        <blockquote class="space-y-2">
          <p class="text-xl leading-relaxed">
            &ldquo;Ticket Rush makes buying and selling tickets so easy, I can focus on what matters most - enjoying the event.&rdquo;
          </p>
          <footer class="font-mono text-sm font-semibold">
            ~ Morgan Vale
          </footer>
        </blockquote>
      </div>
    </section>

    <section class="relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto px-4 py-20 sm:px-6 lg:px-10">
      <div
        aria-hidden="true"
        class="absolute inset-0 -z-10 isolate opacity-60"
      >
        <div class="absolute right-0 top-0 h-80 w-80 -translate-y-1/2 translate-x-1/4 rounded-full bg-foreground/[0.04] blur-3xl" />
        <div class="absolute bottom-0 left-0 h-72 w-72 translate-y-1/3 rounded-full bg-muted blur-3xl" />
      </div>

      <Button
        variant="ghost"
        class="absolute left-5 top-7"
        @click="navigateTo('/')"
      >
        <ChevronLeftIcon class="me-2 size-4" />
        Home
      </Button>

      <div class="mx-auto my-auto w-full max-w-sm space-y-5">
        <div class="flex items-center gap-2 lg:hidden">
          <Grid2x2PlusIcon class="size-6" />
          <p class="text-xl font-semibold">
            Ticket Rush
          </p>
        </div>

        <div class="space-y-1">
          <template v-if="!isTwoFactorStep">
            <h1 class="text-2xl font-bold tracking-tight">
              Welcome back
            </h1>
            <p class="text-base text-muted-foreground">
              Sign in to your Ticket Rush account to continue.
            </p>
          </template>
          <template v-else>
            <h1 class="text-2xl font-bold tracking-tight">
              Two-factor verification
            </h1>
            <p class="text-base text-muted-foreground">
              Enter the code from your authenticator app to continue.
            </p>
          </template>
        </div>

        <Alert
          v-if="success"
          class="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
        >
          <AlertDescription class="text-green-700 dark:text-green-300">
            {{ success }}
          </AlertDescription>
        </Alert>

        <Alert
          v-if="error"
          variant="destructive"
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
            name="redirect-to"
            :value="redirectTo"
          >
          <input
            type="hidden"
            name="cf-turnstile-response"
            :value="turnstileToken"
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
                <User class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  :model-value="field.value"
                  name="username"
                  type="text"
                  autocomplete="username"
                  placeholder="Enter your username"
                  class="h-11 pl-9"
                  :disabled="isLoading"
                  :aria-invalid="!!errors.length"
                  @update:model-value="field.onChange"
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
                <Lock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  :model-value="field.value"
                  name="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  class="h-11 pl-9 pr-9"
                  :disabled="isLoading"
                  :aria-invalid="!!errors.length"
                  @update:model-value="field.onChange"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="absolute right-1 top-1 h-9 w-9 p-0 hover:bg-transparent"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showPassword"
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

          <div class="flex justify-end">
            <NuxtLink
              to="/auth/forgot-password"
              class="text-xs text-primary hover:underline"
            >
              Forgot password?
            </NuxtLink>
          </div>

          <div class="space-y-3">
            <NuxtTurnstile
              :key="turnstileRenderKey"
              v-model="turnstileToken"
            />
            <Button
              type="submit"
              class="h-11 w-full active:scale-[0.98]"
              :is-loading="isLoading"
            >
              <Lock class="h-4 w-4" />
              Sign In with Password
            </Button>

            <div class="flex items-center gap-2 py-1">
              <div class="h-px flex-1 bg-border" />
              <span class="text-xs uppercase text-muted-foreground">Or</span>
              <div class="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              class="w-full active:scale-[0.98]"
              :disabled="!values.username?.trim()"
              :is-loading="isLoading"
              @click="signInWithPasskey"
            >
              <Fingerprint class="h-4 w-4" />
              Sign In with a Passkey
            </Button>

            <div class="flex items-center gap-2 py-1">
              <div class="h-px flex-1 bg-border" />
              <span class="text-xs uppercase text-muted-foreground">Or</span>
              <div class="h-px flex-1 bg-border" />
            </div>

            <template
              v-for="provider in AVAILABLE_PROVIDERS"
              :key="provider.id"
            >
              <Button
                type="button"
                variant="outline"
                class="w-full active:scale-[0.98]"
                :is-loading="oauthLoadingProvider === provider.id"
                :disabled="isLoading || oauthLoadingProvider !== null"
                @click="signInWithProvider(provider.id)"
              >
                <div class="flex h-4 w-4 items-center justify-center">
                  <OAuthIcon :provider="provider.id" />
                </div>
                Continue with {{ provider.name }}
              </Button>
            </template>
          </div>
        </form>

        <div
          v-if="!isTwoFactorStep"
          class="space-y-3 text-center"
        >
          <p class="text-xs text-muted-foreground">
            By signing in, you agree to our
            <NuxtLink
              to="https://nnsvn.me/terms"
              class="underline underline-offset-4 hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </NuxtLink>
            and
            <NuxtLink
              to="https://nnsvn.me/privacy"
              class="underline underline-offset-4 hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </NuxtLink>
            .
          </p>

          <p class="text-sm text-muted-foreground">
            Don't have an account?
            <NuxtLink
              to="/auth/register"
              class="font-medium text-primary hover:underline"
            >
              Sign Up
            </NuxtLink>
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
