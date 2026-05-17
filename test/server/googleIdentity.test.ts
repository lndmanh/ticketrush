import { describe, expect, it, vi } from 'vitest'
import {
  GoogleIdTokenVerificationError,
  type GoogleJwk,
  verifyGoogleIdToken,
} from '~~/server/utils/googleIdentity'

const validPayload = {
  iss: 'https://accounts.google.com',
  aud: 'client-123',
  sub: 'google-subject-1',
  email: 'user@example.com',
  email_verified: true,
  name: 'Google User',
  picture: 'https://example.com/avatar.png',
  iat: 1_800_000_000,
  exp: 1_800_000_600,
}

const jwks: GoogleJwk[] = [
  {
    kid: 'key-1',
    kty: 'RSA',
    n: 'modulus',
    e: 'AQAB',
  },
]

function encodeBase64Url(value: string) {
  return btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createToken(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'RS256', kid: 'key-1' }) {
  return [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
    encodeBase64Url('signature'),
  ].join('.')
}

describe('verifyGoogleIdToken', () => {
  it('returns a typed payload for a valid Google token', async () => {
    const verifySignature = vi.fn().mockResolvedValue(true)
    const loadJwks = vi.fn().mockResolvedValue(jwks)

    const result = await verifyGoogleIdToken({
      token: createToken(validPayload),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks,
      verifySignature,
    })

    expect(result).toEqual({
      issuer: 'https://accounts.google.com',
      audience: 'client-123',
      subject: 'google-subject-1',
      email: 'user@example.com',
      emailVerified: true,
      name: 'Google User',
      picture: 'https://example.com/avatar.png',
      issuedAt: 1_800_000_000,
      expiresAt: 1_800_000_600,
    })
    expect(loadJwks).toHaveBeenCalledTimes(1)
    expect(verifySignature).toHaveBeenCalledTimes(1)
  })

  it('falls back to email when name is missing and omits picture when absent', async () => {
    const result = await verifyGoogleIdToken({
      token: createToken({
        ...validPayload,
        name: undefined,
        picture: undefined,
      }),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => jwks,
      verifySignature: async () => true,
    })

    expect(result).toEqual({
      issuer: 'https://accounts.google.com',
      audience: 'client-123',
      subject: 'google-subject-1',
      email: 'user@example.com',
      emailVerified: true,
      name: 'user@example.com',
      issuedAt: 1_800_000_000,
      expiresAt: 1_800_000_600,
    })
    expect(result).not.toHaveProperty('picture')
  })

  it('rejects tokens signed by an unknown key', async () => {
    await expect(verifyGoogleIdToken({
      token: createToken(validPayload, { alg: 'RS256', kid: 'missing-key' }),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => jwks,
      verifySignature: async () => true,
    })).rejects.toBeInstanceOf(GoogleIdTokenVerificationError)
  })

  it('rejects invalid signatures', async () => {
    await expect(verifyGoogleIdToken({
      token: createToken(validPayload),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => jwks,
      verifySignature: async () => false,
    })).rejects.toThrow('Invalid Google ID token signature')
  })

  it('rejects tokens for another audience', async () => {
    await expect(verifyGoogleIdToken({
      token: createToken({ ...validPayload, aud: 'other-client' }),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => jwks,
      verifySignature: async () => true,
    })).rejects.toThrow('Google ID token audience mismatch')
  })

  it('rejects expired tokens', async () => {
    await expect(verifyGoogleIdToken({
      token: createToken({ ...validPayload, exp: 1_700_000_000 }),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => jwks,
      verifySignature: async () => true,
    })).rejects.toThrow('Google ID token has expired')
  })

  it('rejects unverified email addresses', async () => {
    await expect(verifyGoogleIdToken({
      token: createToken({ ...validPayload, email_verified: false }),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => jwks,
      verifySignature: async () => true,
    })).rejects.toThrow('Google account email is not verified')
  })

  it('rejects malformed signature encoding', async () => {
    await expect(verifyGoogleIdToken({
      token: [
        encodeBase64Url(JSON.stringify({ alg: 'RS256', kid: 'key-1' })),
        encodeBase64Url(JSON.stringify(validPayload)),
        '!!invalid!!',
      ].join('.'),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => jwks,
      verifySignature: async () => true,
    })).rejects.toBeInstanceOf(GoogleIdTokenVerificationError)
  })

  it('rejects malformed JWKS JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response('not-json', { status: 200 }))

    try {
      await expect(verifyGoogleIdToken({
        token: createToken(validPayload),
        audience: 'client-123',
        now: new Date('2027-01-15T08:00:00.000Z'),
        verifySignature: async () => true,
      })).rejects.toThrow('Malformed Google JWKS JSON')
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('rejects empty JWKS responses', async () => {
    await expect(verifyGoogleIdToken({
      token: createToken(validPayload),
      audience: 'client-123',
      now: new Date('2027-01-15T08:00:00.000Z'),
      loadJwks: async () => [],
      verifySignature: async () => true,
    })).rejects.toThrow('Google JWKS did not contain any usable keys')
  })
})
