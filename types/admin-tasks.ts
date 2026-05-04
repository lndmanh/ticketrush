export interface AdminTaskAdmissionSummary {
  eventSessionId: number
  admittedCount: number
}

export interface AdmitQueueTaskData {
  result: string
  expiredCount: number
  admissionSummary: AdminTaskAdmissionSummary[]
}

export interface ReleaseHoldsTaskData {
  result: string
  releasedCount: number
  eventsRecomputed: number
}

export interface SeedAdminTaskData {
  result: string
  admin: {
    id: number
    username: string
    name: string | null
    isAdmin: boolean
  }
}

export type AdminTaskData = AdmitQueueTaskData | ReleaseHoldsTaskData | SeedAdminTaskData

export interface AdminTaskResult {
  success: boolean
  data?: AdminTaskData
  error?: string
  ranAt: string
}
