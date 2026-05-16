<script setup lang="ts">
import { Field as VeeField, useForm } from 'vee-validate'
import { Globe2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { ApiResponse } from '~~/types/api'
import type { AdminVenueTranslationData } from '~~/types/admin-localization'
import type { VenueTranslationInput } from '#shared/schemas/ticketingSchema'
import { venueTranslationSchema } from '#shared/schemas/ticketingSchema'
import { languageNames, locales, sourceLocale } from '~~/i18n-constants'
import { getVietnamProvinceCityOptions } from '#shared/constants/location'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import { apiRoutes } from '#shared/apiRoutes'

const props = defineProps<{
  venueId: number
}>()

const translatableLocales = locales.filter(localeCode => localeCode !== sourceLocale)
const initialLocale = translatableLocales[0] ?? sourceLocale
const selectedLocale = ref(initialLocale)
const isSaving = ref(false)
const cityOptions = computed(() => getVietnamProvinceCityOptions(selectedLocale.value))

const { data: translationResponse, refresh } = await useAPI<ApiResponse<AdminVenueTranslationData>>(() => apiRoutes.adminVenueTranslations(props.venueId))

const translationData = computed(() => {
  const response = translationResponse.value
  return response?.success ? response.data : null
})

const defaultValues: VenueTranslationInput = {
  locale: initialLocale,
  name: '',
  description: '',
  city: '',
  address: '',
}

const { handleSubmit, resetForm, setFieldValue } = useForm<VenueTranslationInput>({
  initialValues: defaultValues,
  validationSchema: venueTranslationSchema,
  keepValuesOnUnmount: true,
})

function getVenueTranslation(localeCode: string) {
  return translationData.value?.translations.find(translation => translation.locale === localeCode)
}

function getFormValues(localeCode: typeof initialLocale): VenueTranslationInput {
  const translation = getVenueTranslation(localeCode)
  return {
    locale: localeCode,
    name: translation?.name ?? '',
    description: translation?.description ?? '',
    city: translation?.city ?? '',
    address: translation?.address ?? '',
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
    const response = await apiRequest<ApiResponse<AdminVenueTranslationData>>(apiRoutes.adminVenueTranslation(props.venueId, values.locale), {
      method: 'PUT',
      body: values,
    })

    if (!response.success) {
      throw response
    }

    await refresh()
    toast.success('Localized venue copy saved')
  }
  catch (error) {
    toast.error(parseApiError(error, 'Failed to save localized venue copy').message)
  }
  finally {
    isSaving.value = false
  }
})

function stopParentFormSubmitFromInput(event: KeyboardEvent) {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }

  event.stopPropagation()
  event.preventDefault()
}

watch([translationData, selectedLocale], resetSelectedLocaleForm, { immediate: true })
</script>

<template>
  <Card @keydown.enter="stopParentFormSubmitFromInput">
    <CardHeader class="gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <CardTitle class="flex items-center gap-2">
          <Globe2 class="size-4 text-muted-foreground" />
          Localized venue information
        </CardTitle>
        <CardDescription>
          Vietnamese is the source copy. Add translated venue copy for each public locale.
        </CardDescription>
      </div>

      <Select
        v-if="translatableLocales.length > 0"
        :model-value="selectedLocale"
        @update:model-value="selectLocale"
      >
        <SelectTrigger class="w-full sm:w-48">
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
    </CardHeader>

    <CardContent v-if="translatableLocales.length === 0">
      <p class="text-sm text-muted-foreground">
        Add another locale in i18n constants before creating translations.
      </p>
    </CardContent>

    <CardContent v-else>
      <div class="space-y-6">
        <div class="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p class="font-medium text-foreground">
            Source: {{ translationData?.venue.name || 'Untitled venue' }}
          </p>
          <p class="mt-2">
            {{ translationData?.venue.address }} · {{ translationData?.venue.city }}
          </p>
        </div>

        <FieldGroup>
          <VeeField
            v-slot="{ field, errors }"
            name="name"
          >
            <Field :data-invalid="!!errors.length">
              <FieldLabel for="venue-translation-name">
                Name
              </FieldLabel>
              <Input
                id="venue-translation-name"
                :model-value="field.value ?? ''"
                :aria-invalid="!!errors.length"
                placeholder="Localized venue name"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
              <FieldDescription>{{ translationData?.venue.name }}</FieldDescription>
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
              <FieldLabel for="venue-translation-description">
                Description
              </FieldLabel>
              <Textarea
                id="venue-translation-description"
                :model-value="field.value ?? ''"
                :aria-invalid="!!errors.length"
                placeholder="Localized venue description"
                class="min-h-28"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
              <FieldDescription>{{ translationData?.venue.description }}</FieldDescription>
              <FieldError
                v-if="errors.length"
                :errors="errors"
              />
            </Field>
          </VeeField>

          <div class="grid gap-4 md:grid-cols-2">
            <VeeField
              v-slot="{ field, errors }"
              name="city"
            >
              <Field :data-invalid="!!errors.length">
                <div class="flex items-end gap-2">
                  <div class="flex-1 space-y-2">
                    <FieldLabel for="venue-translation-city">
                      City
                    </FieldLabel>
                    <Select
                      :model-value="field.value ?? ''"
                      @update:model-value="field.onChange"
                    >
                      <SelectTrigger
                        id="venue-translation-city"
                        :aria-invalid="!!errors.length"
                        @blur="field.onBlur"
                      >
                        <SelectValue placeholder="Localized city" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="option in cityOptions"
                          :key="option.value"
                          :value="option.label"
                        >
                          {{ option.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    class="shrink-0"
                    @click="setFieldValue('city', '')"
                  >
                    Clear
                  </Button>
                </div>
                <FieldDescription>{{ translationData?.venue.city }}</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <VeeField
              v-slot="{ field, errors }"
              name="address"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="venue-translation-address">
                  Address
                </FieldLabel>
                <Input
                  id="venue-translation-address"
                  :model-value="field.value ?? ''"
                  :aria-invalid="!!errors.length"
                  placeholder="Localized address"
                  @update:model-value="field.onChange"
                  @blur="field.onBlur"
                />
                <FieldDescription>{{ translationData?.venue.address }}</FieldDescription>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>
          </div>
        </FieldGroup>

        <div class="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            @click="resetSelectedLocaleForm"
          >
            Reset
          </Button>
          <Button
            type="button"
            :is-loading="isSaving"
            @click="() => onSubmit()"
          >
            Save {{ languageNames[selectedLocale] }} copy
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
