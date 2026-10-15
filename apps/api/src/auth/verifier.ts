import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Config } from '../config.js'
import type { TokenVerifier } from '../types.js'

export function createAuth0Verifier(config: Pick<Config, 'AUTH0_ISSUER' | 'AUTH0_AUDIENCE'>): TokenVerifier {
  const jwks = createRemoteJWKSet(new URL('.well-known/jwks.json', config.AUTH0_ISSUER), {
    cooldownDuration: 30_000,
    cacheMaxAge: 600_000,
    timeoutDuration: 5_000,
  })
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.AUTH0_ISSUER,
      audience: config.AUTH0_AUDIENCE,
      algorithms: ['RS256'],
    })
    if (!payload.sub) throw new Error('Token has no subject')
    return {
      subject: payload.sub,
      ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      emailVerified: payload.email_verified === true,
      ...(typeof payload.name === 'string' ? { displayName: payload.name } : {}),
    }
  }
}
