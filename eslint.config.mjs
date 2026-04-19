// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import stylistic from '@stylistic/eslint-plugin'

import { globalIgnores } from 'eslint/config'

export default withNuxt(
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'app/components/ui/**']),
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
)
