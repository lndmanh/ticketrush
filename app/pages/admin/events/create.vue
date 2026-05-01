<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Field as VeeField, useForm } from 'vee-validate'
import { motion } from 'motion-v'
import { toast } from 'vue-sonner'
import { Check, Circle, Cloud, CloudAlert, Dot, Loader2 } from '@lucide/vue'
import { eventComposerSchema } from '#shared/schemas/ticketingSchema'
import type { EventComposerInput } from '#shared/schemas/ticketingSchema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field'

interface VenueOption {
  id: number
  name: string
}

interface VenueSectionDetail {
  id: number
  code: string
  name: string
  color: string
  rows: Array<{
    id: number
    label: string
    seats: Array<{ id: number, label: string, seatNumber: number }>
  }>
}

interface VenueDetailResponse {
  sections: VenueSectionDetail[]
}

interface EventCreationStep {
  step: number
  title: string
  description: string
}

const steps: EventCreationStep[] = [
  { step: 1, title: 'Basics', description: 'Event identity' },
  { step: 2, title: 'Venue', description: 'Select venue' },
  { step: 3, title: 'Sessions', description: 'Schedule and pricing' },
  { step: 4, title: 'Review', description: 'Confirm and save' },
]

const stepSchemas = {
  1: eventComposerSchema.pick({
    title: true,
    slug: true,
    subtitle: true,
    description: true,
    coverImage: true,
  }),
  2: eventComposerSchema.pick({
    venueId: true,
  }),
  3: eventComposerSchema.pick({
    sessions: true,
  }),
}

const { data: venuesResponse } = await useFetch('/api/admin/venues')
const venues = computed<VenueOption[]>(() => venuesResponse.value?.data ?? [])
const selectedVenueDetail = ref<VenueDetailResponse | null>(null)
const currentStep = ref(1)
const highestReachedStep = ref(1)
const isSaving = ref(false)
const autosaveDraftKey = ref('')
const autosaveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const lastAutosavedAt = ref<Date | null>(null)
const lastAutosaveSignature = ref('')
const autosaveDisabled = ref(false)
let autosaveRequestId = 0
let autosaveTimerId: number | null = null

const defaultValues: EventComposerInput = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  venueId: 0,
  coverImage: '',
  sessions: [],
}

const {
  handleSubmit,
  resetForm,
  setFieldError,
  setFieldValue,
  values,
} = useForm({
  initialValues: { ...defaultValues },
  validationSchema: eventComposerSchema,
  keepValuesOnUnmount: true,
})

const hasAutosavableContent = computed(() => {
  return Boolean(
    values.title?.trim()
    || values.slug?.trim()
    || values.subtitle?.trim()
    || values.description?.trim()
    || values.coverImage?.trim()
    || values.venueId
    || (values.sessions?.length ?? 0) > 0,
  )
})

const autosaveLabel = computed(() => {
  if (autosaveStatus.value === 'saving') {
    return 'Saving draft…'
  }

  if (autosaveStatus.value === 'saved') {
    return lastAutosavedAt.value ? `Saved ${lastAutosavedAt.value.toLocaleTimeString()}` : 'Draft saved'
  }

  if (autosaveStatus.value === 'error') {
    return 'Autosave failed'
  }

  return 'Autosave starts after you type'
})

const autosaveIcon = computed(() => {
  if (autosaveStatus.value === 'saving') {
    return Loader2
  }

  if (autosaveStatus.value === 'error') {
    return CloudAlert
  }

  return Cloud
})

function buildAutosavePayload() {
  return {
    slug: values.slug,
    title: values.title,
    subtitle: values.subtitle,
    description: values.description,
    venueId: values.venueId,
    coverImage: values.coverImage,
    sessions: (values.sessions ?? []).map(session => ({
      label: session.label,
      venueId: session.venueId,
      status: session.status,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      salesStartAt: session.salesStartAt,
      salesEndAt: session.salesEndAt,
      ticketTypes: (session.ticketTypes ?? []).map(ticketType => ({
        name: ticketType.name,
        venueSectionId: ticketType.venueSectionId ?? null,
        priceCents: ticketType.priceCents,
        currency: ticketType.currency,
        isReservedSeating: ticketType.isReservedSeating,
        capacity: ticketType.capacity,
        sortOrder: ticketType.sortOrder,
      })),
    })),
  }
}

