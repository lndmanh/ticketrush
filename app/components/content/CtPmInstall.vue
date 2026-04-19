<template>
  <CtMDC
    :value="md"
    class="[&:not(:first-child)]:mt-5"
  />
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  inStack?: boolean
  name?: string
  sync?: string
  saveDev?: boolean
  noSync?: boolean
}>(), {
  inStack: false,
  sync: '_pm',
  noSync: false,
  saveDev: false,
})

const md = `
::ct-code-group{${props.inStack ? 'in-stack' : ''} ${props.noSync ? '' : `sync="${props.sync}"`}}
${
  usePm().packageManagers.value.map((pm) => {
    const code = props.name
      ? `${pm.command}${pm.install}${props.saveDev ? pm.saveDev : ''}${props.name}`
      : `${pm.command}${pm.installEmpty}`
    return `\`\`\`bash [${pm.name}]\n${code}\n\`\`\`\n`
  }).join('\n')
}
::
`
</script>
