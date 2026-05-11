<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'
import { Globe2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ApiResponse } from '~~/types/api'
import type { AdminEventTranslationData, AdminTicketTypeTranslationSource } from '~~/types/admin-localization'
import type { EventTranslationInput } from '#shared/schemas/ticketingSchema'
import { eventTranslationSchema } from '#shared/schemas/ticketingSchema'
import { languageNames, locales, sourceLocale } from '~~/i18n-constants'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'

const props = defineProps<{
  eventId: number
}>()

const translatableLocales = locales.filter(localeCode => localeCode !== sourceLocale)
const initialLocale = translatableLocales[0] ?? sourceLocale
const selectedLocale = ref(initialLocale)
const isSaving = ref(false)

const { data: translationResponse, refresh } = await useAPI<ApiResponse<AdminEventTranslationData>>(() => apiRoutes.adminEventTranslations(props.eventId))

const translationData = computed(() => {
  const response = translationResponse.value
  return response?.success ? response.data : null
})

const sourceTicketTypes = computed(() => {
  return [...(translationData.value?.ticketTypes ?? [])].sort((left, right) => left.sortOrder - right.sortOrder)
})

const defaultValues: EventTranslationInput = {
  locale: initialLocale,
  title: '',
  subtitle: '',
  description: '',
  ticketTypes: [],
}

const { handleSubmit, resetForm } = useForm<EventTranslationInput>({
  initialValues: defaultValues,
  validationSchema: eventTranslationSchema,
  keepValuesOnUnmount: true,
})

function getEventTranslation(localeCode: string) {
  return translationData.value?.eventTranslations.find(translation => translation.locale === localeCode)
}

function getTicketTypeTranslation(ticketType: AdminTicketTypeTranslationSource, localeCode: string) {
  return translationData.value?.ticketTypeTranslations.find((translation) => {
    return translation.ticketTypeId === ticketType.id && translation.locale === localeCode
  })
}

function getFormValues(localeCode: typeof initialLocale): EventTranslationInput {
  const eventTranslation = getEventTranslation(localeCode)
  return {
    locale: localeCode,
    title: eventTranslation?.title ?? '',
    subtitle: eventTranslation?.subtitle ?? '',
    description: eventTranslation?.description ?? '',
    ticketTypes: sourceTicketTypes.value.map((ticketType) => {
      const ticketTypeTranslation = getTicketTypeTranslation(ticketType, localeCode)
      return {
        ticketTypeId: ticketType.id,
        name: ticketTypeTranslation?.name ?? '',
        description: ticketTypeTranslation?.description ?? '',
      }
    }),
  }
}

function resetSelectedLocaleForm() {
  resetForm({ values: getFormValues(selectedLocale.value) })
}

function selectLocale(value: string) {
  const matchedLocale = translatableLocales.find(localeCode => localeCode === value)
  if (matchedLocale) {
    selectedLocale.value = matchedLocale
  }
}

const onSubmit = handleSubmit(async (values) => {
  isSaving.value = true
  try {
    const response = await apiRequest<ApiResponse<AdminEventTranslationData>>(apiRoutes.adminEventTranslation(props.eventId, values.locale), {
      method: 'PUT',
      body: values,
    })

    if (!response.success) {
      throw response
    }

    await refresh()
    toast.success('Localized event copy saved')
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to save localized event copy').message)
  }
  finally {
    isSaving.value = false
  }
})

watch([translationData, selectedLocale], resetSelectedLocaleForm, { immediate: true })
</script>

