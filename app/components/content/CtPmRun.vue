<template>
  <CtMDC
    :value="md"
    class="[&:not(:first-child)]:mt-5"
  />
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  inStack?: boolean
  script: string
  sync?: string
  noSync?: boolean
}>(), {
  inStack: false,
  sync: '_pm',
  noSync: false,
})

const md = `
::ct-code-group{${props.inStack ? 'in-stack' : ''} ${props.noSync ? '' : `sync="${props.sync}"`}}
${
  usePm().packageManagers.value.map((pm) => {
    const code = `${pm.command}${pm.run}${props.script}`
    return `\`\`\`bash [${pm.name}]\n${code}\n\`\`\`\n`
  }).join('\n')
}
::
`
</script>
