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

async function createPasskey() {
  if (!props.username.trim()) {
    error.value = 'Username is required'
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
    const errorMessage = err instanceof Error ? err.message : 'Failed to create passkey'
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
        Secure Your Account
      </DialogTitle>
      <DialogDescription>
        Create a passkey for faster and more secure authentication
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
      <AlertDescription>Passkey created successfully!</AlertDescription>
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
            What is a passkey?
          </h3>
          <p class="text-sm text-muted-foreground">
            A passkey is a secure, passwordless way to sign in using your device's biometric authentication
            (fingerprint, face recognition) or security key.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div class="space-y-2">
            <div class="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto">
              <Shield class="h-4 w-4 text-green-600" />
            </div>
            <p class="text-center">
              More Secure
            </p>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto">
              <Smartphone class="h-4 w-4 text-blue-600" />
            </div>
            <p class="text-center">
              Faster Login
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
          Create Passkey
        </Button>

        <Button
          variant="ghost"
          class="w-full"
          :disabled="isLoading"
          @click="skipPasskey"
        >
          <X class="h-4 w-4" />
          Skip for Now
        </Button>
      </div>

      <p class="text-xs text-muted-foreground text-center">
        You can create a passkey later in your account settings.
      </p>
    </div>
  </ResponsiveDialog>
</template>
