import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as AlertBox } from './AlertBox.vue'
export { default as AlertBoxActions } from './AlertBoxActions.vue'
export { default as AlertBoxContent } from './AlertBoxContent.vue'
export { default as AlertBoxDescription } from './AlertBoxDescription.vue'
export { default as AlertBoxTitle } from './AlertBoxTitle.vue'

export const alertBoxVariants = cva(
  'group/alert-box relative w-full rounded-lg border px-4 py-3 text-sm transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive:
          'text-red-800 bg-red-50 border-red-200 dark:text-red-200 dark:bg-red-950 dark:border-red-800',
        success:
          'text-green-800 bg-green-50 border-green-200 dark:text-green-200 dark:bg-green-950 dark:border-green-800',
        warning:
          'text-yellow-800 bg-yellow-50 border-yellow-200 dark:text-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
        info:
          'text-blue-800 bg-blue-50 border-blue-200 dark:text-blue-200 dark:bg-blue-950 dark:border-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type AlertBoxVariants = VariantProps<typeof alertBoxVariants>
