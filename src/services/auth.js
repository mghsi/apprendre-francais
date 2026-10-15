import { createAuth0Client } from '@auth0/auth0-spa-js'
import { reactive } from 'vue'

const domain = (import.meta.env.VITE_AUTH0_DOMAIN || '').trim()
const clientId = (import.meta.env.VITE_AUTH0_CLIENT_ID || '').trim()
const audience = (import.meta.env.VITE_AUTH0_AUDIENCE || '').trim()
const databaseConnection = (import.meta.env.VITE_AUTH0_DATABASE_CONNECTION || 'Username-Password-Authentication').trim()

export const authState = reactive({
  configured: Boolean(domain && clientId && audience),
  ready: false,
  authenticated: false,
  loading: false,
  user: null,
  error: '',
})

let clientPromise

function redirectUri() {
  return `${window.location.origin}${window.location.pathname}`
}

async function client() {
  if (!authState.configured) {
    throw new Error('Auth0 is not configured for this environment.')
  }
  if (!clientPromise) {
    clientPromise = createAuth0Client({
      domain,
      clientId,
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
      useRefreshTokensFallback: false,
      authorizationParams: {
        audience,
        redirect_uri: redirectUri(),
      },
    })
  }
  return clientPromise
}

async function refreshState(auth0) {
  authState.authenticated = await auth0.isAuthenticated()
  authState.user = authState.authenticated ? await auth0.getUser() : null
}

export async function initializeAuth() {
  if (!authState.configured) {
    authState.ready = true
    return
  }

  try {
    const auth0 = await client()
    const query = new URLSearchParams(window.location.search)
    if ((query.has('code') || query.has('error')) && query.has('state')) {
      const { appState } = await auth0.handleRedirectCallback()
      const returnTo = appState?.returnTo || '#/'
      window.history.replaceState({}, document.title, `${window.location.pathname}${returnTo}`)
    }
    await refreshState(auth0)
  } catch (error) {
    authState.error = error?.message || 'Authentication initialization failed.'
  } finally {
    authState.ready = true
  }
}

export async function login() {
  authState.loading = true
  authState.error = ''
  try {
    const auth0 = await client()
    await auth0.loginWithRedirect({
      appState: { returnTo: window.location.hash || '#/' },
    })
  } catch (error) {
    authState.error = error?.message || 'Unable to sign in.'
    authState.loading = false
  }
}

export async function logout() {
  authState.loading = true
  authState.error = ''
  try {
    const auth0 = await client()
    await auth0.logout({ logoutParams: { returnTo: redirectUri() } })
  } catch (error) {
    authState.error = error?.message || 'Unable to sign out.'
    authState.loading = false
  }
}

export async function requestPasswordReset() {
  if (!authState.authenticated || !authState.user?.sub?.startsWith('auth0|') || !authState.user?.email) {
    throw new Error('Connecte-toi avec un compte e-mail et mot de passe pour utiliser cette option.')
  }
  const response = await fetch(`https://${domain}/dbconnections/change_password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, email: authState.user.email, connection: databaseConnection }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(response.status === 429
      ? 'Trop de demandes. Patiente quelques minutes avant de réessayer.'
      : 'Impossible d’envoyer le lien de réinitialisation. Réessaie plus tard.')
  }
}

export async function getAccessToken() {
  if (!authState.configured || !authState.authenticated) {
    const error = new Error('Connectez-vous pour utiliser cette fonctionnalité.')
    error.code = 'AUTH_REQUIRED'
    throw error
  }
  try {
    return await (await client()).getTokenSilently()
  } catch (cause) {
    const error = new Error('Votre session a expiré. Reconnectez-vous puis réessayez.')
    error.code = 'AUTH_REQUIRED'
    error.cause = cause
    throw error
  }
}
