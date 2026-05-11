<template>
  <div class="space-y-4">
    <Card>
      <CardHeader class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="space-y-1">
          <CardTitle>
            Security & Authentication
          </CardTitle>
          <CardDescription>
            Manage your authentication methods.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          :is-loading="addingPasskey"
          @click="addPasskey"
        >
          <Plus
            class="w-4 h-4"
          />
          New Passkey
        </Button>
      </CardHeader>
      <CardContent>
        <div class="flex w-full flex-col gap-3">
          <Item
            v-if="profile?.hasPassword"
            variant="outline"
          >
            <ItemMedia variant="icon">
              <CheckCircle2 />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Password is set</ItemTitle>
              <ItemDescription>
                Your account is protected with a password
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button
                size="sm"
                variant="outline"
                @click="openChangePasswordDialog"
              >
                Change Password
              </Button>
            </ItemActions>
          </Item>

          <ItemGroup v-if="passkeys && passkeys.length > 0">
            <template
              v-for="(passkey, index) in passkeys"
              :key="passkey.id"
            >
              <Item variant="outline">
                <ItemMedia variant="icon">
                  <Smartphone />
                </ItemMedia>
                <ItemContent class="gap-1">
                  <ItemTitle>{{ passkey.name }}</ItemTitle>
                  <ItemDescription>
                    <div class="flex flex-wrap gap-2">
                      <Badge
                        v-if="passkey.backedUp"
                        variant="secondary"
                        class="h-5 text-[10px] gap-1 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-none"
                      >
                        <Cloud class="w-3 h-3" />
                        Synced
                      </Badge>
                      <Badge
                        v-if="passkey.transports?.length"
                        variant="outline"
                        class="h-5 text-[10px] px-1.5 capitalize"
                      >
                        {{ passkey.transports.join(', ') }}
                      </Badge>
                    </div>
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <AlertDialog>
                    <AlertDialogTrigger>
                      <Button
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Passkey</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the passkey "{{ passkey.name }}"? This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          @click="deletePasskey(passkey)"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </ItemActions>
              </Item>
              <ItemSeparator v-if="index !== passkeys.length - 1" />
            </template>
          </ItemGroup>
          <div
            v-else-if="passkeysLoading"
            class="py-4"
          >
            <div class="flex items-center gap-3 text-muted-foreground animate-pulse">
              <Loader2 class="w-5 h-5 animate-spin" />
              <span>Loading authentication methods...</span>
            </div>
          </div>

          <div v-else-if="passkeysError">
            <Alert
              variant="destructive"
              class="bg-destructive/10 border-destructive/20"
            >
              <AlertTriangle class="w-4 h-4" />
              <AlertDescription>{{ passkeysError.message }}</AlertDescription>
            </Alert>
          </div>
          <Item
            v-else
            variant="outline"
          >
            <ItemMedia variant="icon">
              <FingerprintIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>No Passkey Configured</ItemTitle>
              <ItemDescription>
                Create a passkey to sign in easier and more securely with biometrics or security keys.
              </ItemDescription>
            </ItemContent>
          </Item>
        </div>
      </CardContent>
    </Card>

    <!-- Connected Accounts -->
    <Card>
      <CardHeader>
        <div class="space-y-1">
          <CardTitle>
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Link third-party accounts for faster sign-in. Your account email and provider email can be different.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <AlertBox
          v-if="oauthConnectionAlert"
          v-model:visible="oauthAlertVisible"
          :variant="oauthConnectionAlert.variant"
          dismissible
          class="mb-3"
          @dismiss="clearOAuthAlertQuery"
        >
          <AlertBoxContent>
            <AlertBoxTitle>{{ oauthConnectionAlert.title }}</AlertBoxTitle>
            <AlertBoxDescription>{{ oauthConnectionAlert.message }}</AlertBoxDescription>
          </AlertBoxContent>
        </AlertBox>

        <div class="flex w-full flex-col gap-3">
          <template
            v-for="provider in AVAILABLE_PROVIDERS"
            :key="provider.id"
          >
            <Item variant="outline">
              <ItemMedia variant="icon">
                <div class="w-5 h-5 flex items-center justify-center">
                  <OAuthIcon :provider="provider.id" />
                </div>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{{ provider.name }}</ItemTitle>
                <ItemDescription>
                  <template v-if="getLinkedAccount(provider.id)">
                    {{ getLinkedAccount(provider.id)?.email }} · Linked {{
                      formatRelativeTime(getLinkedAccount(provider.id)?.linkedAt ?? '') }}
                  </template>
                  <template v-else>
                    Not connected
                  </template>
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <template v-if="getLinkedAccount(provider.id)">
                  <Tooltip v-if="!canUnlinkProvider(provider.id)">
                    <TooltipTrigger as-child>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                      >
                        <Unlink class="w-4 h-4 mr-1" />
                        Unlink
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Set a password or link another provider before unlinking
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    v-else
                    size="sm"
                    variant="outline"
                    :is-loading="unlinkingProvider === provider.id"
                    @click="confirmUnlink(provider.id)"
                  >
                    <Unlink
                      class="w-4 h-4"
                    />
                    Unlink
                  </Button>
                </template>
                <Button
                  v-else
                  size="sm"
                  variant="outline"
                  :is-loading="linkingProvider === provider.id"
                  :disabled="linkingProvider !== null || unlinkingProvider !== null"
                  @click="linkProvider(provider.id)"
                >
                  <Link2 class="w-4 h-4" />
                  Link Account
                </Button>
              </ItemActions>
            </Item>
          </template>
        </div>
      </CardContent>
    </Card>

    <!-- Change Password Dialog -->
    <ResponsiveDialog
      v-model:open="showChangePasswordDialog"
      content-class="sm:max-w-[425px]"
    >
      <DialogHeader>
        <DialogTitle>Change Password</DialogTitle>
        <DialogDescription>
          Enter your current password and choose a new one.
        </DialogDescription>
      </DialogHeader>
      <form
        class="space-y-4 py-4"
        @submit.prevent="onChangePassword"
      >
        <Alert
          v-if="generalPasswordError"
          variant="destructive"
        >
          <AlertTriangle class="w-4 h-4" />
          <AlertDescription>{{ generalPasswordError }}</AlertDescription>
        </Alert>

        <VeeField
          v-slot="{ field, errors }"
          name="currentPassword"
        >
          <Field
            :data-invalid="!!errors.length"
            class="space-y-2"
          >
            <FieldLabel for="current-password">
              Current Password
            </FieldLabel>
            <div class="relative">
              <Input
                id="current-password"
                :model-value="field.value"
                :type="showCurrentPassword ? 'text' : 'password'"
                placeholder="Enter current password"
                :disabled="savingPassword"
                :aria-invalid="!!errors.length"
                @update:model-value="field.onChange"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="absolute right-1 top-1 h-7 w-7 p-0"
                @click="showCurrentPassword = !showCurrentPassword"
              >
                <Eye
                  v-if="!showCurrentPassword"
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

        <VeeField
          v-slot="{ field, errors }"
          name="newPassword"
        >
          <Field
            :data-invalid="!!errors.length"
            class="space-y-2"
          >
            <FieldLabel for="new-password">
              New Password
            </FieldLabel>
            <div class="relative">
              <Input
                id="new-password"
                :model-value="field.value"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="Enter new password"
                :disabled="savingPassword"
                :aria-invalid="!!errors.length"
                @update:model-value="field.onChange"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="absolute right-1 top-1 h-7 w-7 p-0"
                @click="showNewPassword = !showNewPassword"
              >
                <Eye
                  v-if="!showNewPassword"
                  class="h-4 w-4"
                />
                <EyeOff
                  v-else
                  class="h-4 w-4"
                />
              </Button>
            </div>
            <PasswordStrengthIndicator
              v-if="passwordValues.newPassword"
              :password="passwordValues.newPassword"
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
          name="confirmPassword"
        >
          <Field
            :data-invalid="!!errors.length"
            class="space-y-2"
          >
            <FieldLabel for="confirm-password">
              Confirm New Password
            </FieldLabel>
            <div class="relative">
              <Input
                id="confirm-password"
                :model-value="field.value"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
                :disabled="savingPassword"
                :aria-invalid="!!errors.length"
                @update:model-value="field.onChange"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="absolute right-1 top-1 h-7 w-7 p-0"
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            :is-loading="savingPassword"
            @click="showChangePasswordDialog = false"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            :disabled="!passwordMeta.valid"
            :is-loading="savingPassword"
          >
            Change Password
          </Button>
        </DialogFooter>
      </form>
    </ResponsiveDialog>

    <!-- Unlink Confirmation Dialog -->
    <AlertDialog v-model:open="showUnlinkConfirmDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlink Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to unlink your <span class="capitalize font-medium">{{ providerToUnlink }}</span>
            account?
            You will no longer be able to sign in using this provider.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="unlinkingProvider !== null">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="unlinkingProvider !== null"
            @click="executeUnlink"
          >
            <Loader2
              v-if="unlinkingProvider !== null"
              class="size-4 animate-spin"
            />
            Unlink
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import {
  Plus,
  Smartphone,
  Cloud,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  FingerprintIcon,
  Link2,
  Unlink,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Field as VeeField, useForm } from 'vee-validate'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { changePasswordSchema } from '#shared/schemas/userSchema'
