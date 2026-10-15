<template>
  <div class="writing-practice">
    <nav class="mode-tabs" aria-label="Mode d'entraînement">
      <button v-for="item in modes" :key="item.id" class="mode-tab" :class="{ active: mode === item.id }" :disabled="hasRunningTimer" @click="changeMode(item.id)">
        {{ item.label }}
      </button>
    </nav>

    <ProductionHistory v-if="mode === 'history'" :attempts="attempts" @delete="removeAttempt" />
    <template v-else>
    <p class="mode-notice" :class="mode">
      <strong>{{ currentMode.label }} :</strong> {{ currentMode.description }}
    </p>

    <!-- Barre supérieure : sélection de tâche + total -->
    <div class="top-bar">
      <div class="task-tabs">
        <button
          v-for="t in tcfTasks"
          :key="t.id"
          class="task-tab"
          :class="{ active: currentTaskId === t.id, running: timerForTask(t.id).running }"
          :disabled="hasRunningTimer && currentTaskId !== t.id"
          @click="currentTaskId = t.id"
        >
          <span class="task-tab-name">{{ t.name }}</span>
          <span class="task-tab-meta">
            <span class="task-tab-time">{{ formatTime(timerForTask(t.id).elapsed) }}</span>
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
        <select class="prompt-select" v-model="currentPromptIdx" :disabled="currentTimer.running">
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

    <section v-if="mode !== 'exam' && currentPrompt" class="coach-card">
      <div class="coach-head">
        <div><strong>Coach de préparation</strong><p>Révélez un point à la fois. Chaque ouverture sera enregistrée comme assistance.</p></div>
        <span>{{ revealedHints.length }}/{{ currentPrompt.expectedCoverage.length }}</span>
      </div>
      <div class="hint-actions">
        <button class="btn-secondary" :disabled="revealedHints.length >= currentPrompt.expectedCoverage.length" @click="revealHint">Révéler un point</button>
        <button v-if="mode === 'learn'" class="btn-secondary" @click="revealAllHints">Tout afficher</button>
      </div>
      <ul v-if="revealedHints.length" class="hint-list"><li v-for="hint in revealedHints" :key="hint">{{ coverageLabel(hint) }}</li></ul>
    </section>

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
      v-model="currentAnswer"
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
        <button class="submit-btn" :disabled="!currentAnswer.trim()" @click="selfCheckOpen = true">Soumettre la tentative</button>
      </div>
    </div>

    <section v-if="selfCheckOpen" class="self-check-card">
      <header><h3>Auto-vérification avant le retour automatisé</h3><p>Cette réflexion est conservée avec la tentative.</p></header>
      <label v-for="item in selfCheckItems" :key="item.id" class="check-row">
        <input v-model="selfAssessment[item.id]" type="checkbox" />
        <span>{{ item.label }}</span>
      </label>
      <div class="self-check-actions">
        <button class="btn-secondary" @click="selfCheckOpen = false">Continuer à écrire</button>
        <button class="submit-btn" :disabled="submitting" @click="submitAttempt">{{ submitting ? 'Enregistrement…' : 'Confirmer et enregistrer' }}</button>
      </div>
    </section>
    <p v-if="submitMessage" class="submit-message" aria-live="polite">{{ submitMessage }}</p>

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
        :key="`gc-${draftKey}`"
        v-model:text="currentAnswer"
        :context="evaluationContext"
        analyse-label="✨ Évaluer ma réponse avec Claude"
        @evaluated="storeEvaluation"
      />
    </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, reactive } from 'vue'
import { tcfTasks, accentKeys } from '../../data/writingPrompts.js'
import GrammarCorrectionPanel from '../../components/GrammarCorrectionPanel.vue'
import ProductionHistory from '../../components/ProductionHistory.vue'
import { createAttemptId, deleteProductionAttempt, listProductionAttempts, saveProductionAttempt, saveProductionEvaluation } from '../../utils/productionStore.js'

