<template>
  <div class="writing-practice">
    <!-- Barre supérieure : sélection de tâche + total -->
    <div class="top-bar">
      <div class="task-tabs">
        <button
          v-for="t in tcfTasks"
          :key="t.id"
          class="task-tab"
          :class="{ active: currentTaskId === t.id, running: timers[t.id].running }"
          @click="currentTaskId = t.id"
        >
          <span class="task-tab-name">{{ t.name }}</span>
          <span class="task-tab-meta">
            <span class="task-tab-time">{{ formatTime(timers[t.id].elapsed) }}</span>
            <span class="task-tab-words">{{ wordCounts[t.id] }} mots</span>
          </span>
        </button>
      </div>

      <div class="total-box">
        <span class="total-label">Total</span>
        <span class="total-value">{{ formatTime(totalElapsed) }}</span>
        <span class="total-budget">/ 60:00</span>
      </div>
    </div>

    <!-- Minuteur de la tâche en cours -->
    <div
      class="task-timer"
      :class="{
        running: currentTimer.running,
        warning: currentTimer.elapsed >= warningSeconds(currentTask) && currentTimer.elapsed < currentTask.budgetSeconds,
        over: currentTimer.elapsed >= currentTask.budgetSeconds
      }"
    >
      <div class="task-timer-info">
        <span class="task-timer-icon">⏱</span>
        <span class="task-timer-value">{{ formatTime(currentTimer.elapsed) }}</span>
        <span class="task-timer-budget">
          / {{ formatTime(currentTask.budgetSeconds) }} suggérées pour {{ currentTask.name }}
        </span>
      </div>
      <div class="task-timer-actions">
        <button
          class="timer-btn primary"
          @click="toggleTimer(currentTaskId)"
        >
          {{ currentTimer.running ? '⏸ Pause' : '▶ Démarrer' }}
        </button>
        <button class="timer-btn" @click="resetTimer(currentTaskId)">↺ Réinitialiser</button>
      </div>
    </div>

    <!-- Consigne (sujet officiel + sujets d'entraînement) -->
    <div class="prompt-card">
      <div class="prompt-header">
        <div class="prompt-meta">
          <span class="prompt-type">{{ currentTask.type }}</span>
          <span class="prompt-words">
            {{ currentTask.minWords }}–{{ currentTask.maxWords }} mots
          </span>
        </div>
        <select class="prompt-select" v-model="currentPromptIdx">
          <option :value="-1">— Aucun (j'utilise mon propre sujet) —</option>
          <option v-for="(p, i) in currentTask.prompts" :key="i" :value="i">
            Sujet d'entraînement {{ i + 1 }} — {{ p.title }}
          </option>
        </select>
      </div>
      <p class="prompt-description">{{ currentTask.description }}</p>

      <!-- Zone : coller le sujet officiel -->
      <label class="paste-label" :for="`paste-${currentTaskId}`">
        📋 Sujet à coller (collez ici l'énoncé que vous voulez avoir sous les yeux)
      </label>
      <textarea
        :id="`paste-${currentTaskId}`"
        class="paste-area"
        v-model="pastedSujets[currentTaskId]"
        spellcheck="false"
        autocorrect="off"
        rows="3"
        placeholder="Collez ici l'énoncé du sujet que vous voulez traiter…"
      ></textarea>

      <!-- Sujet d'entraînement (si sélectionné) -->
      <div v-if="currentPromptIdx >= 0 && currentPrompt" class="prompt-text">
        <div class="prompt-text-header">Sujet d'entraînement : {{ currentPrompt.title }}</div>
        {{ currentPrompt.text }}
      </div>
    </div>

    <!-- Clavier virtuel d'accents -->
    <div class="accent-bar" role="toolbar" aria-label="Caractères accentués">
      <button
        v-for="ch in accentKeys"
        :key="ch"
        class="accent-key"
        @mousedown.prevent="insertChar(ch)"
        :title="`Insérer ${ch}`"
      >
        {{ ch }}
      </button>
    </div>

    <!-- Éditeur (textarea simple, sans correction orthographique) -->
    <textarea
      ref="editorRef"
      class="editor"
      v-model="answers[currentTaskId]"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      autocomplete="off"
      placeholder="Commencez à rédiger votre réponse ici…"
      @keydown.tab.prevent="insertChar('\t')"
    ></textarea>

    <!-- Pied : compteur + actions -->
    <div class="footer-bar">
      <div class="word-counter" :class="counterStatus">
        <strong>{{ wordCounts[currentTaskId] }}</strong>
        mot{{ wordCounts[currentTaskId] > 1 ? 's' : '' }}
        <span class="word-target">
          (cible {{ currentTask.name }} : {{ currentTask.minWords }}–{{ currentTask.maxWords }})
        </span>
        <span class="counter-icon">{{ counterIcon }}</span>
      </div>

      <div class="footer-actions">
        <button class="btn-secondary" @click="clearCurrent" title="Effacer la tâche en cours">
          🗑 Effacer
        </button>
        <button class="btn-secondary" @click="copyToClipboard" title="Copier la réponse">
          📋 Copier
        </button>
      </div>
    </div>

    <!-- Correcteur grammatical Claude (mêmes corrections que la page /correcteur) -->
    <section class="corrector-section">
      <header class="corrector-header">
        <h3 class="corrector-title">📝 Correcteur Claude</h3>
        <p class="corrector-subtitle">
          Analyse ta réponse en place : Claude marque les
          <span class="legend legend-error">erreurs</span> et propose des
          <span class="legend legend-suggestion">recommandations B2+</span>.
          Chaque correction appliquée met à jour ton texte ci-dessus.
        </p>
      </header>
      <GrammarCorrectionPanel
        :key="`gc-${currentTaskId}`"
        v-model:text="answers[currentTaskId]"
        analyse-label="✨ Corriger ma réponse avec Claude"
      />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, reactive } from 'vue'
import { tcfTasks, accentKeys } from '../../data/writingPrompts.js'
import GrammarCorrectionPanel from '../../components/GrammarCorrectionPanel.vue'

const STORAGE_KEY = 'tcf-writing-drafts-v2'

// Budget conseillé par tâche (TCF = 60 min au total)
const TASK_BUDGETS = { 1: 15 * 60, 2: 20 * 60, 3: 25 * 60 }
// On enrichit chaque tâche avec son budget
tcfTasks.forEach(t => { t.budgetSeconds = TASK_BUDGETS[t.id] })

const editorRef = ref(null)
const currentTaskId = ref(1)
// Index du sujet d'entraînement sélectionné par tâche (-1 = aucun)
const currentPromptIndices = ref({ 1: 0, 2: 0, 3: 0 })

// Une réponse + un sujet collé par tâche
const answers = ref({ 1: '', 2: '', 3: '' })
const pastedSujets = ref({ 1: '', 2: '', 3: '' })

// Minuteurs indépendants par tâche (compte croissant, pause manuelle)
const timers = reactive({
  1: { elapsed: 0, running: false },
  2: { elapsed: 0, running: false },
  3: { elapsed: 0, running: false }
})

const currentTask = computed(
  () => tcfTasks.find(t => t.id === currentTaskId.value)
)
const currentPromptIdx = computed({
  get: () => currentPromptIndices.value[currentTaskId.value] ?? 0,
  set: (v) => { currentPromptIndices.value[currentTaskId.value] = v }
})
const currentPrompt = computed(() => {
  const i = currentPromptIdx.value
  if (i < 0) return null
  return currentTask.value.prompts[i] || null
})
const currentTimer = computed(() => timers[currentTaskId.value])

const totalElapsed = computed(
  () => timers[1].elapsed + timers[2].elapsed + timers[3].elapsed
)

// --- Compteurs de mots (par tâche) ---
const wordCounts = computed(() => {
  const out = {}
  for (const id of [1, 2, 3]) {
    const txt = (answers.value[id] || '').trim()
    out[id] = txt ? txt.split(/\s+/).filter(Boolean).length : 0
  }
  return out
})

const counterStatus = computed(() => {
  const c = wordCounts.value[currentTaskId.value]
  const t = currentTask.value
  if (c === 0) return 'empty'
  if (c < t.minWords) return 'under'
  if (c > t.maxWords) return 'over'
  return 'ok'
})

const counterIcon = computed(() => {
  if (counterStatus.value === 'ok') return '✓'
  if (counterStatus.value === 'over') return '⚠'
  if (counterStatus.value === 'under') return '…'
  return ''
})

function warningSeconds(task) {
  // Avertissement à 80 % du budget
  return Math.floor(task.budgetSeconds * 0.8)
}

// --- Insertion d'un caractère à la position du curseur ---
function insertChar(ch) {
  const ta = editorRef.value
  if (!ta) return
  const start = ta.selectionStart ?? 0
  const end = ta.selectionEnd ?? 0
  const before = ta.value.slice(0, start)
  const after = ta.value.slice(end)
  const next = before + ch + after
  answers.value[currentTaskId.value] = next
  nextTick(() => {
    ta.focus()
    const pos = start + ch.length
    ta.setSelectionRange(pos, pos)
  })
}

// --- Actions ---
function clearCurrent() {
  if (!confirm('Effacer le texte de la tâche en cours ?')) return
  answers.value[currentTaskId.value] = ''
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(answers.value[currentTaskId.value] || '')
  } catch (e) {
    // ignore
  }
}

// --- Persistance localStorage ---
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data.answers) answers.value = { 1: '', 2: '', 3: '', ...data.answers }
    if (data.pastedSujets) pastedSujets.value = { 1: '', 2: '', 3: '', ...data.pastedSujets }
    if (data.currentPromptIndices) {
      currentPromptIndices.value = { 1: 0, 2: 0, 3: 0, ...data.currentPromptIndices }
    }
    if (typeof data.currentTaskId === 'number') currentTaskId.value = data.currentTaskId
    if (data.timers) {
      for (const id of [1, 2, 3]) {
        if (data.timers[id]) {
          timers[id].elapsed = data.timers[id].elapsed || 0
          // On ne reprend jamais en cours après un rechargement
          timers[id].running = false
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        answers: answers.value,
        pastedSujets: pastedSujets.value,
        currentPromptIndices: currentPromptIndices.value,
        currentTaskId: currentTaskId.value,
        timers: {
          1: { elapsed: timers[1].elapsed },
          2: { elapsed: timers[2].elapsed },
          3: { elapsed: timers[3].elapsed }
        }
      })
    )
  } catch (e) {
    // ignore
  }
}

