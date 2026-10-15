import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'

const required = { DATABASE_URL: 'postgres://localhost/db', CORS_ORIGINS: 'http://localhost:5173', AUTH0_ISSUER: 'https://tenant.example.com', AUTH0_AUDIENCE: 'api' }
describe('configuration', () => {
  it('normalizes issuer and parses exact origins', () => expect(loadConfig(required)).toMatchObject({ AUTH0_ISSUER: 'https://tenant.example.com/', CORS_ORIGINS: ['http://localhost:5173'] }))
  it('rejects wildcard origins', () => expect(() => loadConfig({ ...required, CORS_ORIGINS: '*' })).toThrow('exact HTTP(S) origins'))
  it('fails when required values are missing', () => expect(() => loadConfig({})).toThrow('Invalid configuration'))
  it('rejects Claude Code OAuth in production',()=>expect(()=>loadConfig({...required,NODE_ENV:'production',CLAUDE_CODE_OAUTH_TOKEN:'oauth'})).toThrow('forbidden'))
})
