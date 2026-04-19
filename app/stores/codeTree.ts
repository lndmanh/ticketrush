export const useCodeTreeStore = defineStore('codeTree', () => {
  const states = ref(new Map<string, string>())

  function getState(id: string, defaultValue: string) {
    if (!states.value.has(id)) {
      states.value.set(id, defaultValue)
    }
    return computed({
      get: () => states.value.get(id) ?? defaultValue,
      set: (value: string) => {
        states.value.set(id, value)
      },
    })
  }

  return { states, getState }
})
