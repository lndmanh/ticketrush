export interface PasskeyModel {
  id: string
  name: string
  transports: string[] | null
  backedUp: boolean | null
  createdAt: Date
  updatedAt: Date
}
