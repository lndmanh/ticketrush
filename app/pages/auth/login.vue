<script setup lang="ts">
import { User, Lock, Eye, EyeOff, Fingerprint } from '@lucide/vue'
import { getAuthErrorMessage, AUTH_SUCCESS_MESSAGES } from '#shared/constants/authMessages'
import { AVAILABLE_PROVIDERS } from '#shared/constants/oauthProviders'
import { apiRoutes } from '#shared/apiRoutes'
import { Field as VeeField, useForm } from 'vee-validate'
import { loginSchema } from '#shared/schemas/userSchema'
import { parseApiError } from '@/utils/apiError'
import { apiRequest } from '@/utils/apiRequest'

const formSchema = loginSchema.pick({ username: true, password: true })

function isAuthSuccessMessageKey(value: string): value is keyof typeof AUTH_SUCCESS_MESSAGES {
  return value in AUTH_SUCCESS_MESSAGES
}

const { authenticate } = useWebAuthn()
const route = useRoute()
const requestUrl = useRequestURL()
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const turnstileToken = ref('')
const oauthLoadingProvider = ref<string | null>(null)
const oauthPopup = ref<Window | null>(null)
const oauthPopupTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const oauthPopupCloseMonitor = ref<ReturnType<typeof setInterval> | null>(null)

function getQueryString(value: string | string[] | null | undefined) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return ''
}

function safeRedirectPath(value: string, baseUrl: string) {
  try {
    const parsed = new URL(value, baseUrl)
    if (parsed.origin !== baseUrl) {
      return '/'
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  catch {
    return '/'
  }
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

function onOAuthPopupComplete(message: { url: string }) {
  stopOAuthPopupCloseMonitor()
  stopOAuthPopupTimeout()
  oauthPopup.value = null
  oauthLoadingProvider.value = null

  let target: URL
  try {
    target = new URL(message.url)
  }
  catch {
    error.value = 'Authentication completed but response URL was invalid. Please try again.'
    return
  }

  window.location.assign(`${target.pathname}${target.search}${target.hash}`)
}

const oauthPopupListener = useOAuthPopupListener(onOAuthPopupComplete)

const { handleSubmit, values } = useForm({
  initialValues: {
    username: '',
    password: '',
  },
  validationSchema: formSchema,
})

const onSubmit = handleSubmit(async () => {
  // Native form submission for server-side auth
  const formEl = document.querySelector('form[action="/api/auth/login-password"]')
  if (formEl instanceof HTMLFormElement) formEl.submit()
})

const redirectTo = computed(() => safeRedirectPath(getQueryString(route.query.redirectTo) || '/', requestUrl.origin))

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
  oauthPopupListener.start()
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
    error.value = parseApiError(err, 'Authentication failed. Please ensure your passkey is set up correctly, or sign in with your password.').message
    isLoading.value = false
  }
}

async function signInWithProvider(provider: string) {
  if (oauthLoadingProvider.value) return

  oauthLoadingProvider.value = provider
  error.value = ''

  try {
    const response = await apiRequest(apiRoutes.AUTH_OAUTH_URL, {
      method: 'POST',
      body: { provider, action: 'login', redirectTo: redirectTo.value },
    })
    if (!response.success) {
      throw response
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
  catch (error) {
    stopOAuthPopupCloseMonitor()
    stopOAuthPopupTimeout()
    oauthPopup.value = null
    error.value = parseApiError(error, 'Unable to continue with provider right now. Please try again.').message
    oauthLoadingProvider.value = null
  }
}

onBeforeUnmount(() => {
  stopOAuthPopupCloseMonitor()
  stopOAuthPopupTimeout()
  oauthPopupListener.stop()
})

definePageMeta({
  layout: 'empty',
  title: 'Login',
  breadcrumb: 'Login',
})
</script>

<template>
  <AuthPageLayout
    quote="Keep your session, seats, and checkout ready before the rush starts."
    quote-author="TicketRush"
  >
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight">
        Welcome back to TicketRush
      </h1>
      <p class="text-base text-muted-foreground">
        Sign in to continue booking, managing attendees, or running your next ticket drop.
      </p>
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
            <User
              aria-hidden="true"
              class="absolute left-3 top-3 h-4 w-4"
            />
            <Input
              id="username"
              :model-value="field.value"
              name="username"
              type="text"
              placeholder="Enter your username"
              class="pl-9 h-11"
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
            <Lock
              aria-hidden="true"
              class="absolute left-3 top-3 h-4 w-4"
            />
            <Input
              id="password"
              :model-value="field.value"
              name="password"
              :type="showPassword ? 'text' : 'password'"
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
                aria-hidden="true"
                class="h-4 w-4"
              />
              <EyeOff
                v-else
                aria-hidden="true"
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
          :to="{ path: '/auth/forgot-password' }"
          class="text-xs text-primary hover:underline"
        >
          {{ $t('auth.forgot_password') }}
        </NuxtLink>
      </div>

      <div class="space-y-3">
        <NuxtTurnstile v-model="turnstileToken" />
        <Button
          type="submit"
          class="h-11 w-full active:scale-[0.98]"
          :is-loading="isLoading"
        >
          <Lock
            aria-hidden="true"
            class="h-4 w-4"
          />
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
          <Fingerprint
            aria-hidden="true"
            class="h-4 w-4"
          />
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
            class="w-full"
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
      class="space-y-3 text-center"
    >
      <div class="text-xs text-muted-foreground">
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
      </div>

      <div class="text-sm text-muted-foreground">
        Don't have an account?
        <NuxtLink
          to="/auth/register"
          class="font-medium text-primary hover:underline"
        >
          Sign Up
        </NuxtLink>
      </div>
    </div>
  </AuthPageLayout>
</template>