watch(
  [answers, pastedSujets, currentTaskId, currentPromptIndices],
  saveState,
  { deep: true }
)

// --- Tick global : incrémente toute tâche en marche ---
let intervalId = null
function ensureInterval() {
  if (intervalId) return
  intervalId = setInterval(() => {
    let anyRunning = false
    let dirty = false
    for (const id of [1, 2, 3]) {
      if (timers[id].running) {
        timers[id].elapsed += 1
        anyRunning = true
        if (timers[id].elapsed % 5 === 0) dirty = true
      }
    }
    if (dirty) saveState()
    if (!anyRunning) {
      clearInterval(intervalId)
      intervalId = null
    }
  }, 1000)
}

function toggleTimer(taskId) {
  timers[taskId].running = !timers[taskId].running
  if (timers[taskId].running) ensureInterval()
  saveState()
}

function resetTimer(taskId) {
  if (!confirm(`Réinitialiser le minuteur de la Tâche ${taskId} ?`)) return
  timers[taskId].running = false
  timers[taskId].elapsed = 0
  saveState()
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

onMounted(loadState)
onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  saveState()
})
</script>

<style scoped>
.writing-practice {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Barre supérieure */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 10px;
  flex-wrap: wrap;
}

.task-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}
.task-tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  transition: all 0.2s;
  min-width: 110px;
  text-align: left;
  position: relative;
}
.task-tab-name { font-weight: 600; font-size: 13px; }
.task-tab-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}
.task-tab:hover {
  border-color: #8e44ad;
  color: #8e44ad;
}
.task-tab.active {
  border-color: #8e44ad;
  background: #8e44ad14;
  color: #8e44ad;
}
.task-tab.running::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #27ae60;
  box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.6);
  animation: dot-pulse 1.4s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.6); }
  50% { box-shadow: 0 0 0 6px rgba(39, 174, 96, 0); }
}

