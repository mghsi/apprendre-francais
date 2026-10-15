import { describe, expect, it, vi } from 'vitest'
import { buildApp } from '../src/app.js'
import type { Config } from '../src/config.js'
import type { User, UserRepository } from '../src/types.js'

const config: Config = {
  NODE_ENV: 'test', HOST: '127.0.0.1', PORT: 3000, LOG_LEVEL: 'silent', DATABASE_URL: 'postgres://unused',
  CORS_ORIGINS: ['https://app.example.com'], AUTH0_ISSUER: 'https://tenant.example.com/', AUTH0_AUDIENCE: 'api', TRUST_PROXY: false,
  LLM_PROVIDER:'mock',LLM_MODEL:'mock-local',LLM_API_KEY:'',AI_ENABLED:true,AI_DAILY_JOBS_PER_USER:20,AI_TIMEOUT_MS:45000,AI_MAX_ATTEMPTS:3,
}
const user: User = { id: '78c9eed4-1317-49a1-b1b0-e7718f699871', preferences: { theme: 'system', locale: 'fr' }, status: 'active', createdAt: new Date('2026-01-01T00:00:00Z') }
const repo = (): UserRepository => ({ provision: vi.fn(async () => user), updatePreferences: vi.fn(async (_id, preferences) => ({ ...user, preferences })), requestDeletion: vi.fn(async () => {}), ping: vi.fn(async () => {}), close: vi.fn(async () => {}) })

describe('API foundation', () => {
  it('exposes liveness and readiness without dependency details', async () => {
    const app = buildApp({ config, users: repo(), verifyToken: vi.fn() })
    expect((await app.inject({ method: 'GET', url: '/health/live' })).json()).toEqual({ status: 'ok' })
    expect((await app.inject({ method: 'GET', url: '/health/ready' })).statusCode).toBe(200)
    await app.close()
  })

  it('rejects anonymous access with a safe request-correlated error', async () => {
    const app = buildApp({ config, users: repo(), verifyToken: vi.fn() })
    const response = await app.inject({ method: 'GET', url: '/v1/me', headers: { 'x-request-id': 'test-123' } })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ code: 'UNAUTHORIZED', message: 'Authentication required', requestId: 'test-123' })
    await app.close()
  })

  it('provisions by verified identity and returns only the internal profile', async () => {
    const users = repo(); const verifyToken = vi.fn(async () => ({ subject: 'auth0|immutable', emailVerified: true }))
    const app = buildApp({ config, users, verifyToken })
    const response = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer valid' } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ id: user.id, storageBytes: 0, preferences: user.preferences })
    expect(users.provision).toHaveBeenCalledWith({ subject: 'auth0|immutable', emailVerified: true })
    await app.close()
  })

  it('strictly validates and owner-scopes preference updates', async () => {
    const users = repo(); const app = buildApp({ config, users, verifyToken: vi.fn(async () => ({ subject: 'sub', emailVerified: false })) })
    const bad = await app.inject({ method: 'PATCH', url: '/v1/me/preferences', headers: { authorization: 'Bearer valid' }, payload: { theme: 'dark', locale: 'fr', userId: 'other' } })
    expect(bad.statusCode).toBe(422)
    const good = await app.inject({ method: 'PATCH', url: '/v1/me/preferences', headers: { authorization: 'Bearer valid' }, payload: { theme: 'dark', locale: 'fr-CA' } })
    expect(good.statusCode).toBe(200)
    expect(users.updatePreferences).toHaveBeenCalledWith(user.id, { theme: 'dark', locale: 'fr-CA' })
    await app.close()
  })

  it('emits CORS headers only for an exact allowed origin', async () => {
    const app = buildApp({ config, users: repo(), verifyToken: vi.fn() })
    const allowed = await app.inject({ method: 'OPTIONS', url: '/v1/me', headers: { origin: 'https://app.example.com', 'access-control-request-method': 'GET' } })
    const denied = await app.inject({ method: 'OPTIONS', url: '/v1/me', headers: { origin: 'https://evil.example.com', 'access-control-request-method': 'GET' } })
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
    await app.close()
  })

  it('requires explicit confirmation before scheduling account deletion', async () => {
    const users = repo()
    const app = buildApp({
      config,
      users,
      verifyToken: vi.fn(async () => ({ subject: 'sub', emailVerified: true })),
    })
    const denied = await app.inject({
      method: 'DELETE',
      url: '/v1/me',
      headers: { authorization: 'Bearer valid' },
      payload: { confirmation: 'delete' },
    })
    expect(denied.statusCode).toBe(422)
    const accepted = await app.inject({
      method: 'DELETE',
      url: '/v1/me',
      headers: { authorization: 'Bearer valid' },
      payload: { confirmation: 'DELETE' },
    })
    expect(accepted.statusCode).toBe(202)
    expect(users.requestDeletion).toHaveBeenCalledWith(user.id)
    await app.close()
  })
})
