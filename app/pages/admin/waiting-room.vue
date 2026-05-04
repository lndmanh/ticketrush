<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { waitingRoomSettingsSchema } from '#shared/schemas/ticketingSchema'
import type { WaitingRoomSettingsInput } from '#shared/schemas/ticketingSchema'

const isSaving = ref(false)

const { data: settingsResponse, refresh } = await useFetch('/api/admin/waiting-room-settings')

const defaultValues: WaitingRoomSettingsInput = {
  queueActivationThreshold: 250,
  queueBatchSize: 50,
  queueWindowSeconds: 180,
}

const { handleSubmit, resetForm, values } = useForm({
  initialValues: { ...defaultValues },
  validationSchema: waitingRoomSettingsSchema,
})

watch(settingsResponse, (response) => {
  if (!response?.success) {
    return
  }

  resetForm({
    values: response.data,
  })
}, { immediate: true })

function getErrorMessage(error: object, fallback: string) {
  if ('data' in error && error.data && typeof error.data === 'object' && 'statusMessage' in error.data && typeof error.data.statusMessage === 'string') {
    return error.data.statusMessage
  }

  if ('message' in error && typeof error.message === 'string') {
    return error.message
  }

  return fallback
}

const estimatedFirstBatchLabel = computed(() => {
  const minutes = Math.floor(values.queueWindowSeconds / 60)
  const seconds = values.queueWindowSeconds % 60
  if (minutes <= 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
})

const onSubmit = handleSubmit(
  async (formValues) => {
    isSaving.value = true

    try {
      await $fetch('/api/admin/waiting-room-settings', {
        method: 'PUT',
        body: formValues,
      })
      await refresh()
      toast.success('Waiting room settings updated')
    }
    catch (error) {
      if (error && typeof error === 'object') {
        toast.error(getErrorMessage(error, 'Failed to update waiting room settings'))
        return
      }

      toast.error('Failed to update waiting room settings')
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'Please fix the highlighted settings'
    toast.error(firstError)
  },
)

definePageMeta({
  title: 'Waiting room settings',
  breadcrumb: 'Waiting room',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-semibold text-foreground">
          Waiting room
        </h2>
        <p class="text-sm text-muted-foreground">
          Activates automatically for any session once live demand reaches the global threshold.
        </p>
      </div>
    </section>

    <Card>
      <CardContent>
        <form
          class="space-y-6"
          @submit.prevent="onSubmit"
        >
          <FieldGroup class="grid gap-4 md:grid-cols-3">
            <VeeField
              v-slot="{ field, errors }"
              name="queueActivationThreshold"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="waiting-room-threshold">
                  Activation threshold
                </FieldLabel>
                <Input
                  id="waiting-room-threshold"
                  type="number"
                  min="1"
                  :model-value="String(field.value ?? '')"
                  :aria-invalid="!!errors.length"
                  @update:model-value="field.onChange(Number($event))"
                />
                <FieldDescription>Active queue passes plus active holds before buyers are paced.</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <VeeField
              v-slot="{ field, errors }"
              name="queueBatchSize"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="waiting-room-batch-size">
                  Batch size
                </FieldLabel>
                <Input
                  id="waiting-room-batch-size"
                  type="number"
                  min="1"
                  :model-value="String(field.value ?? '')"
                  :aria-invalid="!!errors.length"
                  @update:model-value="field.onChange(Number($event))"
                />
                <FieldDescription>Number of buyers admitted on each queue cycle.</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <VeeField
              v-slot="{ field, errors }"
              name="queueWindowSeconds"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="waiting-room-window">
                  Window seconds
                </FieldLabel>
                <Input
                  id="waiting-room-window"
                  type="number"
                  min="1"
                  :model-value="String(field.value ?? '')"
                  :aria-invalid="!!errors.length"
                  @update:model-value="field.onChange(Number($event))"
                />
                <FieldDescription>How long an admitted pass remains valid.</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>
          </FieldGroup>

          <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted-foreground">
              Existing sessions use these settings immediately after save.
            </p>
            <Button
              type="submit"
              :is-loading="isSaving"
            >
              Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
