import { eq } from 'drizzle-orm'
import type { PasskeyModel } from '~~/types/models/passkey'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const sessionUser = session.user
  console.log(sessionUser)
  const db = useDB()

  const userCredentials = await db
    .select({
      id: tables.credentials.id,
      transports: tables.credentials.transports,
      backedUp: tables.credentials.backedUp,
      createdAt: tables.credentials.createdAt,
      updatedAt: tables.credentials.updatedAt,
    })
    .from(tables.credentials)
    .where(eq(tables.credentials.userId, sessionUser.id))

  const returnData: PasskeyModel[] = userCredentials.map(cred => ({
    id: cred.id,
    transports: cred.transports,
    backedUp: cred.backedUp,
    name: generatePasskeyName(cred.transports || null),
    createdAt: cred.createdAt || new Date(),
    updatedAt: cred.updatedAt || new Date(),
  }))

  return success(returnData)
})

function generatePasskeyName(transports: string[] | null) {
  if (!transports || transports.length === 0) {
    return 'Passkey'
  }

  if (transports.includes('usb')) {
    return 'Security Key (USB)'
  }
  if (transports.includes('nfc')) {
    return 'Security Key (NFC)'
  }
  if (transports.includes('ble')) {
    return 'Security Key (Bluetooth)'
  }
  if (transports.includes('internal')) {
    return 'Device Biometric'
  }
  if (transports.includes('hybrid')) {
    return 'Cross-device Passkey'
  }

  return 'Passkey'
}