import { calculatePasswordStrength } from '@/utils/passwordValidation'
import { formatRelativeTime } from '@/lib/utils'
import { AUTH_ERROR_MESSAGES, AUTH_SUCCESS_MESSAGES } from '#shared/constants/authMessages'
import { AVAILABLE_PROVIDERS } from '#shared/constants/oauthProviders'

import type { ApiResponse } from '~~/types/api'
import type { PasskeyModel } from '~~/types/models/passkey'
import type { UserProfileModel } from '~~/types/models/profile'
import { apiRoutes } from '#shared/apiRoutes'
import { parseApiError } from '@/utils/apiError'

definePageMeta({
  title: 'Security',
  breadcrumb: 'Security',
  middleware: 'auth',
  layout: 'dashboard',
})

const route = useRoute()

function getQueryString(value: string | string[] | null | undefined) {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value[0] || ''
  }

  return ''
}

function isAuthErrorCode(code: string): code is keyof typeof AUTH_ERROR_MESSAGES {
  return code in AUTH_ERROR_MESSAGES
}

function isAuthSuccessCode(code: string): code is keyof typeof AUTH_SUCCESS_MESSAGES {
  return code in AUTH_SUCCESS_MESSAGES
}

const oauthAlertVisible = ref(true)

const providerNameById = Object.fromEntries(
  AVAILABLE_PROVIDERS.map(provider => [provider.id, provider.name]),
)

