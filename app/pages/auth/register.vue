<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeftIcon, Eye, EyeOff, Grid2x2PlusIcon, Lock, Mail, UserIcon } from '@lucide/vue'
import { motion } from 'motion-v'
import PasskeyRegistrationDialog from '@/components/PasskeyRegistrationDialog.vue'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator.vue'
import { registerUserSchema } from '#shared/schemas/userSchema'
import { calculatePasswordStrength } from '@/utils/passwordValidation'
import { getAuthErrorMessage } from '#shared/constants/authMessages'
import { AVAILABLE_PROVIDERS } from '#shared/constants/oauthProviders'
import { apiRoutes } from '#shared/apiRoutes'
import { Field as VeeField, useForm } from 'vee-validate'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import type { ApiResponse } from '~~/types/api'

const route = useRoute()
const redirectTo = computed(() => getQueryString(route.query.redirectTo) || '/')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const error = ref('')
const showPasskeyDialog = ref(false)
const registeredUsername = ref('')
const postRegistrationRedirectTo = ref('/')
const hasNavigatedPostRegistration = ref(false)
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

async function navigateToPostRegistrationRedirect() {
  hasNavigatedPostRegistration.value = true
  const target = postRegistrationRedirectTo.value || '/'
  await navigateTo(target, { external: target.startsWith('http') })
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

const form = useForm({
  initialValues: {
    'username': '',
    'name': '',
    'email': '',
    'password': '',
    'confirm-password': '',
    'cf-turnstile-response': '',
    'redirect-to': redirectTo.value,
  },
  validationSchema: registerUserSchema,
})

const { handleSubmit, values, meta, setFieldError, setFieldValue } = form

const onSubmit = handleSubmit(async (formValues) => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await $fetch<{ redirectTo: string }>('/api/auth/register-password', {
      method: 'POST',
      body: formValues,
    })

    registeredUsername.value = formValues.username
    postRegistrationRedirectTo.value = response.redirectTo || '/'
    hasNavigatedPostRegistration.value = false
    showPasskeyDialog.value = true
  }
  catch (submitError) {
    const message = submitError && typeof submitError === 'object'
      ? getErrorMessage(submitError, 'Unable to create your account. Please try again')
      : 'Unable to create your account. Please try again'

    error.value = message
    if (message.toLowerCase().includes('email')) {
      setFieldError('email', message)
    }
    else {
      setFieldError('username', message)
    }

    turnstileToken.value = ''
    setFieldValue('cf-turnstile-response', '')
    turnstileRenderKey.value += 1
  }
  finally {
    isLoading.value = false
  }
})

watch(turnstileToken, (val) => {
  setFieldValue('cf-turnstile-response', val)
})

watch(redirectTo, (value) => {
  setFieldValue('redirect-to', value)
})

watch(showPasskeyDialog, (isOpen) => {
  if (!isOpen && !hasNavigatedPostRegistration.value && registeredUsername.value) {
    navigateToPostRegistrationRedirect()
  }
})

const passwordStrength = computed(() => calculatePasswordStrength(values.password || ''))

// Check if form is valid for submission
const isFormValid = computed(() => {
  return meta.value.valid && passwordStrength.value.score >= 80
})