async function saveAutosaveDraft() {
  if (autosaveDisabled.value || !hasAutosavableContent.value) {
    return
  }

  const payload = buildAutosavePayload()
  const signature = JSON.stringify({ payload, currentStep: currentStep.value })
  if (signature === lastAutosaveSignature.value) {
    return
  }

  autosaveStatus.value = 'saving'
  const requestId = autosaveRequestId + 1
  autosaveRequestId = requestId

  try {
    const response = await $fetch<{ data: { draftKey: string, updatedAt: string | Date | null } }>('/api/admin/events/autosave', {
      method: 'POST',
      body: {
        draftKey: autosaveDraftKey.value || undefined,
        lastSavedStep: currentStep.value,
        payload,
      },
    })

    if (autosaveDisabled.value || requestId !== autosaveRequestId) {
      return
    }

    autosaveDraftKey.value = response.data.draftKey
    lastAutosavedAt.value = response.data.updatedAt ? new Date(response.data.updatedAt) : new Date()
    lastAutosaveSignature.value = signature
    autosaveStatus.value = 'saved'

    if (import.meta.client) {
      window.localStorage.setItem('ticketrush:event-create-autosave-key', response.data.draftKey)
    }
  }
  catch {
    if (autosaveDisabled.value || requestId !== autosaveRequestId) {
      return
    }

    autosaveStatus.value = 'error'
  }
}

function queueAutosave(delay = 900) {
  if (!import.meta.client || autosaveDisabled.value || !hasAutosavableContent.value) {
    return
  }

  if (autosaveTimerId !== null) {
    window.clearTimeout(autosaveTimerId)
  }

  autosaveTimerId = window.setTimeout(() => {
    autosaveTimerId = null
    void saveAutosaveDraft()
  }, delay)
}

watch(() => values.venueId, async (venueId) => {
  if (!venueId) {
    selectedVenueDetail.value = null
    return
  }

  const detail = await $fetch<{ data: VenueDetailResponse }>(`/api/admin/venues/${venueId}`)
  selectedVenueDetail.value = detail.data

  if (!values.sessions || values.sessions.length === 0) {
    setFieldValue('sessions', [{
      label: 'Default session',
      venueId: venueId,
      status: 'draft',
      startsAt: '',
      endsAt: '',
      salesStartAt: '',
      salesEndAt: '',
      ticketTypes: [],
    }])
  }
})

const previewSeats = computed(() => {
  if (!selectedVenueDetail.value) {
    return []
  }

  const firstSessionTickets = values.sessions?.[0]?.ticketTypes ?? []
  const priceBySectionId = new Map(firstSessionTickets.map(ticketType => [ticketType.venueSectionId, ticketType.priceCents]))

  return selectedVenueDetail.value.sections.flatMap(section => section.rows.flatMap((row, rowIndex) => row.seats.map(seat => ({
    id: seat.id,
    venueSectionId: section.id,
    ticketTypeId: undefined,
    sectionNameSnapshot: section.name,
    rowLabelSnapshot: row.label,
    seatLabelSnapshot: seat.label,
    displayX: Math.max(seat.seatNumber - 1, 0),
    displayY: rowIndex,
    status: 'available',
    priceCents: priceBySectionId.get(section.id) ?? 0,
    currency: 'VND',
  }))))
})

const totalRows = computed(() => selectedVenueDetail.value?.sections.reduce((count, section) => count + section.rows.length, 0) ?? 0)
const totalSeats = computed(() => selectedVenueDetail.value?.sections.reduce((sectionCount, section) => sectionCount + section.rows.reduce((rowCount, row) => rowCount + row.seats.length, 0), 0) ?? 0)

function getStepSchema(step: number) {
  switch (step) {
    case 1:
      return stepSchemas[1]
    case 2:
      return stepSchemas[2]
    case 3:
      return stepSchemas[3]
    default:
      return eventComposerSchema
  }
}

