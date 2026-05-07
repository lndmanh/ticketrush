<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ResponsiveDialog from '@/components/ResponsiveDialog.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Fingerprint, Shield, Smartphone, CheckCircle, X } from '@lucide/vue'

interface Props {
  open: boolean
  username: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'passkey-created': []
  'skip-passkey': []
}>()

const { register } = useWebAuthn()
const isLoading = ref(false)
const error = ref('')
const success = ref(false)
const { t } = useI18n()

async function createPasskey() {
  if (!props.username.trim()) {
    error.value = t('passkey.username_required')
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    // Use the WebAuthn register flow - modified to handle existing users
    await register({
      userName: props.username,
      displayName: props.username, // Use username as display name
    })

    success.value = true
    setTimeout(() => {
      emit('passkey-created')
      emit('update:open', false)
    }, 2000)
  }
  catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('passkey.failed')
    error.value = errorMessage
  }
  finally {
    isLoading.value = false
  }
}

function skipPasskey() {
  emit('skip-passkey')
  emit('update:open', false)
}

function closeDialog() {
  if (!isLoading.value) {
    emit('update:open', false)
  }
}
</script>

<template>
  <ResponsiveDialog
    :open="open"
    content-class="sm:max-w-md"
    @update:open="closeDialog"
  >
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        <Shield class="h-5 w-5" />
        {{ $t('passkey.dialog_title') }}
      </DialogTitle>
      <DialogDescription>
        {{ $t('passkey.dialog_desc') }}
      </DialogDescription>
    </DialogHeader>

    <Alert
      v-if="error"
      variant="destructive"
      class="mb-4"
    >
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <Alert
      v-if="success"
      class="mb-4"
    >
      <CheckCircle class="h-4 w-4" />
      <AlertDescription>{{ $t('passkey.success') }}</AlertDescription>
    </Alert>

    <div
      v-if="!success"
      class="space-y-6"
    >
      <div class="text-center space-y-4">
        <div class="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Fingerprint class="h-8 w-8 text-primary" />
        </div>

        <div class="space-y-2">
          <h3 class="font-medium">
            {{ $t('passkey.what_is') }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ $t('passkey.what_is_desc') }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="space-y-2">
            <div class="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto">
              <Shield class="h-4 w-4 text-green-600" />
            </div>
            <p class="text-center">
              {{ $t('passkey.more_secure') }}
            </p>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto">
              <Smartphone class="h-4 w-4 text-blue-600" />
            </div>
            <p class="text-center">
              {{ $t('passkey.faster_login') }}
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <Button
          class="w-full"
          :is-loading="isLoading"
          @click="createPasskey"
        >
          <Fingerprint
            class="h-4 w-4"
          />
          {{ $t('passkey.create') }}
        </Button>

        <Button
          variant="ghost"
          class="w-full"
          :disabled="isLoading"
          @click="skipPasskey"
        >
          <X class="h-4 w-4" />
          {{ $t('passkey.skip') }}
        </Button>
      </div>

      <p class="text-xs text-muted-foreground text-center">
        {{ $t('passkey.later_note') }}
      </p>
    </div>
  </ResponsiveDialog>
</template>