watch(() => route.query.error, (queryValue) => {
  const errorCode = getQueryString(queryValue)
  if (errorCode) {
    error.value = getAuthErrorMessage(errorCode) || 'An error occurred during registration'
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('message', onOAuthPopupComplete)
})

function onPasskeyCreated() {
  navigateToPostRegistrationRedirect()
}

function onPasskeySkipped() {
  navigateToPostRegistrationRedirect()
}

async function signUpWithProvider(provider: string) {
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
  title: 'Sign Up',
  breadcrumb: 'Register',
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
            ~ Ticket Rush
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
          <h1 class="text-2xl font-bold tracking-tight">
            Create account
          </h1>
          <p class="text-base text-muted-foreground">
            Join Ticket Rush and start your ticketing journey.
          </p>
        </div>
        <Alert
          v-if="error"
          variant="destructive"
        >
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>

        <!-- OAuth Sign Up -->
        <div class="space-y-3">
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
              @click="signUpWithProvider(provider.id)"
            >
              <div class="flex h-4 w-4 items-center justify-center">
                <OAuthIcon :provider="provider.id" />
              </div>
              Sign up with {{ provider.name }}
            </Button>
          </template>

          <div class="flex items-center gap-2 py-1">
            <div class="h-px flex-1 bg-border" />
            <span class="text-xs uppercase text-muted-foreground">Or sign up with email</span>
            <div class="h-px flex-1 bg-border" />
          </div>
        </div>

        <form
          action="/api/auth/register-password"
          method="POST"
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <input
            type="hidden"
            name="cf-turnstile-response"
            :value="turnstileToken"
          >
          <input
            type="hidden"
            name="redirect-to"
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
                <UserIcon class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  :model-value="field.value"
                  type="text"
                  autocomplete="username"
                  placeholder="Enter your username"
                  class="h-11 pl-9"
                  :aria-invalid="!!errors.length"
                  :disabled="isLoading"
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
            name="name"
          >
            <Field
              :data-invalid="!!errors.length"
              class="space-y-2"
            >
              <FieldLabel
                for="name"
                class="text-sm font-medium"
              >
                Display Name
              </FieldLabel>
              <div class="relative">
                <UserIcon class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  :model-value="field.value"
                  type="text"
                  autocomplete="name"
                  placeholder="Enter your display name"
                  class="h-11 pl-9"
                  :aria-invalid="!!errors.length"
                  :disabled="isLoading"
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
            name="email"
          >
            <Field
              :data-invalid="!!errors.length"
              class="space-y-2"
            >
              <FieldLabel
                for="email"
                class="text-sm font-medium"
              >
                Email
              </FieldLabel>
              <div class="relative">
                <Mail class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  :model-value="field.value"
                  type="email"
                  autocomplete="email"
                  placeholder="Enter your email"
                  class="h-11 pl-9"
                  :aria-invalid="!!errors.length"
                  :disabled="isLoading"
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
                  name="password"
                  :model-value="field.value"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Enter your password"
                  class="h-11 pl-9 pr-9"
                  :aria-invalid="!!errors.length"
                  :disabled="isLoading"
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
              <!-- Password Strength Indicator -->
              <PasswordStrengthIndicator
                :password="values.password || ''"
                :strength="passwordStrength"
              />
              <FieldError
                v-if="errors.length"
                :errors="errors"
              />
            </Field>
          </VeeField>

          <VeeField
            v-slot="{ field, errors }"
            name="confirm-password"
          >
            <Field
              :data-invalid="!!errors.length"
              class="space-y-2"
            >
              <FieldLabel
                for="confirmPassword"
                class="text-sm font-medium"
              >
                Confirm Password
              </FieldLabel>
              <div class="relative">
                <Lock class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirm-password"
                  :model-value="field.value"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Confirm your password"
                  class="h-11 pl-9 pr-9"
                  :aria-invalid="!!errors.length"
                  :disabled="isLoading"
                  @update:model-value="field.onChange"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="absolute right-1 top-1 h-9 w-9 p-0 hover:bg-transparent"
                  :aria-label="showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'"
                  :aria-pressed="showConfirmPassword"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <Eye
                    v-if="!showConfirmPassword"
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

          <NuxtTurnstile
            :key="turnstileRenderKey"
            v-model="turnstileToken"
          />
          <Button
            type="submit"
            class="h-11 w-full active:scale-[0.98]"
            :disabled="!isFormValid"
            :is-loading="isLoading"
          >
            <Lock
              class="h-4 w-4"
            />
            Create Account
          </Button>
          <p
            v-if="values.password && passwordStrength.score < 80"
            class="text-center text-xs text-muted-foreground"
          >
            Password must be strong to create an account
          </p>
        </form>

        <div class="space-y-3 text-center">
          <p class="text-xs text-muted-foreground">
            By creating an account, you agree to our
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
            Already have an account?
            <NuxtLink
              to="/auth/login"
              class="font-medium text-primary hover:underline"
            >
              Sign In
            </NuxtLink>
          </p>
        </div>
      </div>
    </section>

    <!-- Passkey Registration Dialog -->
    <PasskeyRegistrationDialog
      v-model:open="showPasskeyDialog"
      :username="registeredUsername"
      @passkey-created="onPasskeyCreated"
      @skip-passkey="onPasskeySkipped"
    />
  </main>
</template>
