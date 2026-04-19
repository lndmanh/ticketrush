<script setup lang="ts">
import { computed } from 'vue'
import { Progress } from '@/components/ui/progress'
import { Check, X } from '@lucide/vue'
import type { PasswordStrength } from '@/utils/passwordValidation'

const props = withDefaults(defineProps<{
  password: string
  strength: PasswordStrength
  showDetails?: boolean
}>(), {
  showDetails: true,
})

const progressValue = computed(() => props.strength.score)

const checkItems = computed(() => [
  {
    label: 'At least 8 characters',
    passed: props.strength.checks.length,
  },
  {
    label: 'One uppercase letter (A-Z)',
    passed: props.strength.checks.uppercase,
  },
  {
    label: 'One lowercase letter (a-z)',
    passed: props.strength.checks.lowercase,
  },
  {
    label: 'One number (0-9)',
    passed: props.strength.checks.number,
  },
  {
    label: 'One special character (!@#$...)',
    passed: props.strength.checks.special,
  },
])
</script>

<template>
  <div
    v-if="password"
    class="space-y-3"
  >
    <!-- Progress Bar -->
    <div class="space-y-1.5">
      <Progress
        :model-value="progressValue"
        class="h-2 transition-all duration-300"
        :style="{ '--progress-color': strength.color }"
      />
      <div class="flex items-center justify-between text-xs">
        <span
          class="font-medium transition-colors duration-300"
          :style="{ color: strength.color }"
        >
          {{ strength.feedback }}
        </span>
        <span class="text-muted-foreground">
          {{ strength.score }}%
        </span>
      </div>
    </div>

    <!-- Requirements Checklist -->
    <div
      v-if="showDetails"
      class="space-y-1.5 text-xs"
    >
      <p class="text-muted-foreground font-medium">
        Password Requirements:
      </p>
      <ul class="space-y-1">
        <li
          v-for="(item, index) in checkItems"
          :key="index"
          class="flex items-center gap-2 transition-colors duration-200"
          :class="item.passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'"
        >
          <Check
            v-if="item.passed"
            class="h-3.5 w-3.5 shrink-0"
          />
          <X
            v-else
            class="h-3.5 w-3.5 shrink-0"
          />
          <span>{{ item.label }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
:deep([data-slot="progress-indicator"]) {
  background-color: var(--progress-color, hsl(var(--primary)));
}
</style>
