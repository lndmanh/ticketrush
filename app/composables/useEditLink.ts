export function useEditLink() {
  const { page } = usePageData()
  const { editLink } = useConfig().value.main

  const url = computed(
    () => editLink.pattern.replace(/:path/g, page.value?.stem ? `${page.value.stem}.${page.value.extension || 'md'}` : ''),
  )

  const enabled = computed(
    () => editLink.enable && page.value?.editLink !== false && page.value?.stem && url.value !== '',
  )

  const enabledToc = computed(
    () => enabled.value && editLink.placement.includes('toc'),
  )
  const enabledDocsFooter = computed(
    () => enabled.value && editLink.placement.includes('docsFooter'),
  )

  return {
    url,
    text: editLink.text,
    icon: editLink.icon,
    enabledToc,
    enabledDocsFooter,
  }
}
