<script setup lang="ts">
import { computed, ref } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { savedAttendeeFormSchema } from '#shared/schemas/savedAttendeeSchema'
import { PlusIcon, UserIcon, Trash2Icon, Edit2Icon, ShieldIcon } from '@lucide/vue'

const { data: attendeesResponse, refresh, status, error: fetchError } = useFetch('/api/saved-attendees')
const attendees = computed(() => attendeesResponse.value?.data || [])
const loading = computed(() => status.value === 'pending')

const isDialogOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)

type AttendeeFormValues = {
  legalName: string
  preferredName?: string
  email?: string
  phone?: string
  birthDate?: string
  gender: string
  guardianName?: string
  guardianEmail?: string
  guardianPhone?: string
  notes?: string
  accessibilityNeeds?: string
  isSelf: boolean
}

const defaultValues: AttendeeFormValues = {
  legalName: '',
  preferredName: '',
  email: '',
  phone: '',
  birthDate: undefined,
  gender: 'prefer-not-to-say',
  guardianName: '',
  guardianEmail: '',
  guardianPhone: '',
  notes: '',
  accessibilityNeeds: '',
  isSelf: false,
}

const { handleSubmit, resetForm, setValues } = useForm({
  initialValues: defaultValues,
  validationSchema: savedAttendeeFormSchema,
})

const { user } = useUserSession()

function openCreateDialog() {
  editingId.value = null
  resetForm({ values: defaultValues })
  isDialogOpen.value = true
}

type AttendeeItem = {
  id: number
  legalName: string
  preferredName?: string | null
  email?: string | null
  phone?: string | null
  birthDate?: string | Date | null
  gender?: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say' | null
  guardianName?: string | null
  guardianEmail?: string | null
  guardianPhone?: string | null
  notes?: string | null
  accessibilityNeeds?: string | null
  isSelf?: boolean | null
}

function openEditDialog(attendee: AttendeeItem) {
  editingId.value = attendee.id

  let formattedBirthDate: string | undefined = undefined
  if (attendee.birthDate) {
    const d = new Date(attendee.birthDate)
    if (!isNaN(d.getTime())) {
      formattedBirthDate = d.toISOString().split('T')[0]
    }
  }

  setValues({
    legalName: attendee.legalName,
    preferredName: attendee.preferredName || undefined,
    email: attendee.email || undefined,
    phone: attendee.phone || undefined,
    birthDate: formattedBirthDate,
    gender: attendee.gender || 'prefer-not-to-say',
    guardianName: attendee.guardianName || undefined,
    guardianEmail: attendee.guardianEmail || undefined,
    guardianPhone: attendee.guardianPhone || undefined,
    notes: attendee.notes || undefined,
    accessibilityNeeds: attendee.accessibilityNeeds || undefined,
    isSelf: attendee.isSelf || false,
  })
  isDialogOpen.value = true
}

