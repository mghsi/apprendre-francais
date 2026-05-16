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

import HomePage from './pages/HomePage.vue'
import ConjugationPage from './pages/ConjugationPage.vue'
import TcfPage from './pages/TcfPage.vue'
import ExpressionEcrite from './pages/tcf/ExpressionEcrite.vue'
import ComprehensionEcrite from './pages/tcf/ComprehensionEcrite.vue'
import ComingSoon from './pages/tcf/ComingSoon.vue'
import GrammarCorrector from './pages/GrammarCorrector.vue'

const { route } = useRouter()

// --- Routage (basé sur le hash) ---
const currentPage = computed(() => {
  const segs = route.value.segments
  if (segs.length === 0) return { component: HomePage }
  if (segs[0] === 'conjugaison') return { component: ConjugationPage }
  if (segs[0] === 'correcteur') return { component: GrammarCorrector }
  if (segs[0] === 'tcf') {
    if (segs.length === 1) return { component: TcfPage }
    if (segs[1] === 'ee') return { component: ExpressionEcrite }
    if (segs[1] === 'co') return {
      component: ComingSoon,
      props: {
        icon: '🎧',
        title: 'Compréhension orale (CO)',
        subtitle: "39 questions QCM, ~25 minutes. Extraits audio courts à plus longs.",
        features: [
          'Lecteur audio avec contrôle de la lecture',
          'Banque de questions au format TCF',
          'Score immédiat et explications',
          'Minuteur identique à l\'examen'
        ]
      }
    }
    if (segs[1] === 'ce') return { component: ComprehensionEcrite }
    if (segs[1] === 'eo') return {
      component: ComingSoon,
      props: {
        icon: '🎤',
        title: 'Expression orale (EO)',
        subtitle: "Trois tâches enregistrées, ~12 minutes.",
        features: [
          "Enregistrement audio dans le navigateur",
          'Sujets au format TCF (entretien, échange, opinion)',
          'Minuteur par tâche',
          'Lecture et conservation de vos enregistrements'
        ]
      }
    }
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
  margin-left: auto;
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

.app-main {
  animation: fadeIn 0.25s ease;
}
</style>