type OAuthConnectionAlert = {
  variant: 'destructive' | 'success'
  title: string
  message: string
}

const oauthConnectionAlert = computed<OAuthConnectionAlert | null>(() => {
  const providerCode = getQueryString(route.query.provider)
  const providerName = providerCode ? providerNameById[providerCode] : undefined

  const errorCode = getQueryString(route.query.error)
  if (errorCode && isAuthErrorCode(errorCode)) {
    return {
      variant: 'destructive',
      title: providerName ? `${providerName} connection failed` : 'Connection failed',
      message: AUTH_ERROR_MESSAGES[errorCode],
    }
  }

  const successCode = getQueryString(route.query.success)
  if (successCode && isAuthSuccessCode(successCode)) {
    return {
      variant: 'success',
      title: providerName ? `${providerName} connected` : 'Connected successfully',
      message: AUTH_SUCCESS_MESSAGES[successCode],
    }
  }

  return null
})

function clearOAuthAlertQuery() {
  const nextQuery = { ...route.query }
  delete nextQuery.error
  delete nextQuery.success
  delete nextQuery.provider

  navigateTo({ query: nextQuery }, { replace: true })
}

watch(
  () => [route.query.error, route.query.success, route.query.provider],
  () => {
    oauthAlertVisible.value = true
  },
)

onMounted(() => {
  window.addEventListener('message', onOAuthPopupComplete)
})

// Fetch profile data
const {
  data: profileResponse,
  refresh: refreshProfile,
} = await useAPI<ApiResponse<UserProfileModel>>(() => apiRoutes.MY_PROFILE)

const profile = computed(() => profileResponse.value?.success ? profileResponse.value.data : null)

// Fetch passkeys
const {
  data: passkeysResponse,
  pending: passkeysLoading,
  error: passkeysError,
  refresh: refreshPasskeys,
} = await useAPI<ApiResponse<PasskeyModel[]>>(() => apiRoutes.MY_PASSKEYS)

const passkeys = computed(() => passkeysResponse.value?.success ? passkeysResponse.value.data : [])

// Connected accounts
const unlinkingProvider = ref<string | null>(null)
const linkingProvider = ref<string | null>(null)
const oauthPopup = ref<Window | null>(null)
const oauthPopupTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const showUnlinkConfirmDialog = ref(false)
const providerToUnlink = ref<string | null>(null)

type OAuthPopupCompleteMessage = {
  type: 'oauth:complete'
  url: string
}

function onOAuthPopupComplete(event: MessageEvent<OAuthPopupCompleteMessage>) {
  if (event.origin !== window.location.origin) return
  if (event.data?.type !== 'oauth:complete') return
  if (oauthPopup.value && event.source !== oauthPopup.value) return

  stopOAuthPopupTimeout()
  oauthPopup.value = null
  linkingProvider.value = null

  let target: URL
  try {
    target = new URL(event.data.url)
  }
  catch {
    toast.error('OAuth completed but returned an invalid callback URL.')
    return
  }

  if (target.searchParams.get('success')) {
    refreshProfile()
  }

  navigateTo(`${target.pathname}${target.search}${target.hash}`)
}

