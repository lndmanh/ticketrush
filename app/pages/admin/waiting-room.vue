<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { waitingRoomSettingsSchema } from '#shared/schemas/ticketingSchema'
import type { WaitingRoomSettingsInput } from '#shared/schemas/ticketingSchema'

const { t } = useI18n()
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

function updatePositiveNumber(onChange: (value: number | '') => void, value: string | number) {
  const nextValue = String(value)
  if (!nextValue) {
    onChange('')
    return
  }

  const numericValue = Number(nextValue)
  if (Number.isFinite(numericValue)) {
    onChange(numericValue)
  }
}

const onSubmit = handleSubmit(
  async (formValues) => {
    isSaving.value = true

    try {
      await $fetch('/api/admin/waiting-room-settings', {
        method: 'PUT',
        body: formValues,
      })
      await refresh()
      toast.success(t('admin.waiting_room_settings.updated'))
    }
    catch (error) {
      if (error && typeof error === 'object') {
        toast.error(getErrorMessage(error, t('admin.waiting_room_settings.update_failed')))
        return
      }

      toast.error(t('admin.waiting_room_settings.update_failed'))
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || t('admin.waiting_room_settings.fix_settings')
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
          {{ $t('admin.waiting_room_settings.title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ $t('admin.waiting_room_settings.desc') }}
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
                  {{ $t('admin.waiting_room_settings.threshold_label') }}
                </FieldLabel>
                <Input
                  id="waiting-room-threshold"
                  type="number"
                  min="1"
                  :model-value="String(field.value ?? '')"
                  :aria-invalid="!!errors.length"
                  @update:model-value="updatePositiveNumber(field.onChange, $event)"
                />
                <FieldDescription>{{ $t('admin.waiting_room_settings.threshold_desc') }}</FieldDescription>
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
                  {{ $t('admin.waiting_room_settings.batch_size_label') }}
                </FieldLabel>
                <Input
                  id="waiting-room-batch-size"
                  type="number"
                  min="1"
                  :model-value="String(field.value ?? '')"
                  :aria-invalid="!!errors.length"
                  @update:model-value="updatePositiveNumber(field.onChange, $event)"
                />
                <FieldDescription>{{ $t('admin.waiting_room_settings.batch_size_desc') }}</FieldDescription>
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
                  {{ $t('admin.waiting_room_settings.window_seconds_label') }}
                </FieldLabel>
                <Input
                  id="waiting-room-window"
                  type="number"
                  min="1"
                  :model-value="String(field.value ?? '')"
                  :aria-invalid="!!errors.length"
                  @update:model-value="updatePositiveNumber(field.onChange, $event)"
                />
                <FieldDescription>{{ $t('admin.waiting_room_settings.window_seconds_desc') }}</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>
          </FieldGroup>

          <div class="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted-foreground">
              {{ $t('admin.waiting_room_settings.session_note') }}
            </p>
            <Button
              type="submit"
              :is-loading="isSaving"
            >
              {{ $t('admin.waiting_room_settings.save_button') }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
