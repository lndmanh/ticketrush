export const useSearchDialogStore = defineStore('searchDialog', () => {
  const open = ref<boolean>(false)

  function toggle() {
    open.value = !open.value
  }

  function setOpen(value: boolean) {
    open.value = value
  }

  return { open, toggle, setOpen }
})
