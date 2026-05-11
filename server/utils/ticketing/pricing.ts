import { eq } from 'drizzle-orm'
import type { SessionSeatOverride, SessionSectionPrice, VenueSection } from '#shared/db'
import type { useDB } from '~~/server/utils/db'
import { tables } from '~~/server/utils/db'
import { PricingMode, SeatPricingSource } from '#shared/commonEnums'

type PricingQueryClient = Pick<ReturnType<typeof useDB>, 'select'>

type SeatPricingInput = {
  venueSeatId: number | null
  venueSectionId: number | null
}

type ResolvedSeatPrice = {
  priceCents: number
  currency: string
  pricingSource: SeatPricingSource
  isDisabled: boolean
}

export function resolveSessionSeatPrice(
  seat: SeatPricingInput,
  sectionPriceBySectionId: Map<number, SessionSectionPrice>,
  overrideByVenueSeatId: Map<number, SessionSeatOverride>,
): ResolvedSeatPrice {
  const override = seat.venueSeatId === null ? undefined : overrideByVenueSeatId.get(seat.venueSeatId)
  if (override) {
    if (override.isDisabled) {
      return { priceCents: 0, currency: override.currency ?? 'VND', pricingSource: SeatPricingSource.SeatOverride, isDisabled: true }
    }

    const section = sectionPriceBySectionId.get(override.venueSectionId)
    if (!section && override.priceCents === null) {
      throw new Error(`Missing section price for venue section ${override.venueSectionId} while resolving seat override ${override.venueSeatId}`)
    }

    return {
      priceCents: override.priceCents ?? section?.priceCents ?? 0,
      currency: override.currency ?? section?.currency ?? 'VND',
      pricingSource: SeatPricingSource.SeatOverride,
      isDisabled: false,
    }
  }

  const section = seat.venueSectionId === null ? undefined : sectionPriceBySectionId.get(seat.venueSectionId)
  if (!section) {
    throw new Error(`Missing section price for venue section ${seat.venueSectionId ?? 'unknown'}`)
  }

  return {
    priceCents: section.priceCents,
    currency: section.currency,
    pricingSource: SeatPricingSource.Section,
    isDisabled: false,
  }
}

export function validateCompleteSectionPricing(venueSections: VenueSection[], sectionPrices: Array<Pick<SessionSectionPrice, 'venueSectionId'>>) {
  const venueSectionIds = new Set(venueSections.map(section => section.id))
  const seenSectionIds = new Set<number>()

  for (const sectionPrice of sectionPrices) {
    if (!venueSectionIds.has(sectionPrice.venueSectionId)) {
      throw new Error(`Section pricing references unknown venue section ${sectionPrice.venueSectionId}`)
    }
    if (seenSectionIds.has(sectionPrice.venueSectionId)) {
      throw new Error(`Duplicate section pricing for venue section ${sectionPrice.venueSectionId}`)
    }
    seenSectionIds.add(sectionPrice.venueSectionId)
  }

  for (const venueSection of venueSections) {
    if (!seenSectionIds.has(venueSection.id)) {
      throw new Error(`Missing price for venue section ${venueSection.id}`)
    }
  }
}

export async function getSessionPricingBundle(tx: PricingQueryClient, eventSessionId: number) {
  const sectionPrices = await tx.select().from(tables.sessionSectionPrices).where(eq(tables.sessionSectionPrices.eventSessionId, eventSessionId)).all()
  const seatOverrides = await tx.select().from(tables.sessionSeatOverrides).where(eq(tables.sessionSeatOverrides.eventSessionId, eventSessionId)).all()

  return {
    sectionPrices,
    seatOverrides,
  }
}

export function buildSectionPriceRowsFromVenueSections(
  eventId: number,
  eventSessionId: number,
  sections: VenueSection[],
  input: { pricingMode: PricingMode, currency: string, priceCents: number, sectionPrices?: Array<{ venueSectionId: number, priceCents: number, currency?: string, sortOrder?: number }> },
  now = new Date(),
) {
  const sectionInputById = new Map<number, { venueSectionId: number, priceCents: number, currency?: string, sortOrder?: number }>()
  for (const sectionPrice of input.sectionPrices ?? []) {
    sectionInputById.set(sectionPrice.venueSectionId, sectionPrice)
  }

  if (input.pricingMode === PricingMode.Section) {
    for (const section of sections) {
      if (!sectionInputById.has(section.id)) {
        throw new Error(`Missing section price for venue section ${section.id}`)
      }
    }
  }

  return sections.map((section) => {
    const sectionInput = sectionInputById.get(section.id)
    const priceCents = input.pricingMode === PricingMode.Uniform ? input.priceCents : sectionInput?.priceCents
    if (priceCents === undefined) {
      throw new Error(`Missing section price for venue section ${section.id}`)
    }
    const currency = input.pricingMode === PricingMode.Uniform ? input.currency : sectionInput?.currency ?? input.currency

    return {
      eventId,
      eventSessionId,
      venueSectionId: section.id,
      sectionNameSnapshot: section.name,
      sectionColorSnapshot: section.color,
      priceCents,
      currency,
      sortOrder: sectionInput?.sortOrder ?? section.sortOrder,
      createdAt: now,
      updatedAt: now,
    }
  })
}
