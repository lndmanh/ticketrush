export function getEventFallbackImage(seed: string | null | undefined, width: number, height: number) {
  const normalizedSeed = seed?.trim()

  if (!normalizedSeed) {
    return null
  }

  return `https://picsum.photos/seed/${encodeURIComponent(normalizedSeed)}/${width}/${height}`
}
