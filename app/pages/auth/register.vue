<script setup lang="ts">
import AuthPageLayout from '@/components/auth/AuthPageLayout.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Lock, Mail, UserIcon } from '@lucide/vue'
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator.vue'
import { registerUserSchema } from '#shared/schemas/userSchema'
import { calculatePasswordStrength } from '@/utils/passwordValidation'
import { getAuthErrorMessage } from '#shared/constants/authMessages'
import { AVAILABLE_PROVIDERS } from '#shared/constants/oauthProviders'
import { apiRoutes } from '#shared/apiRoutes'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { Field as VeeField, useForm } from 'vee-validate'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { APP_MANIFEST } from '#shared/constants/manifest'

const route = useRoute()
const requestUrl = useRequestURL()
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const error = ref('')
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

const redirectTo = computed(() => {
  const value = getQueryString(route.query.redirectTo)
  if (!value) {
    return '/'
  }

  try {
    const parsed = new URL(value, requestUrl.origin)
    if (parsed.origin !== requestUrl.origin) {
      return '/'
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  }
  catch {
    return '/'
  }
})

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

const form = useForm({
  initialValues: {
    'username': '',
    'name': '',
    'email': '',
    'password': '',
    'confirm-password': '',
    'cf-turnstile-response': '',
  },
  validationSchema: registerUserSchema,
})

const { handleSubmit, values, meta, setFieldValue } = form

const onSubmit = handleSubmit(async () => {
  const formEl = document.querySelector('form[action="/api/auth/register-password"]')
  if (formEl instanceof HTMLFormElement) formEl.submit()
})

watch(turnstileToken, (val) => {
  setFieldValue('cf-turnstile-response', val)
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
  oauthPopupListener.start()
})

async function signUpWithProvider(provider: string) {
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
  catch (err) {
    stopOAuthPopupCloseMonitor()
    stopOAuthPopupTimeout()
    oauthPopup.value = null
    error.value = parseApiError(err, 'Unable to continue with provider right now. Please try again.').message
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
  title: 'Sign Up',
  breadcrumb: 'Register',
})
</script>

<template>
  <AuthPageLayout quote="Build a library that feels like yours from the first page.">
    <div class="space-y-1">
      <h1 class="text-2xl font-bold tracking-tight">
        Create account
      </h1>
      <p class="text-base text-muted-foreground">
        {{ APP_MANIFEST.description }}
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
          <div class="h-4 w-4 flex items-center justify-center">
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
              :model-value="field.value"
              name="username"
              type="text"
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
              :model-value="field.value"
              name="name"
              type="text"
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
              :model-value="field.value"
              name="email"
              type="email"
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
              :model-value="field.value"
              name="password"
              :type="showPassword ? 'text' : 'password'"
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
                aria-hidden="true"
              />
              <EyeOff
                v-else
                class="h-4 w-4"
                aria-hidden="true"
              />
            </Button>
          </div>
          <FieldError
            v-if="errors.length"
            :errors="errors"
          />
          <!-- Password Strength Indicator -->
          <PasswordStrengthIndicator
            :password="values.password || ''"
            :strength="passwordStrength"
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
              :model-value="field.value"
              name="confirm-password"
              :type="showConfirmPassword ? 'text' : 'password'"
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
                aria-hidden="true"
              />
              <EyeOff
                v-else
                class="h-4 w-4"
                aria-hidden="true"
              />
            </Button>
          </div>
          <FieldError
            v-if="errors.length"
            :errors="errors"
          />
        </Field>
      </VeeField>

      <NuxtTurnstile v-model="turnstileToken" />
      <input
        type="hidden"
        name="redirect-to"
        :value="redirectTo"
      >
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
      <div class="text-xs text-muted-foreground">
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
      </div>

      <div class="text-sm text-muted-foreground">
        Already have an account?
        <NuxtLink
          to="/auth/login"
          class="font-medium text-primary hover:underline"
        >
          Sign In
        </NuxtLink>
      </div>
    </div>
  </AuthPageLayout>
</template>
