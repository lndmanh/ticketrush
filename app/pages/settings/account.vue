<script setup lang="ts">
import { Camera, CheckCircle2, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { SavedAttendeeGender } from '#shared/commonEnums'
import { apiRoutes } from '#shared/apiRoutes'
import { apiRequest } from '@/utils/apiRequest'
import { parseApiError } from '@/utils/apiError'
import type { ApiResponse } from '~~/types/api'
import type { UserProfileModel } from '~~/types/models/profile'

definePageMeta({
  title: 'account_page.title',
  breadcrumb: 'account_page.breadcrumb',
  middleware: 'auth',
  layout: 'dashboard',
})

const { t } = useI18n()

const { data: profileResponse, refresh: refreshProfile } = await useAPI<ApiResponse<UserProfileModel>>(() => apiRoutes.MY_PROFILE)

const profile = computed(() => profileResponse.value?.success ? profileResponse.value.data : null)
const isSaving = ref(false)

const form = reactive({
  name: '',
  email: '',
  countryCode: '+84',
  phone: '',
  birthDate: '',
  gender: SavedAttendeeGender.PreferNotToSay,
})

const initial = computed(() => {
  const name = form.name.trim() || form.email.trim() || profile.value?.username || 'T'
  return name.charAt(0).toUpperCase()
})

function formatBirthDate(value: Date | string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

function splitPhone(value: string | null) {
  if (!value) {
    return { countryCode: '+84', phone: '' }
  }

  const trimmed = value.trim()
  if (trimmed.startsWith('+84')) {
    return {
      countryCode: '+84',
      phone: trimmed.slice(3).trim(),
    }
  }

  return { countryCode: '+84', phone: trimmed }
}

function normalizeGender(value: string | null) {
  if (value === SavedAttendeeGender.Female || value === SavedAttendeeGender.Male || value === SavedAttendeeGender.NonBinary || value === SavedAttendeeGender.PreferNotToSay) {
    return value
  }

  return SavedAttendeeGender.PreferNotToSay
}

function syncProfileToForm(value: UserProfileModel | null) {
  if (!value) {
    return
  }

  const phoneParts = splitPhone(value.phone)
  form.name = value.name || ''
  form.email = value.email || ''
  form.countryCode = phoneParts.countryCode
  form.phone = phoneParts.phone
  form.birthDate = formatBirthDate(value.birthDate)
  form.gender = normalizeGender(value.gender)
}

watch(profile, syncProfileToForm, { immediate: true })

async function saveProfile() {
  if (isSaving.value || !profile.value) {
    return
  }

  isSaving.value = true

  try {
    const phone = form.phone.trim() ? `${form.countryCode} ${form.phone.trim()}` : null
    const response = await apiRequest<ApiResponse<Pick<UserProfileModel, 'id' | 'username' | 'name' | 'email' | 'phone' | 'birthDate' | 'gender'>>>(`/api/users/${profile.value.id}/profile`, {
      method: 'PATCH',
      body: {
        name: form.name,
        email: form.email,
        phone,
        birthDate: form.birthDate || null,
        gender: form.gender,
      },
    })

    if (!response.success) {
      throw response
    }

    toast.success(t('account_page.saved_toast'))
    await refreshProfile()
  }
  catch (error) {
    toast.error(parseApiError(error, t('account_page.save_error')).message)
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100dvh-8rem)] rounded-[2rem] border bg-[#202123] px-4 py-8 text-white shadow-2xl shadow-black/20 sm:px-6 lg:px-10">
    <div class="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside class="hidden lg:block">
        <div class="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4">
          <div class="flex size-11 items-center justify-center rounded-full bg-pink-600 text-lg font-semibold text-white">
            {{ initial }}
          </div>
          <div class="min-w-0">
            <p class="text-xs text-white/60">{{ $t('account_page.account_of') }}</p>
            <p class="truncate font-semibold">{{ form.name || profile?.username }}</p>
          </div>
        </div>
      </aside>

      <section class="min-w-0">
        <div class="border-b border-white/10 pb-4">
          <h1 class="text-3xl font-bold tracking-tight text-white">
            {{ $t('account_page.title') }}
          </h1>
        </div>

        <form
          class="mx-auto mt-8 max-w-md space-y-6"
          @submit.prevent="saveProfile"
        >
          <div class="flex flex-col items-center gap-5 text-center">
            <div class="relative">
              <div class="flex size-32 items-center justify-center rounded-full bg-pink-600 text-7xl font-light text-white shadow-[0_18px_60px_-18px_rgba(219,39,119,0.9)]">
                {{ initial }}
              </div>
              <button
                type="button"
                class="absolute bottom-2 right-1 flex size-9 items-center justify-center rounded-full border-2 border-[#202123] bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                :aria-label="$t('account_page.change_avatar')"
              >
                <Camera class="size-4" />
              </button>
            </div>

            <p class="max-w-sm text-sm leading-7 text-white/80">
              {{ $t('account_page.description') }}
            </p>
          </div>

          <div class="space-y-2">
            <Label for="account-name" class="font-semibold text-white">{{ $t('account_page.full_name') }}</Label>
            <Input
              id="account-name"
              v-model="form.name"
              class="h-12 border-white/10 bg-white text-slate-950 placeholder:text-slate-400"
              :placeholder="$t('account_page.full_name')"
            />
          </div>

          <div class="space-y-2">
            <Label for="account-phone" class="font-semibold text-white">{{ $t('account_page.phone') }}</Label>
            <div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
              <Select v-model="form.countryCode">
                <SelectTrigger class="h-12 border-white/10 bg-white text-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+84">+84</SelectItem>
                  <SelectItem value="+1">+1</SelectItem>
                  <SelectItem value="+81">+81</SelectItem>
                  <SelectItem value="+82">+82</SelectItem>
                </SelectContent>
              </Select>

              <div class="relative">
                <Input
                  id="account-phone"
                  v-model="form.phone"
                  class="h-12 border-white/10 bg-white pr-10 text-slate-950 placeholder:text-slate-400"
                  inputmode="tel"
                  :placeholder="$t('account_page.phone')"
                />
                <button
                  v-if="form.phone"
                  type="button"
                  class="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  :aria-label="$t('account_page.clear_phone')"
                  @click="form.phone = ''"
                >
                  <X class="size-5" />
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="account-email" class="font-semibold text-white">{{ $t('account_page.email') }}</Label>
            <div class="relative">
              <Input
                id="account-email"
                v-model="form.email"
                class="h-12 border-white/10 bg-white pr-10 text-slate-950 placeholder:text-slate-400"
                type="email"
                :placeholder="$t('account_page.email')"
              />
              <CheckCircle2 class="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-emerald-500" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="account-birth-date" class="font-semibold text-white">{{ $t('account_page.birth_date') }}</Label>
            <Input
              id="account-birth-date"
              v-model="form.birthDate"
              class="h-12 border-white/10 bg-white text-slate-950"
              type="date"
            />
          </div>

          <fieldset class="space-y-3">
            <legend class="font-semibold text-white">{{ $t('account_page.gender') }}</legend>
            <div class="flex flex-wrap gap-6">
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-white">
                <input
                  v-model="form.gender"
                  type="radio"
                  :value="SavedAttendeeGender.Male"
                  class="size-5 accent-emerald-500"
                >
                {{ $t('account_page.gender_male') }}
              </label>
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-white">
                <input
                  v-model="form.gender"
                  type="radio"
                  :value="SavedAttendeeGender.Female"
                  class="size-5 accent-emerald-500"
                >
                {{ $t('account_page.gender_female') }}
              </label>
              <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-white">
                <input
                  v-model="form.gender"
                  type="radio"
                  :value="SavedAttendeeGender.PreferNotToSay"
                  class="size-5 accent-emerald-500"
                >
                {{ $t('account_page.gender_other') }}
              </label>
            </div>
          </fieldset>

          <Button
            type="submit"
            class="h-12 w-full bg-emerald-500 font-semibold text-white transition hover:bg-emerald-400"
            :is-loading="isSaving"
          >
            {{ $t('account_page.complete') }}
          </Button>
        </form>
      </section>
    </div>
  </div>
</template>