function createFromProfile() {
  editingId.value = null
  resetForm({
    values: {
      ...defaultValues,
      legalName: user.value?.name || '',
      email: user.value?.email || '',
      isSelf: true,
    },
  })
  isDialogOpen.value = true
}

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/saved-attendees/${editingId.value}`, {
        method: 'PATCH',
        body: values,
      })
      toast.success('Attendee updated successfully')
    }
    else {
      await $fetch('/api/saved-attendees', {
        method: 'POST',
        body: values,
      })
      toast.success('Attendee saved successfully')
    }
    isDialogOpen.value = false
    await refresh()
  }
  catch {
    toast.error('Failed to save attendee. Please try again.')
  }
  finally {
    isSubmitting.value = false
  }
})

async function deleteAttendee(id: number) {
  if (!window.confirm('Are you sure you want to delete this attendee? This action cannot be undone.')) {
    return
  }

  try {
    await $fetch(`/api/saved-attendees/${id}`, {
      method: 'DELETE',
    })
    toast.success('Attendee deleted successfully')
    await refresh()
  }
  catch {
    toast.error('Failed to delete attendee. Please try again.')
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'
}

function isMinor(birthDate?: Date | string | null) {
  if (!birthDate) return false
  const date = new Date(birthDate)
  if (isNaN(date.getTime())) return false

  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--
  }
  return age < 18
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          Saved Attendees
        </h1>
        <p class="text-muted-foreground mt-1">
          Manage profiles for quicker checkout when buying tickets for yourself and others.
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          variant="outline"
          :disabled="loading"
          @click="createFromProfile"
        >
          <UserIcon class="w-4 h-4 mr-2" />
          Add Myself
        </Button>
        <Button
          :disabled="loading"
          @click="openCreateDialog"
        >
          <PlusIcon class="w-4 h-4 mr-2" />
          Add Attendee
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <Card
        v-for="i in 3"
        :key="i"
        class="animate-pulse flex flex-col justify-between"
      >
        <div class="p-6 space-y-4">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-muted rounded-full" />
            <div class="space-y-2">
              <div class="h-4 bg-muted rounded w-24" />
              <div class="h-3 bg-muted rounded w-32" />
            </div>
          </div>
          <div class="space-y-2 pt-2">
            <div class="h-3 bg-muted rounded w-full" />
            <div class="h-3 bg-muted rounded w-4/5" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Error State -->
    <div
      v-else-if="fetchError"
      class="text-center py-12 px-4 border rounded-xl bg-destructive/10 border-destructive/20 border-dashed"
    >
      <h3 class="text-lg font-semibold text-destructive mb-1">
        Failed to load attendees
      </h3>
      <p class="text-muted-foreground mb-6 max-w-sm mx-auto">
        There was a problem communicating with the server. Please try again.
      </p>
      <div class="flex justify-center">
        <Button
          variant="outline"
          @click="refresh()"
        >
          Retry
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="attendees.length === 0"
      class="text-center py-12 px-4 border rounded-xl bg-muted/20 border-dashed"
    >
      <div class="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <UserIcon class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-semibold mb-1">
        No attendees saved
      </h3>
      <p class="text-muted-foreground mb-6 max-w-sm mx-auto">
        Save the details of people you frequently buy tickets for to speed up your checkout process.
      </p>
      <div class="flex justify-center gap-3">
        <Button
          variant="outline"
          @click="createFromProfile"
        >
          Add Myself
        </Button>
        <Button @click="openCreateDialog">
          Add Attendee
        </Button>
      </div>
    </div>

    <!-- Grid View -->
    <div
      v-else
      class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <Card
        v-for="attendee in attendees"
        :key="attendee.id"
        class="flex flex-col relative overflow-hidden group"
      >
        <div
          v-if="attendee.isSelf"
          class="absolute top-0 right-0 bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-bl-lg"
        >
          Self
        </div>
        <div class="p-5 flex-1 space-y-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-medium">
                {{ getInitials(attendee.preferredName || attendee.legalName) }}
              </div>
              <div>
                <h3 class="font-semibold text-lg leading-tight truncate max-w-[140px] sm:max-w-[180px]">
                  {{ attendee.preferredName || attendee.legalName }}
                </h3>
                <p
                  v-if="attendee.preferredName"
                  class="text-xs text-muted-foreground truncate"
                >
                  Legal: {{ attendee.legalName }}
                </p>
              </div>
            </div>
          </div>

          <div class="text-sm space-y-1.5 pt-1">
            <div
              v-if="attendee.email"
              class="flex items-center text-muted-foreground"
            >
              <span class="truncate">{{ attendee.email }}</span>
            </div>
            <div
              v-if="attendee.phone"
              class="flex items-center text-muted-foreground"
            >
              <span class="truncate">{{ attendee.phone }}</span>
            </div>
            <div
              v-if="!attendee.email && !attendee.phone"
              class="text-muted-foreground italic text-xs"
            >
              No direct contact info
            </div>

            <div
              v-if="isMinor(attendee.birthDate)"
              class="inline-flex items-center bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full mt-2"
            >
              <ShieldIcon class="w-3 h-3 mr-1" />
              Minor
            </div>
            <div
              v-if="attendee.guardianName"
              class="text-xs text-muted-foreground mt-1 line-clamp-1"
            >
              Guardian: {{ attendee.guardianName }}
            </div>
          </div>
        </div>

        <div class="border-t p-2 flex justify-end gap-1 bg-muted/20 opacity-100 sm:opacity-0 focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            @click="openEditDialog(attendee)"
          >
            <Edit2Icon class="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="text-destructive hover:text-destructive"
            @click="deleteAttendee(attendee.id)"
          >
            <Trash2Icon class="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </Card>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogScrollContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{{ editingId ? 'Edit Attendee' : 'Add Attendee' }}</DialogTitle>
          <DialogDescription>
            Enter the details for this attendee. Information saved here can be auto-filled during checkout.
          </DialogDescription>
        </DialogHeader>

        <form
          class="space-y-6 py-4"
          @submit.prevent="onSubmit"
        >
          <FieldGroup>
            <div class="flex items-center justify-between p-3 border rounded-lg bg-muted/20 mb-4">
              <div>
                <p class="font-medium text-sm">
                  This is my profile
                </p>
                <p class="text-xs text-muted-foreground">
                  Check this if you are saving your own details.
                </p>
              </div>
              <VeeField
                v-slot="{ field, value }"
                name="isSelf"
                type="checkbox"
              >
                <Switch
                  :model-value="value"
                  @update:model-value="field.onChange"
                />
              </VeeField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VeeField
                v-slot="{ field, errors }"
                name="legalName"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.legal_name') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    :placeholder="$t('saved_attendees.legal_name_placeholder')"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="preferredName"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.preferred_name') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    :placeholder="$t('saved_attendees.preferred_name_placeholder')"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VeeField
                v-slot="{ field, errors }"
                name="email"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.email') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    type="email"
                    :placeholder="$t('saved_attendees.email_placeholder')"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="phone"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.phone') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    type="tel"
                    placeholder="+1234567890"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <VeeField
                v-slot="{ field, errors }"
                name="birthDate"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.birth_date') }}</FieldLabel>
                  <Input
                    v-bind="field"
                    type="date"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, value, errors }"
                name="gender"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.gender') }}</FieldLabel>
                  <Select
                    :model-value="value"
                    @update:model-value="field.onChange"
                  >
                    <SelectTrigger>
                      <SelectValue :placeholder="$t('saved_attendees.gender_placeholder')" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">
                        {{ $t('saved_attendees.gender_female') }}
                      </SelectItem>
                      <SelectItem value="male">
                        {{ $t('saved_attendees.gender_male') }}
                      </SelectItem>
                      <SelectItem value="non-binary">
                        {{ $t('saved_attendees.gender_non_binary') }}
                      </SelectItem>
                      <SelectItem value="prefer-not-to-say">
                        {{ $t('saved_attendees.gender_prefer_not') }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </div>

            <div class="pt-4 border-t">
              <h4 class="text-sm font-medium mb-3">
                {{ $t('saved_attendees.guardian_section') }}
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VeeField
                  v-slot="{ field, errors }"
                  name="guardianName"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel>{{ $t('saved_attendees.guardian_name') }}</FieldLabel>
                    <Input
                      v-bind="field"
                      :placeholder="$t('saved_attendees.guardian_name_placeholder')"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="guardianPhone"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel>{{ $t('saved_attendees.guardian_phone') }}</FieldLabel>
                    <Input
                      v-bind="field"
                      type="tel"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <div class="md:col-span-2">
                  <VeeField
                    v-slot="{ field, errors }"
                    name="guardianEmail"
                  >
                    <Field :data-invalid="!!errors.length">
                      <FieldLabel>{{ $t('saved_attendees.guardian_email') }}</FieldLabel>
                      <Input
                        v-bind="field"
                        type="email"
                      />
                      <FieldError
                        v-if="errors.length"
                        :errors="errors"
                      />
                    </Field>
                  </VeeField>
                </div>
              </div>
            </div>

            <div class="pt-4 border-t space-y-4">
              <h4 class="text-sm font-medium">
                {{ $t('saved_attendees.additional_section') }}
              </h4>

              <VeeField
                v-slot="{ field, errors }"
                name="accessibilityNeeds"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.accessibility') }}</FieldLabel>
                  <Textarea
                    v-bind="field"
                    :placeholder="$t('saved_attendees.accessibility_placeholder')"
                    class="resize-none h-20"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>

              <VeeField
                v-slot="{ field, errors }"
                name="notes"
              >
                <Field :data-invalid="!!errors.length">
                  <FieldLabel>{{ $t('saved_attendees.notes') }}</FieldLabel>
                  <Textarea
                    v-bind="field"
                    :placeholder="$t('saved_attendees.notes_placeholder')"
                    class="resize-none h-20"
                  />
                  <FieldError
                    v-if="errors.length"
                    :errors="errors"
                  />
                </Field>
              </VeeField>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              :disabled="isSubmitting"
              @click="isDialogOpen = false"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              :is-loading="isSubmitting"
            >
              {{ editingId ? 'Save Changes' : 'Add Attendee' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogScrollContent>
    </Dialog>
  </div>
</template>
