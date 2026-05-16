import { createError } from 'h3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { resolveAuthorizedTargetUserId } from '~~/server/utils/authorization'

function expectApiError(callback: () => void, statusCode: number, code: string) {
  try {
    callback()
    throw new Error('Expected callback to throw an API error')
  }
  catch (error) {
    expect(error).toMatchObject({
      statusCode,
      data: {
        error: {
          code,
        },
      },
    })
  }
}

describe('authorization helpers', () => {
  beforeAll(() => {
    vi.stubGlobal('createError', createError)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('resolves me to the current session user ID', () => {
    expect(resolveAuthorizedTargetUserId('me', 123)).toBe(123)
  })

  it('resolves numeric route user IDs', () => {
    expect(resolveAuthorizedTargetUserId('456', 123)).toBe(456)
  })

  it('rejects missing route user IDs as bad requests', () => {
    expectApiError(() => resolveAuthorizedTargetUserId(undefined, 123), 400, 'RESOURCE_ACCESS_DENIED')
  })

  it('rejects invalid route user IDs as bad requests', () => {
    expectApiError(() => resolveAuthorizedTargetUserId('abc', 123), 400, 'RESOURCE_ACCESS_DENIED')
  })

  it('rejects invalid session user IDs as unauthorized', () => {
    expectApiError(() => resolveAuthorizedTargetUserId('me', Number.NaN), 401, 'INVALID_SESSION')
  })
})