.total-box {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
  font-variant-numeric: tabular-nums;
  min-width: 96px;
}
.total-label { font-size: 11px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.5px; }
.total-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.total-budget { font-size: 11px; color: var(--text-faint); }

/* Minuteur de la tâche en cours */
.task-timer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 12px;
  transition: all 0.2s;
}
.task-timer.running { border-color: #27ae60; background: #27ae600d; }
.task-timer.warning { border-color: #e67e22; background: #e67e220d; }
.task-timer.over {
  border-color: #c0392b;
  background: #c0392b12;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.25); }
  50% { box-shadow: 0 0 0 6px rgba(192, 57, 43, 0); }
}
.task-timer-info { display: inline-flex; align-items: baseline; gap: 8px; }
.task-timer-icon { font-size: 16px; }
.task-timer-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.task-timer-budget { font-size: 12px; color: var(--text-faint); }
.task-timer-actions { display: flex; gap: 6px; }
.timer-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s;
}
.timer-btn:hover { border-color: #8e44ad; color: #8e44ad; }
.timer-btn.primary {
  border-color: #8e44ad;
  background: #8e44ad14;
  color: #8e44ad;
  font-weight: 600;
}

/* Consigne */
.prompt-card {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.prompt-meta { display: inline-flex; gap: 10px; align-items: center; }
.prompt-type {
  font-weight: 700;
  color: #8e44ad;
  font-size: 14px;
}
.prompt-words {
  font-size: 12px;
  color: var(--text-faint);
  background: var(--surface-alt);
  padding: 2px 8px;
  border-radius: 8px;
}
.prompt-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  max-width: 100%;
}
.prompt-description {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
}
.paste-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
}
.paste-area {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px dashed var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.paste-area:focus { border-style: solid; border-color: #8e44ad; }
.prompt-text {
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.55;
  background: var(--surface-alt);
  padding: 10px 12px;
  border-radius: 10px;
}
.prompt-text-header {
  font-weight: 600;
  margin-bottom: 4px;
  color: #8e44ad;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Clavier virtuel */
.accent-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.accent-key {
  min-width: 34px;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 16px;
  line-height: 1;
  transition: all 0.15s;
}
.accent-key:hover {
  border-color: #8e44ad;
  color: #8e44ad;
  transform: translateY(-1px);
}
.accent-key:active { transform: translateY(0); }

/* Éditeur */
.editor {
  width: 100%;
  min-height: 320px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: 'Inter', Georgia, serif;
  font-size: 15px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.editor:focus { border-color: #8e44ad; box-shadow: 0 0 0 3px #8e44ad22; }

/* Pied */
.footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.word-counter {
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
}
.word-counter strong {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  margin-right: 4px;
}
.word-target { color: var(--text-faint); margin-left: 4px; font-size: 12px; }
.counter-icon { margin-left: 8px; font-weight: 700; }
.word-counter.ok { border-color: #27ae60; color: #27ae60; background: #27ae6010; }
.word-counter.under { border-color: #e67e22; color: #e67e22; background: #e67e220e; }
.word-counter.over { border-color: #c0392b; color: #c0392b; background: #c0392b10; }

.footer-actions { display: flex; gap: 8px; }
.btn-secondary {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-secondary:hover {
  border-color: #8e44ad;
  color: #8e44ad;
}

/* Section correcteur (intégré sous l'éditeur) */
.corrector-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1.5px dashed var(--border);
}
.corrector-header { padding: 0 2px; }
.corrector-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--title-color);
  margin-bottom: 4px;
}
.corrector-subtitle {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.55;
}
.legend {
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 5px;
}
.legend-error { background: #c0392b18; color: #c0392b; }
.legend-suggestion { background: #f1c40f33; color: #b7950b; }
</style>
