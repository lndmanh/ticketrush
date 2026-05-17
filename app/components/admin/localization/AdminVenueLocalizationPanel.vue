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
const { t } = useI18n()
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
    toast.success(t('admin_localization.venue_saved'))
  }
  catch (error) {
    toast.error(t(parseApiError(error, 'admin_localization.venue_save_failed').message))
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
          {{ $t('admin_localization.venue_title') }}
        </CardTitle>
        <CardDescription>
          {{ $t('admin_localization.venue_desc') }}
        </CardDescription>
      </div>

      <Select
        v-if="translatableLocales.length > 0"
        :model-value="selectedLocale"
        @update:model-value="selectLocale"
      >
        <SelectTrigger class="w-full sm:w-48">
          <SelectValue :placeholder="$t('admin_localization.choose_locale')" />
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
        {{ $t('admin_localization.no_locales') }}
      </p>
    </CardContent>

    <CardContent v-else>
      <div class="space-y-6">
        <div class="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p class="font-medium text-foreground">
            {{ $t('admin_localization.source', { name: translationData?.venue.name || $t('admin_localization.untitled_venue') }) }}
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
                {{ $t('admin.columns.name') }}
              </FieldLabel>
              <Input
                id="venue-translation-name"
                :model-value="field.value ?? ''"
                :aria-invalid="!!errors.length"
                :placeholder="$t('admin_localization.venue_name_placeholder')"
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
                {{ $t('admin_localization.field_description') }}
              </FieldLabel>
              <Textarea
                id="venue-translation-description"
                :model-value="field.value ?? ''"
                :aria-invalid="!!errors.length"
                :placeholder="$t('admin_localization.venue_description_placeholder')"
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
                      {{ $t('admin.venues.city') }}
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
                        <SelectValue :placeholder="$t('admin_localization.localized_city')" />
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
                    {{ $t('admin_localization.clear') }}
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
                  {{ $t('admin.venues.address') }}
                </FieldLabel>
                <Input
                  id="venue-translation-address"
                  :model-value="field.value ?? ''"
                  :aria-invalid="!!errors.length"
                  :placeholder="$t('admin_localization.localized_address')"
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
            {{ $t('common.reset') }}
          </Button>
          <Button
            type="button"
            :is-loading="isSaving"
            @click="() => onSubmit()"
          >
            {{ $t('admin_localization.save_locale_copy', { locale: languageNames[selectedLocale] }) }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