const STORAGE_KEY = 'tcf-writing-drafts-v2'
const modes = [
  { id: 'learn', label: 'Apprendre', description: 'conseils et points de couverture disponibles sans comparaison avec les conditions d’examen.' },
  { id: 'guided', label: 'Guidé', description: 'minuteur actif et indices progressifs, enregistrés dans la tentative.' },
  { id: 'exam', label: 'Examen', description: 'aucun indice pendant la production; contraintes et minuterie seulement.' },
  { id: 'history', label: 'Historique', description: '' }
]
const mode = ref('guided')
const currentMode = computed(() => modes.find(item => item.id === mode.value) || modes[1])
const attempts = ref([])
const submitting = ref(false)
const submitMessage = ref('')
const selfCheckOpen = ref(false)
const hintCounts = ref({})

// Budget conseillé par tâche (TCF = 60 min au total)
const TASK_BUDGETS = { 1: 15 * 60, 2: 20 * 60, 3: 25 * 60 }
// On enrichit chaque tâche avec son budget
tcfTasks.forEach(t => { t.budgetSeconds = TASK_BUDGETS[t.id] })

const editorRef = ref(null)
const currentTaskId = ref(1)
// Index du sujet d'entraînement sélectionné par tâche (-1 = aucun)
const currentPromptIndices = ref({ 1: 0, 2: 0, 3: 0 })

// Une réponse + un sujet collé par tâche
const answers = ref({})
const pastedSujets = ref({ 1: '', 2: '', 3: '' })

// Minuteurs indépendants par tâche (compte croissant, pause manuelle)
const timers = reactive({})

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
const draftKey = computed(() => currentPrompt.value?.id || `ee-t${currentTaskId.value}-custom`)
const currentAnswer = computed({
  get: () => answers.value[draftKey.value] || '',
  set: value => { answers.value[draftKey.value] = value }
})
const revealedHints = computed(() => currentPrompt.value?.expectedCoverage.slice(0, hintCounts.value[draftKey.value] || 0) || [])
const assistanceUsed = computed(() => revealedHints.value.map(hint => `indice:${hint}`))
const evaluationContext = computed(() => ({
  skill: 'ee', task: currentTaskId.value, promptId: currentPrompt.value?.id || draftKey.value,
  promptVersion: currentPrompt.value?.version || 1,
  instruction: currentPrompt.value?.text || pastedSujets.value[currentTaskId.value],
  expectedCoverage: currentPrompt.value?.expectedCoverage || [], mode: mode.value,
  assistanceUsed: assistanceUsed.value
}))
function draftKeyForTask(taskId) {
  const task = tcfTasks.find(item => item.id === taskId)
  const index = currentPromptIndices.value[taskId] ?? 0
  return task?.prompts[index]?.id || `ee-t${taskId}-custom`
}
function timerForTask(taskId) {
  const key = draftKeyForTask(taskId)
  if (!timers[key]) timers[key] = { elapsed: 0, running: false }
  return timers[key]
}
const currentTimer = computed(() => timerForTask(currentTaskId.value))
const hasRunningTimer = computed(() => Object.values(timers).some(timer => timer.running))

const totalElapsed = computed(
  () => [1, 2, 3].reduce((sum, id) => sum + timerForTask(id).elapsed, 0)
)