<template>
  <Dialog>
    <DialogTrigger as-child>
      <Button variant="outline">
        <Globe2 class="size-4" />
        Edit localization
      </Button>
    </DialogTrigger>

    <DialogScrollContent class="max-w-4xl">
      <DialogHeader>
        <div>
          <DialogTitle class="flex items-center gap-2">
            <Globe2 class="size-4 text-muted-foreground" />
            Localized event information
          </DialogTitle>
          <DialogDescription>
            Vietnamese is the source copy. Add translated marketing copy for each public locale.
          </DialogDescription>
        </div>
      </DialogHeader>

      <div
        v-if="translatableLocales.length > 0"
        class="flex justify-end"
      >
        <Select
          :model-value="selectedLocale"
          @update:model-value="selectLocale"
        >
          <SelectTrigger
            aria-label="Translation locale"
            class="w-full sm:w-48"
          >
            <SelectValue placeholder="Choose locale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="localeCode in translatableLocales"
              :key="localeCode"
              :value="localeCode"
            >
              {{ languageNames[localeCode] }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        v-if="translatableLocales.length === 0"
        class="text-sm text-muted-foreground"
      >
        Add another locale in i18n constants before creating translations.
      </div>

      <form
        v-else
        class="space-y-6"
        @submit.prevent="onSubmit"
      >
        <div class="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p class="font-medium text-foreground">
            Source: {{ translationData?.event.title || 'Untitled event' }}
          </p>
          <p class="mt-2 line-clamp-3">
            {{ translationData?.event.description }}
          </p>
        </div>

        <FieldGroup>
          <VeeField
            v-slot="{ field, errors }"
            name="title"
          >
            <Field :data-invalid="!!errors.length">
              <FieldLabel for="event-translation-title">
                Title
              </FieldLabel>
              <Input
                id="event-translation-title"
                :model-value="field.value ?? ''"
                :aria-invalid="!!errors.length"
                placeholder="Localized event title"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
              <FieldDescription>{{ translationData?.event.title }}</FieldDescription>
              <FieldError
                v-if="errors.length"
                :errors="errors"
              />
            </Field>
          </VeeField>

          <VeeField
            v-slot="{ field, errors }"
            name="subtitle"
          >
            <Field :data-invalid="!!errors.length">
              <FieldLabel for="event-translation-subtitle">
                Subtitle
              </FieldLabel>
              <Input
                id="event-translation-subtitle"
                :model-value="field.value ?? ''"
                :aria-invalid="!!errors.length"
                placeholder="Localized event subtitle"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
              <FieldDescription>{{ translationData?.event.subtitle }}</FieldDescription>
              <FieldError
                v-if="errors.length"
                :errors="errors"
              />
            </Field>
          </VeeField>

          <VeeField
            v-slot="{ field, errors }"
            name="description"
          >
            <Field :data-invalid="!!errors.length">
              <FieldLabel for="event-translation-description">
                Description
              </FieldLabel>
              <Textarea
                id="event-translation-description"
                :model-value="field.value ?? ''"
                :aria-invalid="!!errors.length"
                placeholder="Localized event description"
                class="min-h-32"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
              <FieldDescription>{{ translationData?.event.description }}</FieldDescription>
              <FieldError
                v-if="errors.length"
                :errors="errors"
              />
            </Field>
          </VeeField>
        </FieldGroup>

        <FieldSet v-if="sourceTicketTypes.length > 0">
          <FieldLegend variant="label">
            Ticket release copy
          </FieldLegend>
          <FieldDescription>
            Localize release names and descriptions shown during purchase.
          </FieldDescription>
          <FieldGroup class="mt-4">
            <div
              v-for="(ticketType, index) in sourceTicketTypes"
              :key="ticketType.id"
              class="rounded-2xl border p-4"
            >
              <VeeField
                v-slot="{ field }"
                :name="`ticketTypes[${index}].ticketTypeId`"
              >
                <input
                  type="hidden"
                  :value="field.value"
                >
              </VeeField>
              <p class="text-sm font-medium text-foreground">
                {{ ticketType.name }}
              </p>
              <p
                v-if="ticketType.description"
                class="mt-1 text-sm text-muted-foreground"
              >
                {{ ticketType.description }}
              </p>

              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <VeeField
                  v-slot="{ field, errors }"
                  :name="`ticketTypes[${index}].name`"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel :for="`ticket-type-${ticketType.id}-name`">
                      Release name
                    </FieldLabel>
                    <Input
                      :id="`ticket-type-${ticketType.id}-name`"
                      :model-value="field.value ?? ''"
                      :aria-invalid="!!errors.length"
                      placeholder="Localized release name"
                      @update:model-value="field.onChange"
                      @blur="field.onBlur"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  :name="`ticketTypes[${index}].description`"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel :for="`ticket-type-${ticketType.id}-description`">
                      Release description
                    </FieldLabel>
                    <Input
                      :id="`ticket-type-${ticketType.id}-description`"
                      :model-value="field.value ?? ''"
                      :aria-invalid="!!errors.length"
                      placeholder="Localized release description"
                      @update:model-value="field.onChange"
                      @blur="field.onBlur"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>
              </div>
            </div>
          </FieldGroup>
        </FieldSet>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            @click="resetSelectedLocaleForm"
          >
            Reset
          </Button>
          <Button
            type="submit"
            :is-loading="isSaving"
          >
            Save {{ languageNames[selectedLocale] }} copy
          </Button>
        </DialogFooter>
      </form>
    </DialogScrollContent>
  </Dialog>
</template>
