export interface GoogleIdTokenPayload {
  issuer: string
  audience: string
  subject: string
  email: string
  emailVerified: true
  name: string
  picture?: string
  issuedAt: number
  expiresAt: number
}

export interface GoogleJwk {
  kid: string
  kty: string
  n: string
  e: string
}

export interface GoogleSignatureVerificationInput {
  signingInput: string
  signature: Uint8Array
  jwk: GoogleJwk
}

export type GoogleSignatureVerifier = (input: GoogleSignatureVerificationInput) => Promise<boolean>

export interface VerifyGoogleIdTokenInput {
  token: string
  audience: string
  now?: Date
  loadJwks?: () => Promise<GoogleJwk[]>
  verifySignature?: GoogleSignatureVerifier
}

interface GoogleIdTokenHeader {
  alg: string
  kid: string
}

interface GoogleIdTokenClaims {
  iss: string
  aud: string
  sub: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  iat: number
  exp: number
}

export class GoogleIdTokenVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleIdTokenVerificationError'
  }
}

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const CLOCK_SKEW_SECONDS = 60
const DEFAULT_JWKS_TTL_SECONDS = 300

let cachedJwks: GoogleJwk[] | undefined
let cachedJwksExpiresAt = 0

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (base64.length % 4)) % 4
  const normalized = `${base64}${'='.repeat(padding)}`
  return atob(normalized)
}

function parseJson(value: string, errorMessage: string): unknown {
  try {
    return JSON.parse(value)
  }
  catch {
    throw new GoogleIdTokenVerificationError(errorMessage)
  }
}

function decodeTokenPart(value: string) {
  try {
    return base64UrlDecode(value)
  }
  catch {
    throw new GoogleIdTokenVerificationError('Invalid Google ID token encoding')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGoogleJwk(value: unknown): value is GoogleJwk {
  if (!isRecord(value)) return false
  return typeof value.kid === 'string' && typeof value.kty === 'string' && typeof value.n === 'string' && typeof value.e === 'string'
}

function parseHeader(encodedHeader: string) {
  const decoded = decodeTokenPart(encodedHeader)
  const header = parseJson(decoded, 'Invalid Google ID token header')
  if (!isRecord(header) || header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length === 0) {
    throw new GoogleIdTokenVerificationError('Unsupported Google ID token header')
  }
  return {
    alg: header.alg,
    kid: header.kid,
  }
}

function parseClaims(encodedPayload: string) {
  const decoded = decodeTokenPart(encodedPayload)
  return parseJson(decoded, 'Invalid Google ID token payload')
}

function parseCacheMaxAge(cacheControl: string | null) {
  if (!cacheControl) return DEFAULT_JWKS_TTL_SECONDS
  const match = /max-age=(\d+)/.exec(cacheControl)
  return match ? Number(match[1]) : DEFAULT_JWKS_TTL_SECONDS
}

async function defaultLoadJwks() {
  const now = Date.now()
  if (cachedJwks && now < cachedJwksExpiresAt) return cachedJwks

  const response = await fetch(GOOGLE_JWKS_URL)
  if (!response.ok) {
    throw new GoogleIdTokenVerificationError('Failed to load Google public keys')
  }

  const body = parseJson(await response.text(), 'Malformed Google JWKS JSON')
  if (!isRecord(body) || !Array.isArray(body.keys)) {
    throw new GoogleIdTokenVerificationError('Malformed Google JWKS JSON')
  }

  const keys = body.keys.filter(isGoogleJwk)
  if (keys.length === 0) {
    throw new GoogleIdTokenVerificationError('Google JWKS did not contain any usable keys')
  }

  cachedJwks = keys
  cachedJwksExpiresAt = now + parseCacheMaxAge(response.headers.get('cache-control')) * 1000
  return keys
}

function decodeSignature(encodedSignature: string) {
  try {
    const normalized = encodedSignature.replace(/-/g, '+').replace(/_/g, '/')
    const padding = (4 - (normalized.length % 4)) % 4
    const withPadding = `${normalized}${'='.repeat(padding)}`
    return Uint8Array.from(atob(withPadding), char => char.charCodeAt(0))
  }
  catch {
    throw new GoogleIdTokenVerificationError('Invalid Google ID token signature encoding')
  }
}

async function defaultVerifySignature(input: GoogleSignatureVerificationInput) {
  const keyData = {
    kty: input.jwk.kty,
    n: input.jwk.n,
    e: input.jwk.e,
    ext: true,
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, input.signature, new TextEncoder().encode(input.signingInput))
}

function readClaims(input: unknown): GoogleIdTokenClaims {
  if (!isRecord(input)) throw new GoogleIdTokenVerificationError('Invalid Google ID token payload')
  const { iss, aud, sub, email, email_verified, iat, exp, name, picture } = input
  if (typeof iss !== 'string' || typeof aud !== 'string' || typeof sub !== 'string' || typeof email !== 'string' || typeof email_verified !== 'boolean' || typeof iat !== 'number' || typeof exp !== 'number') {
    throw new GoogleIdTokenVerificationError('Invalid Google ID token payload')
  }

  const claims: GoogleIdTokenClaims = { iss, aud, sub, email, email_verified, iat, exp }

  if (typeof name === 'string') {
    claims.name = name
  }

  if (typeof picture === 'string') {
    claims.picture = picture
  }

  return claims
}

export async function verifyGoogleIdToken(input: VerifyGoogleIdTokenInput): Promise<GoogleIdTokenPayload> {
  const parts = input.token.split('.')
  if (parts.length !== 3 || parts.some(part => part.length === 0)) {
    throw new GoogleIdTokenVerificationError('Invalid Google ID token format')
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts
  const header = parseHeader(encodedHeader)
  const claims = readClaims(parseClaims(encodedPayload))

  const jwks = await (input.loadJwks ?? defaultLoadJwks)()
  if (jwks.length === 0) {
    throw new GoogleIdTokenVerificationError('Google JWKS did not contain any usable keys')
  }

  const jwk = jwks.find(key => key.kid === header.kid)
  if (!jwk) {
    throw new GoogleIdTokenVerificationError('Unknown Google ID token signing key')
  }

  const signature = decodeSignature(encodedSignature)
  const verifySignature = input.verifySignature ?? defaultVerifySignature
  const signatureValid = await verifySignature({ signingInput: `${encodedHeader}.${encodedPayload}`, signature, jwk })
  if (!signatureValid) {
    throw new GoogleIdTokenVerificationError('Invalid Google ID token signature')
  }

  if (claims.iss !== 'accounts.google.com' && claims.iss !== 'https://accounts.google.com') {
    throw new GoogleIdTokenVerificationError('Google ID token issuer mismatch')
  }

  if (claims.aud !== input.audience) {
    throw new GoogleIdTokenVerificationError('Google ID token audience mismatch')
  }

  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  if (claims.exp < nowSeconds - CLOCK_SKEW_SECONDS) {
    throw new GoogleIdTokenVerificationError('Google ID token has expired')
  }

  if (claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new GoogleIdTokenVerificationError('Google ID token was issued in the future')
  }

  if (claims.email_verified !== true) {
    throw new GoogleIdTokenVerificationError('Google account email is not verified')
  }

  return {
    issuer: claims.iss,
    audience: claims.aud,
    subject: claims.sub,
    email: claims.email,
    emailVerified: true,
    name: claims.name ?? claims.email,
    ...(claims.picture ? { picture: claims.picture } : {}),
    issuedAt: claims.iat,
    expiresAt: claims.exp,
  }
}
