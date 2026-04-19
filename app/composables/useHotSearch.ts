const isOpen = ref(false)

export function useHotSearch() {
  const toggleIsOpen = () => {
    isOpen.value = !isOpen.value
  }

  const setIsOpen = (value: boolean) => {
    isOpen.value = value
  }

  return { isOpen, toggleIsOpen, setIsOpen }
}
