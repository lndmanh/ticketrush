export const useCollapsedMapStore = defineStore('collapsedMap', () => {
  const map = ref(new Map<string, boolean>())

  function get(key: string): boolean | undefined {
    return map.value.get(key)
  }

  function set(key: string, value: boolean) {
    map.value.set(key, value)
  }

  return { map, get, set }
})
