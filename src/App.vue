<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-top">
        <h1 class="app-title">🇫🇷 Conjugaison française</h1>
        <button class="theme-toggle" @click="cycleTheme" :title="themeLabel">
          {{ themeIcon }}
        </button>
      </div>
      <p class="app-subtitle">{{ tempsList.length }} temps · Niveau B1+</p>
    </header>

    <nav class="tab-bar">
      <button
        class="tab-btn"
        :class="{ active: view === 'conjugaison' }"
        @click="switchView('conjugaison')"
      >
        📋 Tableaux
      </button>
      <button
        class="tab-btn explorer"
        :class="{ active: view === 'explorer' }"
        @click="switchView('explorer')"
      >
        🔎 Explorer
      </button>
      <button
        class="tab-btn guide"
        :class="{ active: view === 'guide' }"
        @click="switchView('guide')"
      >
        📖 Guide
      </button>
    </nav>

    <main>
      <ExplorerView v-if="view === 'explorer'" />
      <GuideView v-if="view === 'guide'" />

      <ConjugationTable
        v-if="view === 'conjugaison'"
        :search="search"
        :selectedVerb="selectedVerb"
        :selectedTemps="selectedTemps"
        :quizMode="quizMode"
        :quizAnswers="quizAnswers"
        :showResults="showResults"
        @update:search="onSearch"
        @selectVerb="onSelectVerb"
        @selectTemps="onSelectTemps"
        @toggleQuiz="onToggleQuiz"
        @updateAnswer="onUpdateAnswer"
        @check="showResults = true"
        @restart="startQuiz"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { verbNames, tempsList } from './data/verbs.js'
import GuideView from './components/GuideView.vue'
import ConjugationTable from './components/ConjugationTable.vue'
import ExplorerView from './components/ExplorerView.vue'

// Theme: 'system' | 'light' | 'dark'
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
  if (t === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', t)
  }
  localStorage.setItem('theme', t)
}

watch(theme, applyTheme)
onMounted(() => applyTheme(theme.value))

const view = ref('conjugaison')
const search = ref('')
const selectedVerb = ref('être')
const selectedTemps = ref('présent')
const quizMode = ref(false)
const quizAnswers = ref({})
const showResults = ref(false)

function switchView(v) {
  view.value = v
  quizMode.value = false
}

function onSearch(val) {
  search.value = val
  quizMode.value = false
  showResults.value = false
}

function onSelectVerb(v) {
  selectedVerb.value = v
  quizMode.value = false
  showResults.value = false
  quizAnswers.value = {}
}

function onSelectTemps(t) {
  selectedTemps.value = t
  showResults.value = false
  quizAnswers.value = {}
}

function startQuiz() {
  quizMode.value = true
  quizAnswers.value = {}
  showResults.value = false
}

function onToggleQuiz() {
  if (quizMode.value) {
    quizMode.value = false
  } else {
    startQuiz()
  }
}

function onUpdateAnswer(i, val) {
  quizAnswers.value = { ...quizAnswers.value, [i]: val }
}
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
  text-align: center;
  margin-bottom: 20px;
}

.header-top {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.app-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--title-color);
  margin-bottom: 4px;
}

.theme-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 18px;
  line-height: 1;
  transition: all 0.2s;
}

.theme-toggle:hover {
  border-color: #2980b9;
  box-shadow: 0 2px 8px var(--shadow-sm);
}

.app-subtitle {
  font-size: 13px;
  color: var(--text-faint);
}

.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 12px 0;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  font-weight: 500;
  font-size: 14px;
  color: var(--text-muted);
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: #2980b9;
  color: #2980b9;
}

.tab-btn.active {
  border-color: #2980b9;
  background: var(--tab-conj-bg);
  color: #2980b9;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(41, 128, 185, 0.12);
}

.tab-btn.explorer:hover {
  border-color: #27ae60;
  color: #27ae60;
}

.tab-btn.explorer.active {
  border-color: #27ae60;
  background: #27ae6012;
  color: #27ae60;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.12);
}

.tab-btn.guide:hover {
  border-color: #e67e22;
  color: #e67e22;
}

.tab-btn.guide.active {
  border-color: #e67e22;
  background: var(--tab-guide-bg);
  color: #e67e22;
  box-shadow: 0 2px 8px rgba(230, 126, 34, 0.12);
}
</style>