function stopOAuthPopupTimeout() {
  if (oauthPopupTimeout.value) {
    clearTimeout(oauthPopupTimeout.value)
    oauthPopupTimeout.value = null
  }
}

function getLinkedAccount(providerId: string) {
  return profile.value?.linkedAccounts?.find(a => a.provider === providerId) ?? null
}

function canUnlinkProvider(_providerId: string) {
  if (!profile.value) return false
  const hasPassword = profile.value.hasPassword
  const otherProviders = (profile.value.linkedAccounts?.length ?? 0) > 1
  return hasPassword || otherProviders
}

function confirmUnlink(provider: string) {
  providerToUnlink.value = provider
  showUnlinkConfirmDialog.value = true
}

async function linkProvider(provider: string) {
  if (linkingProvider.value) return

  linkingProvider.value = provider
  try {
    const response = await apiRequest(apiRoutes.AUTH_OAUTH_URL, {
      method: 'POST',
      body: { provider, action: 'link' },
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
    stopOAuthPopupTimeout()

    oauthPopupTimeout.value = setTimeout(() => {
      oauthPopup.value = null
      linkingProvider.value = null
      toast.error('OAuth session timed out or popup was closed. Please try again.')
    }, 120000)
  }
  catch {
    stopOAuthPopupTimeout()
    toast.error(`Failed to start ${provider} account linking. Please try again.`)
    linkingProvider.value = null
  }
}

onBeforeUnmount(() => {
  stopOAuthPopupTimeout()
  window.removeEventListener('message', onOAuthPopupComplete)
})

async function executeUnlink() {
  if (!providerToUnlink.value) return
  const provider = providerToUnlink.value
  unlinkingProvider.value = provider
  try {
    await apiRequest(apiRoutes.AUTH_OAUTH_UNLINK, {
      method: 'DELETE',
      body: { provider },
    })
    await refreshProfile()
    toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked successfully.`)
    showUnlinkConfirmDialog.value = false
  }
  catch (error: unknown) {
    toast.error(parseApiError(error, `Failed to unlink ${provider} account.`).message)
  }
  finally {
    unlinkingProvider.value = null
    providerToUnlink.value = null
  }
}

const addingPasskey = ref(false)
const showChangePasswordDialog = ref(false)
const savingPassword = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const generalPasswordError = ref('')

const {
  handleSubmit: handlePasswordSubmit,
  resetForm: resetPasswordForm,
  setFieldError: setPasswordFieldError,
  values: passwordValues,
  meta: passwordMeta,
} = useForm({
  initialValues: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  },
  validationSchema: changePasswordSchema,
})

const passwordStrength = computed(() => {
  return calculatePasswordStrength(passwordValues.newPassword || '')
})

// WebAuthn composable
const { register } = useWebAuthn()

// Methods
async function addPasskey() {
  if (!profile.value?.username) return

  addingPasskey.value = true
  try {
    await register({
      userName: profile.value.username,
      displayName: profile.value.name || profile.value.username,
    })
    await refreshPasskeys()
    await refreshProfile()
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to add passkey').message)
  }
  finally {
    addingPasskey.value = false
  }
}

async function deletePasskey(passkey: PasskeyModel) {
  try {
    await apiRequest('/api/users/me/passkeys', {
      method: 'DELETE',
      body: { credentialId: passkey.id },
    })

    await Promise.all([refreshProfile(), refreshPasskeys()])
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to delete passkey').message)
  }
}

function openChangePasswordDialog() {
  resetPasswordForm()
  generalPasswordError.value = ''
  showCurrentPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
  showChangePasswordDialog.value = true
}

const onChangePassword = handlePasswordSubmit(async (formValues) => {
  savingPassword.value = true
  generalPasswordError.value = ''
  try {
    await apiRequest('/api/users/me/password', {
      method: 'PATCH',
      body: {
        currentPassword: formValues.currentPassword,
        newPassword: formValues.newPassword,
        confirmPassword: formValues.confirmPassword,
      },
    })

    showChangePasswordDialog.value = false
    toast.success('Password changed successfully')
    resetPasswordForm()
  }
  catch (error: unknown) {
    const message = parseApiError(error, 'Failed to change password. Please try again.').message

    if (message.toLowerCase().includes('current password')) {
      setPasswordFieldError('currentPassword', message)
    }
    else {
      generalPasswordError.value = message
    }
  }
  finally {
    savingPassword.value = false
  }
})
</script>
