export function getEventFallbackImage(seed: string, width: number = 1200, height: number = 900) {
  const normalizedSeed = seed?.trim()

  return `https://picsum.photos/seed/${encodeURIComponent(normalizedSeed)}/${width}/${height}`
}
