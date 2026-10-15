<template>
  <div class="profile-page">
    <header class="page-heading">
      <h2>Mon profil</h2>
      <p>Ton compte et la sécurité de ta connexion.</p>
    </header>

    <section v-if="!authState.authenticated" class="profile-card">
      <h3>Connecte-toi pour accéder à ton profil</h3>
      <p>Retrouve les informations et les options de sécurité de ton compte.</p>
      <button class="profile-btn primary" :disabled="authState.loading" @click="login()">Se connecter</button>
    </section>

    <template v-else>
      <section class="profile-card" aria-labelledby="identity-heading">
        <h3 id="identity-heading">Informations du compte</h3>
        <dl class="identity-grid">
          <div><dt>Nom</dt><dd>{{ authState.user?.name || authState.user?.nickname || 'Non renseigné' }}</dd></div>
          <div><dt>Adresse e-mail</dt><dd>{{ authState.user?.email || 'Non renseignée' }}</dd></div>
          <div><dt>Connexion</dt><dd>{{ databaseAccount ? 'E-mail et mot de passe' : 'Fournisseur externe' }}</dd></div>
          <div v-if="account"><dt>Membre depuis</dt><dd>{{ memberSince }}</dd></div>
        </dl>
        <p v-if="loading" role="status">Chargement du compte…</p>
        <div v-if="error" class="account-error" role="alert">
          <p>{{ error }}</p>
          <button class="profile-btn" @click="loadAccount">Réessayer</button>
        </div>
      </section>

      <section class="profile-card" aria-labelledby="password-heading">
        <h3 id="password-heading">Mot de passe</h3>
        <template v-if="databaseAccount">
          <p>Reçois un lien par e-mail pour choisir un nouveau mot de passe sur la page sécurisée Auth0, sans quitter ton profil.</p>
          <button class="profile-btn primary" :disabled="authState.loading || resetLoading || resetSent" @click="sendPasswordReset">{{ resetLoading ? 'Envoi en cours…' : resetSent ? 'Lien demandé' : 'Changer mon mot de passe' }}</button>
          <p v-if="resetSent" class="reset-success" role="status">Demande acceptée. Vérifie ta boîte e-mail et tes courriers indésirables pour retrouver le lien.</p>
          <p v-if="resetError" class="reset-error" role="alert">{{ resetError }}</p>
          <p class="supporting">Après un changement de mot de passe, Auth0 peut te demander de te reconnecter.</p>
        </template>
        <p v-else>Ton compte utilise un fournisseur externe (Google, Apple, GitHub, Microsoft…). Change ton mot de passe directement dans les paramètres de ce fournisseur ; l’application ne le gère pas.</p>
      </section>

      <section class="profile-card" aria-labelledby="session-heading">
        <h3 id="session-heading">Session</h3>
        <p>Ta connexion est conservée lors d’un rafraîchissement sur ce navigateur. Tu peux te déconnecter sur un appareil partagé.</p>
        <p class="supporting">Une session expirée ou révoquée, un changement de mot de passe ou la suppression des données du navigateur peut nécessiter une nouvelle connexion.</p>
        <button class="profile-btn" :disabled="authState.loading" @click="logout">Se déconnecter</button>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { authState, login, logout, requestPasswordReset } from '../services/auth.js'
import { apiRequest } from '../services/api.js'

const account = ref(null)
const loading = ref(false)
const error = ref('')
const resetLoading = ref(false)
const resetSent = ref(false)
const resetError = ref('')
const databaseAccount = computed(() => authState.user?.sub?.startsWith('auth0|') && authState.user?.email)
const memberSince = computed(() => new Date(account.value.createdAt).toLocaleDateString('fr-CA'))

async function sendPasswordReset() {
  resetLoading.value = true
  resetError.value = ''
  try {
    await requestPasswordReset()
    resetSent.value = true
  } catch (cause) {
    resetError.value = cause.message || 'Impossible d’envoyer le lien de réinitialisation.'
  } finally {
    resetLoading.value = false
  }
}

async function loadAccount() {
  loading.value = true
  error.value = ''
  try {
    account.value = await apiRequest('/v1/me')
  } catch (cause) {
    error.value = cause.message || 'Impossible de charger le compte.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (authState.authenticated) loadAccount()
})
</script>

<style scoped>
.profile-page { display: flex; flex-direction: column; gap: 14px; }
.page-heading h2 { font-size: 22px; color: var(--title-color); margin-bottom: 6px; }
.page-heading p, .profile-card p { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
.profile-card { border: 1.5px solid var(--border); border-radius: 14px; background: var(--surface); padding: 16px; display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
.profile-card h3 { font-size: 16px; color: var(--text-primary); }
.identity-grid { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.identity-grid dt { font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 5px; }
.identity-grid dd { font-size: 14px; color: var(--text-primary); overflow-wrap: anywhere; }
.profile-card .supporting { font-size: 12px; }
.profile-btn { min-height: 44px; padding: 10px 14px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text-primary); font-size: 13px; font-weight: 600; }
.profile-btn.primary { background: #2980b9; border-color: #2980b9; color: #fff; }
.profile-btn:hover:not(:disabled) { border-color: #2980b9; }
.profile-btn:focus-visible { outline: 3px solid #2980b955; outline-offset: 2px; }
.profile-btn:disabled { opacity: 0.6; cursor: wait; }
.account-error { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.account-error p { color: #c0392b; }
.profile-card .reset-success { color: #27ae60; }
.profile-card .reset-error { color: #c0392b; }
@media (max-width: 480px) {
  .identity-grid { grid-template-columns: 1fr; }
  .profile-btn { width: 100%; }
}
</style>
