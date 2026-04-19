import { JsonIcon, TypeScriptIcon, NpmIcon, NuxtIcon, EsLintIcon, VueDotjsIcon, TailwindCssIcon, DotEnvIcon, JavaScriptIcon, MarkdownIcon, PythonIcon, BunIcon, CssIcon, YarnIcon, PnpmIcon, GnuBashIcon, DenoIcon, GitignoreDotioIcon, EditorConfigIcon, YamlIcon } from 'vue3-simple-icons'
import { FolderIcon, FileIcon } from '@lucide/vue'
import { isEmpty } from 'es-toolkit/compat'

export const codeIcon = {
  'package.json': JsonIcon,
  'tsconfig.json': JsonIcon,
  '.npmrc': NpmIcon,
  '.editorconfig': EditorConfigIcon,
  '.eslintrc': EsLintIcon,
  '.eslintrc.cjs': EsLintIcon,
  '.eslintignore': EsLintIcon,
  'eslint.config.js': EsLintIcon,
  'eslint.config.mjs': EsLintIcon,
  'eslint.config.cjs': EsLintIcon,
  '.gitignore': GitignoreDotioIcon,
  'yarn.lock': YarnIcon,
  '.env': DotEnvIcon,
  '.env.example': DotEnvIcon,
  '.vscode/settings.json': JsonIcon,
  'nuxt': NuxtIcon,
  '.nuxtrc': NuxtIcon,
  '.nuxtignore': NuxtIcon,
  'nuxt.config.js': NuxtIcon,
  'nuxt.config.ts': NuxtIcon,
  'nuxt.schema.ts': NuxtIcon,
  'tailwind.config.js': TailwindCssIcon,
  'tailwind.config.ts': TailwindCssIcon,
  'vue': VueDotjsIcon,
  'ts': TypeScriptIcon,
  'tsx': TypeScriptIcon,
  'mjs': JavaScriptIcon,
  'cjs': JavaScriptIcon,
  'js': JavaScriptIcon,
  'jsx': JavaScriptIcon,
  'md': MarkdownIcon,
  'mdc': MarkdownIcon,
  'css': CssIcon,
  'py': PythonIcon,
  'npm': NpmIcon,
  'pnpm': PnpmIcon,
  'pnpm-lock.yaml': PnpmIcon,
  'pnpm-workspace.yaml': PnpmIcon,
  'npx': NpmIcon,
  'yarn': YarnIcon,
  'bun': BunIcon,
  'bun.lock': BunIcon,
  'deno': DenoIcon,
  'yml': YamlIcon,
  'json': JsonIcon,
  'terminal': GnuBashIcon,
}

export function useFileIcon(filename: string, type?: 'folder' | 'file') {
  const iconMap = new Map(Object.entries(codeIcon))
  const formattedName = filename.toLowerCase()

  // ignore directly if it is lucide icon
  if (formattedName.startsWith('lucide:'))
    return

  if (formattedName === '...')
    return
  if (formattedName.endsWith('/'))
    return FolderIcon

  const icon = iconMap.get(formattedName)
  if (icon) {
    return icon
  }
  else if (!isEmpty(type)) {
    return type === 'file' ? FileIcon : FolderIcon
  }
  else {
    return undefined
  }
}
