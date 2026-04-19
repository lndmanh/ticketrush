import { useKV } from '~~/server/utils/kv'

export default defineEventHandler(async () => {
  const cache = useKV()
  await cache.clear().then(() => {
    return true
  })
})
