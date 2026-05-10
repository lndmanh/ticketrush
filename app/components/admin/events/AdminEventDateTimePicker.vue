<script setup lang="ts">
import { computed } from 'vue'
import { Calendar as CalendarIcon, Clock, X } from '@lucide/vue'
import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

const datePartPattern = /^\d{4}-\d{2}-\d{2}$/
const timePartPattern = /^([01]\d|2[0-3]):([0-5]\d)$/
const defaultTimePart = '00:00'

const props = withDefaults(defineProps<{
  id: string
  placeholder?: string
  timeLabel?: string
  clearLabel?: string
  datePlaceholder?: string
  disabled?: boolean
  ariaInvalid?: boolean
}>(), {
  placeholder: 'Pick date and time',
  timeLabel: 'Time',
  clearLabel: 'Clear',
  datePlaceholder: 'Choose a date to set the time.',
  disabled: false,
  ariaInvalid: false,
})

const modelValue = defineModel<string>({ default: '' })
const { locale } = useI18n()

const dateFormatter = computed(() => new DateFormatter(locale.value, { dateStyle: 'medium' }))

function parseDatePart(value: string) {
  const [datePart = ''] = value.split('T')
  if (!datePartPattern.test(datePart)) {
    return undefined
  }

  try {
    return parseDate(datePart)
  }
  catch {
    return undefined
  }
}

function getDatePart(value: string) {
  return parseDatePart(value)?.toString() ?? ''
}

function getTimePart(value: string) {
  const [, rawTime = ''] = value.split('T')
  const timePart = rawTime.slice(0, 5)
  const match = timePartPattern.exec(timePart)

  if (!match) {
    return ''
  }

  const hour = match[1]
  const minute = match[2]
  if (!hour || !minute) {
    return ''
  }

  return `${hour}:${minute}`
}

function formatDateTime(datePart: string, timePart: string) {
  const normalizedTime = timePartPattern.test(timePart) ? timePart : defaultTimePart
  return `${datePart}T${normalizedTime}`
}

const calendarValue = computed<DateValue | undefined>({
  get: () => parseDatePart(modelValue.value),
  set: (value) => {
    if (props.disabled) {
      return
    }

    if (!value) {
      modelValue.value = ''
      return
    }

    modelValue.value = formatDateTime(value.toString(), timeValue.value || defaultTimePart)
  },
})

const timeValue = computed(() => getTimePart(modelValue.value))

const displayLabel = computed(() => {
  const selectedDate = calendarValue.value
  if (selectedDate) {
    const formattedDate = dateFormatter.value.format(selectedDate.toDate(getLocalTimeZone()))
    return `${formattedDate}, ${timeValue.value || '00:00'}`
  }

  const fallbackValue = modelValue.value.trim()
  return fallbackValue || props.placeholder
})

const hasValue = computed(() => Boolean(modelValue.value.trim()))
const isTimeDisabled = computed(() => props.disabled || !calendarValue.value)

function updateTime(value: string) {
  const datePart = getDatePart(modelValue.value)
  if (!datePart) {
    return
  }

  if (!timePartPattern.test(value)) {
    return
  }

  modelValue.value = formatDateTime(datePart, value)
}

function clearDateTime() {
  if (props.disabled) {
    return
  }

  modelValue.value = ''
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        :id="id"
        type="button"
        variant="outline"
        class="h-10 w-full justify-start gap-2 text-left font-normal transition active:scale-[0.98]"
        :class="[
          !calendarValue && !modelValue && 'text-muted-foreground',
          ariaInvalid && 'border-destructive text-destructive hover:text-destructive',
        ]"
        :disabled="disabled"
        :aria-invalid="ariaInvalid"
      >
        <CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
        <span class="min-w-0 truncate">{{ displayLabel }}</span>
      </Button>
    </PopoverTrigger>

    <PopoverContent
      align="start"
      class="w-auto rounded-[1.5rem] p-0"
    >
      <Calendar
        v-model="calendarValue"
        initial-focus
        layout="month-and-year"
        :disabled="disabled"
      />

      <div class="space-y-3 border-t p-3">
        <div class="space-y-2">
          <Label
            :for="`${id}-time`"
            class="text-xs text-muted-foreground"
          >
            {{ timeLabel }}
          </Label>
          <div class="flex gap-2">
            <div class="relative min-w-0 flex-1">
              <Clock class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                :id="`${id}-time`"
                type="time"
                step="60"
                class="pl-9"
                :model-value="timeValue"
                :disabled="isTimeDisabled"
                :aria-invalid="ariaInvalid"
                @update:model-value="value => updateTime(String(value))"
              />
            </div>

            <Button
              v-if="hasValue"
              type="button"
              variant="ghost"
              size="icon"
              class="shrink-0"
              :disabled="disabled"
              :aria-label="clearLabel"
              @click="clearDateTime"
            >
              <X class="size-4" />
            </Button>
          </div>
        </div>

        <p
          v-if="!calendarValue"
          class="text-xs text-muted-foreground"
        >
          {{ datePlaceholder }}
        </p>
      </div>
    </PopoverContent>
  </Popover>
</template>