function applyStepErrors(step: number) {
  const schema = getStepSchema(step)
  const result = schema.safeParse(values)
  if (result.success) {
    return true
  }

  for (const issue of result.error.issues) {
    const pathPart = issue.path[0]
    if (typeof pathPart === 'string') {
      setFieldError(pathPart, issue.message)
    }
  }
  return false
}

function canReachStep(step: number) {
  return step <= highestReachedStep.value || step === currentStep.value + 1
}

function validateUntilStep(step: number) {
  for (let stepIndex = currentStep.value; stepIndex < step; stepIndex += 1) {
    if (!applyStepErrors(stepIndex)) {
      return false
    }
  }

  return true
}

function handleStepUpdate(step: number | string) {
  const nextStep = typeof step === 'number' ? step : Number(step)
  if (Number.isInteger(nextStep)) {
    goToStep(nextStep)
  }
}

function goToStep(step: number) {
  if (step === currentStep.value) {
    return
  }

  if (step < currentStep.value) {
    currentStep.value = step
    return
  }

  if (!canReachStep(step)) {
    toast.error('Complete the current step before jumping ahead')
    return
  }

  if (validateUntilStep(step)) {
    void saveAutosaveDraft()
    currentStep.value = step
    highestReachedStep.value = Math.max(highestReachedStep.value, step)
  }
}

function goNext() {
  if (currentStep.value >= steps.length) {
    return
  }

  goToStep(currentStep.value + 1)
}

function goPrevious() {
  if (currentStep.value <= 1) {
    return
  }

  currentStep.value -= 1
}

const onSubmit = handleSubmit(
  async (formValues) => {
    isSaving.value = true
    autosaveDisabled.value = true
    autosaveRequestId += 1
    if (autosaveTimerId !== null) {
      window.clearTimeout(autosaveTimerId)
      autosaveTimerId = null
    }

    try {
      const response = await $fetch('/api/admin/events', {
        method: 'POST',
        body: {
          slug: formValues.slug,
          title: formValues.title,
          subtitle: formValues.subtitle,
          description: formValues.description,
          venueId: formValues.venueId,
          coverImage: formValues.coverImage,
          sessions: formValues.sessions.map((session, index) => ({
            ...session,
            startsAt: new Date(session.startsAt),
            endsAt: session.endsAt ? new Date(session.endsAt) : undefined,
            salesStartAt: new Date(session.salesStartAt),
            salesEndAt: new Date(session.salesEndAt),
            ticketTypes: session.ticketTypes.map((ticketType, tIndex) => ({
              ...ticketType,
              sortOrder: tIndex,
            })),
          })),
        },
      })

      toast.success('Draft event saved')
      if (import.meta.client && autosaveDraftKey.value) {
        window.localStorage.removeItem('ticketrush:event-create-autosave-key')
      }
      autosaveDraftKey.value = ''
      lastAutosaveSignature.value = ''
      resetForm({ values: { ...defaultValues } })
      selectedVenueDetail.value = null
      currentStep.value = 1
      highestReachedStep.value = 1
      await navigateTo(`/admin/events/${response.data.id}`)
    }
    catch {
      autosaveDisabled.value = false
      toast.error('We could not save the event draft')
    }
    finally {
      isSaving.value = false
    }
  },
  ({ errors }) => {
    const firstError = Object.values(errors).flat().filter(Boolean)[0] || 'Please fix the highlighted fields'
    toast.error(firstError)
  },
)

definePageMeta({
  title: 'Create Event',
  breadcrumb: 'Create Event',
  middleware: ['auth', 'admin'],
  layout: 'dashboard',
})

watch(values, () => {
  queueAutosave()
}, { deep: true })

onMounted(() => {
  autosaveDraftKey.value = window.localStorage.getItem('ticketrush:event-create-autosave-key') ?? ''
})

onUnmounted(() => {
  if (autosaveTimerId !== null) {
    window.clearTimeout(autosaveTimerId)
  }
})
</script>