// --- Compteurs de mots (par tâche) ---
const wordCounts = computed(() => {
  const out = {}
  for (const id of [1, 2, 3]) {
    const task = tcfTasks.find(item => item.id === id)
    const promptIndex = currentPromptIndices.value[id] ?? 0
    const key = task?.prompts[promptIndex]?.id || `ee-t${id}-custom`
    const txt = (answers.value[key] || '').trim()
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
  currentAnswer.value = next
  nextTick(() => {
    ta.focus()
    const pos = start + ch.length
    ta.setSelectionRange(pos, pos)
  })
}

// --- Actions ---
function clearCurrent() {
  if (!confirm('Effacer le texte de la tâche en cours ?')) return
  currentAnswer.value = ''
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(currentAnswer.value)
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
    if (data.answers) {
      const migrated = { ...data.answers }
      for (const id of [1, 2, 3]) {
        if (typeof data.answers[id] === 'string' && data.answers[id]) {
          migrated[`ee-t${id}-custom`] = data.answers[id]
          currentPromptIndices.value[id] = -1
          if (data.currentPromptIndices) data.currentPromptIndices[id] = -1
          delete migrated[id]
        }
      }
      answers.value = migrated
    }
    if (data.pastedSujets) pastedSujets.value = { 1: '', 2: '', 3: '', ...data.pastedSujets }
    if (data.currentPromptIndices) {
      currentPromptIndices.value = { 1: 0, 2: 0, 3: 0, ...data.currentPromptIndices }
    }
    if (typeof data.currentTaskId === 'number') currentTaskId.value = data.currentTaskId
    if (['learn', 'guided', 'exam'].includes(data.mode)) mode.value = data.mode
    if (data.hintCounts) hintCounts.value = data.hintCounts
    if (data.timersByDraft) {
      for (const [key, timer] of Object.entries(data.timersByDraft)) timers[key] = { elapsed: timer.elapsed || 0, running: false }
    } else if (data.timers) {
      for (const id of [1, 2, 3]) {
        if (data.timers[id]) {
          timerForTask(id).elapsed = data.timers[id].elapsed || 0
          timerForTask(id).running = false
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
        mode: mode.value,
        hintCounts: hintCounts.value,
        timersByDraft: Object.fromEntries(Object.entries(timers).map(([key, timer]) => [key, { elapsed: timer.elapsed }]))
      })
    )
  } catch (e) {
    // ignore
  }
}

watch(
  [answers, pastedSujets, currentTaskId, currentPromptIndices, mode, hintCounts],
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
    for (const timer of Object.values(timers)) {
      if (timer.running) {
        timer.elapsed += 1
        anyRunning = true
        if (timer.elapsed % 5 === 0) dirty = true
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
  const timer = timerForTask(taskId)
  timer.running = !timer.running
  if (timer.running) ensureInterval()
  saveState()
}

function resetTimer(taskId) {
  if (!confirm(`Réinitialiser le minuteur de la Tâche ${taskId} ?`)) return
  const timer = timerForTask(taskId)
  timer.running = false
  timer.elapsed = 0
  saveState()
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function revealHint() {
  const maximum = currentPrompt.value?.expectedCoverage.length || 0
  hintCounts.value[draftKey.value] = Math.min(maximum, (hintCounts.value[draftKey.value] || 0) + 1)
}
function revealAllHints() {
  hintCounts.value[draftKey.value] = currentPrompt.value?.expectedCoverage.length || 0
}
function coverageLabel(value) {
  return value.replaceAll('-', ' ')
}
function changeMode(nextMode) {
  if (nextMode === 'exam' && assistanceUsed.value.length && !confirm('Passer en mode Examen effacera les indices de ce brouillon. Continuer ?')) return
  if (nextMode === 'exam') hintCounts.value[draftKey.value] = 0
  mode.value = nextMode
}

const baseSelfCheckItems = [
  { id: 'allPoints', label: 'J’ai répondu à tous les points demandés.' },
  { id: 'register', label: 'Le destinataire et le registre sont appropriés.' },
  { id: 'wordRange', label: 'Ma réponse respecte la fourchette de mots.' },
  { id: 'mainMessage', label: 'Mon message ou ma position principale est clair.' },
  { id: 'example', label: 'J’ai ajouté un détail ou un exemple concret.' }
]
const selfCheckItems = computed(() => currentTaskId.value === 3
  ? [...baseSelfCheckItems, { id: 'comparison', label: 'J’ai comparé les deux points de vue et séparé mon opinion.' }]
  : baseSelfCheckItems)
const selfAssessment = reactive({ allPoints: false, register: false, wordRange: false, mainMessage: false, example: false, comparison: false })
watch(draftKey, () => {
  selfCheckOpen.value = false
  submitMessage.value = ''
  for (const key of Object.keys(selfAssessment)) selfAssessment[key] = false
})

async function submitAttempt() {
  if (!currentAnswer.value.trim()) return
  submitting.value = true
  submitMessage.value = ''
  try {
    const now = Date.now()
    const attempt = {
      id: createAttemptId('ee'), skill: 'ee', task: currentTaskId.value,
      promptId: currentPrompt.value?.id || draftKey.value,
      promptTitle: currentPrompt.value?.title || 'Sujet personnel',
      promptVersion: currentPrompt.value?.version || 1, mode: mode.value,
      assistanceUsed: [...assistanceUsed.value], startedAt: now - currentTimer.value.elapsed * 1000,
      submittedAt: now, activeSeconds: currentTimer.value.elapsed,
      responseText: currentAnswer.value, wordCount: wordCounts.value[currentTaskId.value],
      selfAssessment: Object.fromEntries(selfCheckItems.value.map(item => [item.id, !!selfAssessment[item.id]])),
      evaluation: null, revisionOfAttemptId: null,
      contentTags: [...(currentPrompt.value?.themes || [])]
    }
    await saveProductionAttempt(attempt)
    attempts.value.unshift(attempt)
    submitMessage.value = 'Tentative enregistrée. Vous pouvez maintenant demander l’évaluation sans risque de perdre votre texte.'
    selfCheckOpen.value = false
  } catch (error) {
    submitMessage.value = `Impossible d’enregistrer : ${error.message}`
  } finally { submitting.value = false }
}

async function removeAttempt(attempt) {
  if (!confirm('Supprimer définitivement cette tentative ?')) return
  await deleteProductionAttempt(attempt)
  attempts.value = attempts.value.filter(item => item.id !== attempt.id)
}
async function storeEvaluation(evaluation) {
  const attempt = attempts.value.find(item => item.promptId === evaluationContext.value.promptId && item.responseText === evaluation.original)
  if (!attempt) return
  await saveProductionEvaluation(attempt.id, evaluation)
  attempt.evaluation = evaluation
}

onMounted(async () => {
  loadState()
  try { attempts.value = await listProductionAttempts('ee') } catch { /* local storage may be unavailable */ }
})
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
.mode-tabs { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-alt); }
.mode-tab { min-height: 40px; padding: 7px 13px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 600; }
.mode-tab.active { border-color: #8e44ad; background: var(--surface); color: #8e44ad; }
.mode-notice { padding: 9px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text-muted); font-size: 12.5px; }
.mode-notice.exam { border-color: #8e44ad66; }
.coach-card, .self-check-card { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 1.5px solid var(--border); border-radius: 14px; background: var(--surface); }
.coach-head { display: flex; justify-content: space-between; gap: 10px; }
.coach-head strong, .self-check-card h3 { color: var(--title-color); font-size: 15px; }
.coach-head p, .self-check-card header p { margin-top: 3px; color: var(--text-muted); font-size: 12px; }
.coach-head > span { align-self: start; padding: 3px 8px; border-radius: 999px; background: var(--surface-alt); color: var(--text-muted); font-size: 11px; }
.hint-actions, .self-check-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.hint-list { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; }
.hint-list li { padding: 5px 9px; border-radius: 999px; background: #8e44ad14; color: #8e44ad; font-size: 12px; }
.check-row { display: flex; gap: 9px; align-items: start; color: var(--text-secondary); font-size: 13px; line-height: 1.4; }
.check-row input { margin-top: 2px; width: 17px; height: 17px; accent-color: #8e44ad; }
.submit-btn { min-height: 40px; padding: 8px 13px; border: 1.5px solid #8e44ad; border-radius: 9px; background: #8e44ad; color: white; font-size: 13px; font-weight: 600; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.submit-message { padding: 9px 12px; border-radius: 9px; background: #27ae6014; color: #218c50; font-size: 12.5px; }

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
