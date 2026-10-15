import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import 'vue'

const { sdk, createAuth0Client } = vi.hoisted(() => {
  const sdk = {
    isAuthenticated: vi.fn(), getUser: vi.fn(), handleRedirectCallback: vi.fn(),
    loginWithRedirect: vi.fn(), logout: vi.fn(), getTokenSilently: vi.fn(),
  }
  return { sdk, createAuth0Client: vi.fn(async () => sdk) }
})
vi.mock('@auth0/auth0-spa-js', () => ({ createAuth0Client }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('VITE_AUTH0_DOMAIN', 'example.auth0.com')
  vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'public-client')
  vi.stubEnv('VITE_AUTH0_AUDIENCE', 'https://example-api')
  vi.stubGlobal('window', {
    location: { origin: 'http://localhost:5173', pathname: '/', search: '', hash: '#/profil' },
    history: { replaceState: vi.fn() },
  })
  vi.stubGlobal('document', { title: 'Test' })
  sdk.isAuthenticated.mockResolvedValue(true)
  sdk.getUser.mockResolvedValue({ sub: 'auth0|test', email: 'test@example.com' })
  sdk.handleRedirectCallback.mockResolvedValue({ appState: { returnTo: '#/profil' } })
  sdk.getTokenSilently.mockResolvedValue('test-token')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('uses persistent SDK storage and rotating refresh tokens on a fresh page load', async () => {
  const auth = await import('./auth.js')
  await auth.initializeAuth()
  expect(createAuth0Client).toHaveBeenCalledWith(expect.objectContaining({
    cacheLocation: 'localstorage', useRefreshTokens: true, useRefreshTokensFallback: false,
  }))
  expect(auth.authState.authenticated).toBe(true)
  expect(auth.authState.user.email).toBe('test@example.com')
  expect(sdk.handleRedirectCallback).not.toHaveBeenCalled()
  expect(await auth.getAccessToken()).toBe('test-token')
})

it('restores the profile route after login', async () => {
  window.location.search = '?code=test&state=test'
  const auth = await import('./auth.js')
  await auth.initializeAuth()
  expect(window.history.replaceState).toHaveBeenCalledWith({}, 'Test', '/#/profil')
  expect(auth.authState.authenticated).toBe(true)
})

it('surfaces error-only Auth0 callbacks instead of silently ignoring them', async () => {
  window.location.search = '?error=invalid_request&state=test'
  sdk.handleRedirectCallback.mockRejectedValueOnce(new Error('Client is not authorized'))
  const auth = await import('./auth.js')
  await auth.initializeAuth()
  expect(auth.authState.error).toBe('Client is not authorized')
  expect(auth.authState.authenticated).toBe(false)
  expect(auth.authState.ready).toBe(true)
})

it('does not force a password prompt for normal login', async () => {
  const auth = await import('./auth.js')
  await auth.login()
  expect(sdk.loginWithRedirect).toHaveBeenLastCalledWith({
    appState: { returnTo: '#/profil' },
  })
})

it('requests a reset email for the signed-in database account without redirecting', async () => {
  vi.stubEnv('VITE_AUTH0_DATABASE_CONNECTION', 'Custom-Database')
  const fetch = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetch)
  const auth = await import('./auth.js')
  await auth.initializeAuth()
  await auth.requestPasswordReset()
  expect(fetch).toHaveBeenCalledWith('https://example.auth0.com/dbconnections/change_password', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ client_id: 'public-client', email: 'test@example.com', connection: 'Custom-Database' }),
  }))
  expect(sdk.loginWithRedirect).not.toHaveBeenCalled()
})

it('does not request password resets for social or anonymous users', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const auth = await import('./auth.js')
  await expect(auth.requestPasswordReset()).rejects.toThrow()
  auth.authState.authenticated = true
  auth.authState.user = { sub: 'google-oauth2|test', email: 'test@example.com' }
  await expect(auth.requestPasswordReset()).rejects.toThrow()
  expect(fetch).not.toHaveBeenCalled()
})

it('reports rejected reset requests rather than claiming email was sent', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 })
  vi.stubGlobal('fetch', fetch)
  const auth = await import('./auth.js')
  await auth.initializeAuth()
  await expect(auth.requestPasswordReset()).rejects.toThrow('Trop de demandes')
  fetch.mockResolvedValueOnce({ ok: false, status: 400 })
  await expect(auth.requestPasswordReset()).rejects.toThrow('Impossible d’envoyer')
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    connection: 'Username-Password-Authentication',
  })
})

it('rejects anonymous API use and handles an expired or revoked token', async () => {
  sdk.isAuthenticated.mockResolvedValue(false)
  const auth = await import('./auth.js')
  await auth.initializeAuth()
  await expect(auth.getAccessToken()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
  expect(sdk.getTokenSilently).not.toHaveBeenCalled()
  auth.authState.authenticated = true
  sdk.getTokenSilently.mockRejectedValueOnce(new Error('invalid_grant'))
  await expect(auth.getAccessToken()).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
})

it('logs out through Auth0 to clear its persistent cache', async () => {
  const auth = await import('./auth.js')
  await auth.logout()
  expect(sdk.logout).toHaveBeenCalledWith({ logoutParams: { returnTo: 'http://localhost:5173/' } })
})