<template>
  <div class="space-y-6">
    <Stepper
      :model-value="currentStep"
      class="flex w-full items-start gap-2"
      linear
      @update:model-value="handleStepUpdate"
    >
      <StepperItem
        v-for="step in steps"
        :key="step.step"
        v-slot="{ state }"
        :step="step.step"
        :disabled="step.step > highestReachedStep && step.step !== currentStep + 1"
        class="relative flex w-full flex-col items-center justify-center"
      >
        <StepperSeparator
          v-if="step.step !== steps[steps.length - 1]?.step"
          class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
        />

        <StepperTrigger as-child>
          <Button
            :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
            size="icon"
            class="z-10 shrink-0 rounded-full"
            :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
          >
            <Check
              v-if="state === 'completed'"
              class="size-5"
            />
            <Circle v-if="state === 'active'" />
            <Dot v-if="state === 'inactive'" />
          </Button>
        </StepperTrigger>

        <div class="mt-5 flex flex-col items-center text-center">
          <StepperTitle
            :class="[state === 'active' && 'text-primary']"
            class="text-sm font-semibold transition lg:text-base"
          >
            {{ step.title }}
          </StepperTitle>
          <StepperDescription
            :class="[state === 'active' && 'text-primary']"
            class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
          >
            {{ step.description }}
          </StepperDescription>
        </div>
      </StepperItem>
    </Stepper>

    <form
      class="space-y-6"
      @submit.prevent="onSubmit"
    >
      <motion.div
        :key="currentStep"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.22, ease: 'easeOut' }"
      >
        <Card
          v-show="currentStep === 1"
          class="rounded-3xl shadow-sm"
        >
          <CardHeader>
            <CardTitle class="text-base">
              Identity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend>Event basics</FieldLegend>
              <FieldGroup>
                <VeeField
                  v-slot="{ field, errors }"
                  name="title"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="event-create-title">
                      Title
                    </FieldLabel>
                    <Input
                      id="event-create-title"
                      :model-value="field.value"
                      placeholder="Midnight Skyline Live"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="slug"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="event-create-slug">
                      Slug
                    </FieldLabel>
                    <Input
                      id="event-create-slug"
                      :model-value="field.value"
                      placeholder="midnight-skyline-live"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
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
                    <FieldLabel for="event-create-subtitle">
                      Subtitle
                    </FieldLabel>
                    <Input
                      id="event-create-subtitle"
                      :model-value="field.value"
                      placeholder="A premium electronic pop night in Saigon."
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
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
                    <FieldLabel for="event-create-description">
                      Description
                    </FieldLabel>
                    <Textarea
                      id="event-create-description"
                      :model-value="field.value"
                      placeholder="Describe the event."
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>

                <VeeField
                  v-slot="{ field, errors }"
                  name="coverImage"
                >
                  <Field :data-invalid="!!errors.length">
                    <FieldLabel for="event-create-cover-image">
                      Cover image URL
                    </FieldLabel>
                    <Input
                      id="event-create-cover-image"
                      :model-value="field.value"
                      placeholder="https://example.com/event-cover.jpg"
                      :aria-invalid="!!errors.length"
                      @update:model-value="field.onChange"
                    />
                    <FieldDescription>Optional</FieldDescription>
                    <FieldError
                      v-if="errors.length"
                      :errors="errors"
                    />
                  </Field>
                </VeeField>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card
          v-show="currentStep === 2"
          class="rounded-3xl shadow-sm"
        >
          <CardHeader>
            <CardTitle class="text-base">
              Venue
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-6">
            <VeeField
              v-slot="{ field, errors }"
              name="venueId"
            >
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="event-create-venue">
                  Venue
                </FieldLabel>
                <Select
                  :model-value="field.value ? String(field.value) : undefined"
                  @update:model-value="field.onChange(Number($event))"
                >
                  <SelectTrigger id="event-create-venue">
                    <SelectValue :placeholder="field.value ? undefined : 'Choose venue blueprint'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="venue in venues"
                      :key="venue.id"
                      :value="String(venue.id)"
                    >
                      {{ venue.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FieldError
                  v-if="errors.length"
                  :errors="errors"
                />
              </Field>
            </VeeField>

            <div
              v-if="selectedVenueDetail"
              class="space-y-4"
            >
              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl bg-muted/50 px-4 py-3">
                  <p class="text-xs text-muted-foreground">
                    Sections
                  </p>
                  <p class="text-lg font-semibold tabular-nums text-foreground">
                    {{ selectedVenueDetail.sections.length }}
                  </p>
                </div>
                <div class="rounded-2xl bg-muted/50 px-4 py-3">
                  <p class="text-xs text-muted-foreground">
                    Rows
                  </p>
                  <p class="text-lg font-semibold tabular-nums text-foreground">
                    {{ totalRows }}
                  </p>
                </div>
                <div class="rounded-2xl bg-muted/50 px-4 py-3">
                  <p class="text-xs text-muted-foreground">
                    Seats
                  </p>
                  <p class="text-lg font-semibold tabular-nums text-foreground">
                    {{ totalSeats }}
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <div
                  v-for="section in selectedVenueDetail.sections"
                  :key="section.id"
                  class="flex items-center justify-between gap-3 rounded-2xl border bg-background px-4 py-3"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <span
                      class="h-3 w-3 shrink-0 rounded-full"
                      :style="{ backgroundColor: section.color }"
                    />
                    <p class="truncate text-sm font-medium text-foreground">
                      {{ section.name }}
                    </p>
                  </div>
                  <p class="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {{ section.rows.reduce((count, row) => count + row.seats.length, 0) }} seats
                  </p>
                </div>
              </div>

              <div class="rounded-3xl border bg-muted/20 p-4">
                <TicketEventSeatMapExperience
                  :seats="previewSeats"
                  :ticket-types="values.sessions?.[0]?.ticketTypes ?? []"
                  :action-label="null"
                  mode="admin"
                />
              </div>
            </div>

            <div
              v-else
              class="rounded-3xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground"
            >
              Choose a venue to generate ticket releases and preview the layout.
            </div>
          </CardContent>
        </Card>

        <AdminEventsAdminEventSessionEditor
          v-show="currentStep === 3"
          :model-value="values.sessions"
          :venue-sections="selectedVenueDetail?.sections ?? []"
          :default-venue-id="values.venueId"
          @update:model-value="setFieldValue('sessions', $event)"
        />

        <Card
          v-show="currentStep === 4"
          class="rounded-3xl shadow-sm"
        >
          <CardHeader>
            <CardTitle class="text-base">
              Review and submit
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
              <Card class="rounded-2xl bg-muted/20 shadow-none">
                <CardHeader class="flex flex-row items-center justify-between gap-3 pb-3">
                  <CardTitle class="text-sm">
                    Sessions
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-8 px-2"
                    @click="currentStep = 3"
                  >
                    Edit
                  </Button>
                </CardHeader>
                <CardContent>
                  <dl class="space-y-4 text-sm">
                    <div class="space-y-1">
                      <dt class="text-muted-foreground">
                        Number of sessions
                      </dt>
                      <dd class="font-medium">
                        {{ values.sessions.length }}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div class="sticky bottom-4 z-10 rounded-3xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div class="text-sm text-muted-foreground">
            <span class="font-medium text-foreground">{{ steps[currentStep - 1]?.title }}</span>
            <span class="hidden sm:inline"> · {{ steps[currentStep - 1]?.description }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-muted-foreground md:ml-auto md:mr-3">
            <component
              :is="autosaveIcon"
              class="size-3.5"
              :class="autosaveStatus === 'saving' && 'animate-spin'"
            />
            <span>{{ autosaveLabel }}</span>
          </div>
          <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              :disabled="currentStep === 1"
              class="active:scale-[0.96]"
              @click="goPrevious"
            >
              Back
            </Button>
            <Button
              v-if="currentStep < steps.length"
              type="button"
              class="active:scale-[0.96]"
              @click="goNext"
            >
              Continue
            </Button>
            <Button
              v-else
              type="submit"
              :is-loading="isSaving"
              class="active:scale-[0.96]"
            >
              Save draft
            </Button>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
