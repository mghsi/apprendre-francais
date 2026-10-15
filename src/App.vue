<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <button
          v-if="!isHome"
          class="back-btn"
          @click="navigate('/')"
          title="Retour à l'accueil"
        >
          ← Accueil
        </button>
        <button
          v-else
          class="logo-btn"
          @click="navigate('/')"
        >
          🇫🇷 <span class="logo-text">Apprendre le français</span>
        </button>
      </div>

      <nav v-if="breadcrumbs.length > 0" class="breadcrumbs">
        <template v-for="(b, i) in breadcrumbs" :key="i">
          <button
            v-if="b.path"
            class="crumb crumb-link"
            @click="navigate(b.path)"
          >{{ b.label }}</button>
          <span v-else class="crumb crumb-current">{{ b.label }}</span>
          <span v-if="i < breadcrumbs.length - 1" class="crumb-sep">›</span>
        </template>
      </nav>

      <div class="auth-actions">
        <span v-if="authState.error" class="auth-error" role="status">
          {{ authState.error }}
        </span>
        <button
          v-if="authState.authenticated"
          class="auth-btn"
          @click="navigate('/profil')"
          :aria-current="route.path === '/profil' ? 'page' : undefined"
        >
          Mon profil
        </button>
        <button
          v-if="authState.configured && authState.ready && !authState.authenticated"
          class="auth-btn"
          :disabled="authState.loading"
          @click="login()"
        >
          Se connecter
        </button>
        <button
          v-else-if="authState.configured && authState.authenticated"
          class="auth-btn"
          :disabled="authState.loading"
          :title="authState.user?.email || authState.user?.name || 'Compte connecté'"
          @click="logout"
        >
          Se déconnecter
        </button>
      </div>
      <button class="theme-toggle" @click="cycleTheme" :title="themeLabel">
        {{ themeIcon }}
      </button>
    </header>

    <main class="app-main">
      <component :is="currentPage.component" v-bind="currentPage.props || {}" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, navigate } from './composables/useRouter.js'
import { authState, login, logout } from './services/auth.js'

import HomePage from './pages/HomePage.vue'
import ConjugationPage from './pages/ConjugationPage.vue'
import TcfPage from './pages/TcfPage.vue'
import ExpressionEcrite from './pages/tcf/ExpressionEcrite.vue'
import ExpressionOrale from './pages/tcf/ExpressionOrale.vue'
import ComprehensionEcrite from './pages/tcf/ComprehensionEcrite.vue'
import ComprehensionOrale from './pages/tcf/ComprehensionOrale.vue'
import GrammarCorrector from './pages/GrammarCorrector.vue'
import ProfilePage from './pages/ProfilePage.vue'

const { route } = useRouter()

// --- Routage (basé sur le hash) ---
const currentPage = computed(() => {
  const segs = route.value.segments
  if (segs.length === 0) return { component: HomePage }
  if (segs[0] === 'conjugaison') return { component: ConjugationPage }
  if (segs[0] === 'correcteur') return { component: GrammarCorrector }
  if (segs[0] === 'profil') return { component: ProfilePage }
  if (segs[0] === 'tcf') {
    if (segs.length === 1) return { component: TcfPage }
    if (segs[1] === 'ee') return { component: ExpressionEcrite }
    if (segs[1] === 'co') return { component: ComprehensionOrale }
    if (segs[1] === 'ce') return { component: ComprehensionEcrite }
    if (segs[1] === 'eo') return { component: ExpressionOrale }
    return { component: TcfPage }
  }
  // Route inconnue : on revient à l'accueil
  return { component: HomePage }
})

const isHome = computed(() => route.value.segments.length === 0)

const breadcrumbs = computed(() => {
  const segs = route.value.segments
  if (segs.length === 0) return []
  const crumbs = [{ label: 'Accueil', path: '/' }]
  if (segs[0] === 'conjugaison') {
    crumbs.push({ label: 'Conjugaison' })
  } else if (segs[0] === 'correcteur') {
    crumbs.push({ label: 'Correcteur' })
  } else if (segs[0] === 'profil') {
    crumbs.push({ label: 'Mon profil' })
  } else if (segs[0] === 'tcf') {
    if (segs.length === 1) {
      crumbs.push({ label: 'TCF' })
    } else {
      crumbs.push({ label: 'TCF', path: '/tcf' })
      const map = {
        ee: 'Expression écrite',
        eo: 'Expression orale',
        co: 'Compréhension orale',
        ce: 'Compréhension écrite'
      }
      crumbs.push({ label: map[segs[1]] || segs[1] })
    }
  }
  return crumbs
})

// --- Thème : 'system' | 'light' | 'dark' ---
const theme = ref(localStorage.getItem('theme') || 'system')

const themeIcon = computed(() => {
  if (theme.value === 'light') return '☀️'
  if (theme.value === 'dark') return '🌙'
  return '💻'
})

const themeLabel = computed(() => {
  if (theme.value === 'light') return 'Mode clair'
  if (theme.value === 'dark') return 'Mode sombre'
  return 'Préférence système'
})

function cycleTheme() {
  const order = ['system', 'light', 'dark']
  const idx = order.indexOf(theme.value)
  theme.value = order[(idx + 1) % order.length]
}

function applyTheme(t) {
  const root = document.documentElement
  if (t === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
  localStorage.setItem('theme', t)
}

watch(theme, applyTheme)
onMounted(() => applyTheme(theme.value))
</script>

<style scoped>
.app-container {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.app-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.header-left { flex-shrink: 0; }

.logo-btn {
  background: transparent;
  border: none;
  font-size: 18px;
  font-weight: 700;
  color: var(--title-color);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 10px;
  transition: background 0.2s;
}
.logo-btn:hover { background: var(--surface-alt); }
.logo-text {
  font-size: 16px;
  letter-spacing: -0.3px;
}

.back-btn {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  transition: all 0.2s;
}
.back-btn:hover {
  border-color: #2980b9;
  color: #2980b9;
}

.breadcrumbs {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 13px;
  overflow: hidden;
}

.crumb {
  font-family: inherit;
  font-size: 13px;
  background: transparent;
  border: none;
  padding: 2px 4px;
  border-radius: 6px;
}
.crumb-link {
  color: var(--text-muted);
  cursor: pointer;
}
.crumb-link:hover { color: #2980b9; background: var(--surface-alt); }
.crumb-current {
  color: var(--text-primary);
  font-weight: 600;
}
.crumb-sep { color: var(--text-faintest); }

.theme-toggle {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 18px;
  line-height: 1;
  transition: all 0.2s;
  flex-shrink: 0;
}
.theme-toggle:hover {
  border-color: #2980b9;
  box-shadow: 0 2px 8px var(--shadow-sm);
}

.auth-btn {
  min-height: 44px;
  padding: 7px 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
.auth-btn:hover:not(:disabled) {
  border-color: #2980b9;
  color: #2980b9;
}
.auth-btn:focus-visible,
.theme-toggle:focus-visible {
  outline: 3px solid #2980b933;
  outline-offset: 2px;
}
.auth-btn:disabled { opacity: 0.6; cursor: wait; }
.auth-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.auth-error {
  max-width: 240px;
  color: #c0392b;
  font-size: 12px;
}

@media (max-width: 640px) {
  .app-header { flex-wrap: wrap; }
  .breadcrumbs { order: 3; flex-basis: 100%; }
  .auth-actions { margin-left: auto; }
  .auth-error { max-width: none; }
}

.app-main {
  animation: fadeIn 0.25s ease;
}
</style>
