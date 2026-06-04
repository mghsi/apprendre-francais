<template>
  <div class="eo-page">
    <!-- Onglets tâches -->
    <div class="eo-top-bar">
      <div class="eo-task-tabs">
        <button
          v-for="t in eoTasks"
          :key="t.id"
          class="eo-task-tab"
          :class="{ active: currentTaskId === t.id }"
          @click="currentTaskId = t.id"
        >
          <span class="eo-tab-name">{{ t.name }}</span>
          <span class="eo-tab-meta">
            <span class="eo-tab-type">{{ t.type }}</span>
            <span class="eo-tab-time">
              {{ t.prepSeconds ? formatTime(t.prepSeconds) + ' + ' : '' }}{{ formatTime(t.speakSeconds) }}
            </span>
          </span>
        </button>
      </div>

      <div class="eo-total-box">
        <span class="eo-total-label">Total budget</span>
        <span class="eo-total-value">{{ formatTime(totalBudget) }}</span>
      </div>
    </div>

    <!-- Layout : colonne principale + sidebar vocab (Tâche 3 grand écran) -->
    <div
      class="eo-layout"
      :class="{ 'with-sidebar': showVocabSidebar }"
    >
      <div class="eo-main">

        <!-- Minuteur phase courante -->
        <div
          class="eo-timer"
          :class="{
            running: phase === 'recording',
            paused: phase === 'paused',
            prep: phase === 'prep',
            warning: remainingSeconds <= 15 && remainingSeconds > 0 && phase !== 'idle' && phase !== 'finished',
            over: remainingSeconds <= 0 && phase !== 'idle'
          }"
        >
          <div class="eo-timer-info">
            <span class="eo-timer-phase">{{ phaseLabel }}</span>
            <span class="eo-timer-value">{{ formatTime(Math.max(0, remainingSeconds)) }}</span>
            <span class="eo-timer-total">
              / {{ formatTime(phaseTotalSeconds) }} {{ phase === 'prep' ? 'préparation' : 'parole' }}
            </span>
          </div>
          <div class="eo-timer-actions">
            <button
              v-if="currentTask.prepSeconds > 0 && phase === 'idle'"
              class="eo-timer-btn primary"
              @click="startPrep"
            >▶ Démarrer la préparation</button>

            <button
              v-if="phase === 'prep'"
              class="eo-timer-btn"
              @click="skipPrep"
            >⏭ Passer à la parole</button>

            <button
              v-if="(phase === 'idle' || phase === 'finished') && currentTask.prepSeconds === 0"
              class="eo-timer-btn primary"
              @click="startSpeaking"
            >● Démarrer l'enregistrement</button>

            <button
              v-if="phase === 'idle' && currentTask.prepSeconds > 0"
              class="eo-timer-btn ghost"
              @click="startSpeaking"
              title="Passer directement à la parole sans préparation"
            >● Enregistrer sans prep</button>

            <button
              v-if="phase === 'recording'"
              class="eo-timer-btn"
              @click="onPause"
            >⏸ Pause</button>

            <button
              v-if="phase === 'paused'"
              class="eo-timer-btn primary"
              @click="onResume"
            >▶ Reprendre</button>

            <button
              v-if="phase === 'recording' || phase === 'paused'"
              class="eo-timer-btn stop"
              @click="onStop"
            >⏹ Arrêter</button>

            <button
              v-if="phase !== 'idle'"
              class="eo-timer-btn ghost"
              @click="restartAll"
              title="Effacer l'enregistrement et recommencer cette tâche"
            >🔄 Recommencer</button>
          </div>
        </div>

        <!-- Consigne -->
        <div class="eo-prompt-card">
          <div class="eo-prompt-head">
            <div class="eo-prompt-meta">
              <span class="eo-prompt-type">{{ currentTask.type }}</span>
              <span class="eo-prompt-budget">
                {{ currentTask.prepSeconds ? formatTime(currentTask.prepSeconds) + ' prep + ' : '' }}{{ formatTime(currentTask.speakSeconds) }} parole
              </span>
            </div>
            <select class="eo-prompt-select" v-model="currentPromptIdx">
              <option :value="-1">— Aucun (j'utilise mon propre sujet) —</option>
              <option v-for="(p, i) in currentTask.prompts" :key="i" :value="i">
                Sujet {{ i + 1 }} — {{ p.title }}
              </option>
            </select>
          </div>
          <p class="eo-prompt-desc">{{ currentTask.description }}</p>

          <label class="eo-paste-label" :for="`paste-${currentTaskId}`">
            📋 Sujet à coller (utilisez votre propre énoncé si besoin)
          </label>
          <textarea
            :id="`paste-${currentTaskId}`"
            class="eo-paste-area"
            v-model="pastedSujets[currentTaskId]"
            spellcheck="false"
            rows="3"
            placeholder="Collez ici l'énoncé que vous voulez traiter…"
          ></textarea>

          <div v-if="currentPromptIdx >= 0 && currentPrompt" class="eo-prompt-text">
            <div class="eo-prompt-text-head">Sujet d'entraînement : {{ currentPrompt.title }}</div>
            {{ currentPrompt.text }}
          </div>
        </div>

        <!-- Structure / plan suggéré -->
        <StructurePanel
          v-if="currentTask.structures && currentTask.structures.length"
          :structures="currentTask.structures"
          :current-idx="currentStructureIdx"
          :elapsed-seconds="speakingElapsedSeconds"
          :recording="phase === 'recording' || phase === 'paused'"
          :enabled="currentStructureEnabled"
          @update:current-idx="currentStructureIdx = $event"
          @disable="currentStructureEnabled = false"
          @enable="currentStructureEnabled = true"
        />

        <!-- Champ notes (Tâche 3 uniquement, phase prep + speak) -->
        <div
          v-if="currentTask.prepSeconds > 0 && (phase === 'prep' || phase === 'recording' || phase === 'paused')"
          class="eo-notes-card"
        >
          <label class="eo-notes-label" :for="`notes-${currentTaskId}`">
            📝 Notes de préparation (éphémères — pour structurer vos arguments)
          </label>
          <textarea
            :id="`notes-${currentTaskId}`"
            class="eo-notes-area"
            v-model="prepNotes"
            spellcheck="false"
            rows="5"
            placeholder="Idées, plan, vocabulaire à utiliser, exemples concrets…"
          ></textarea>
        </div>

        <!-- Vocab inline (Tâche 3, petit écran) -->
        <VocabPanel
          v-if="currentTaskId === 3 && !showVocabSidebar"
          :task-id="3"
          :recording="phase === 'recording'"
          :auto-collapse="true"
        />

        <!-- Enregistreur -->
        <div class="eo-recorder-card" v-if="phase !== 'prep'">
          <div class="eo-rec-row">
            <div class="eo-rec-status">
              <span
                class="eo-rec-dot"
                :class="{
                  recording: phase === 'recording',
                  paused: phase === 'paused',
                  done: phase === 'finished' && recorder.audioBlob.value
                }"
              ></span>
              <span class="eo-rec-label">{{ recorderLabel }}</span>
            </div>
            <div class="eo-rec-meter" :title="`Niveau ${(recorder.state.level * 100).toFixed(0)} %`">
              <div
                class="eo-rec-meter-fill"
                :style="{ width: (recorder.state.level * 100) + '%' }"
              ></div>
            </div>
          </div>

          <div v-if="recorder.state.error" class="eo-rec-error">
            ⚠️ {{ recorder.state.error }}
          </div>

          <div v-if="!recorder.state.speechSupported" class="eo-rec-warn">
            ℹ️ Votre navigateur ne supporte pas la transcription en direct (Web
            Speech API). L'audio sera enregistré normalement ; utilisez
            Chrome ou Edge pour obtenir une transcription gratuite.
          </div>

          <!-- Lecteur audio -->
          <audio
            v-if="recorder.audioUrl.value"
            class="eo-audio"
            controls
            :src="recorder.audioUrl.value"
          ></audio>
        </div>

        <!-- Transcription + analyse -->
        <section v-if="recorder.transcript.value || recorder.interim.value" class="eo-transcript-card">
          <header class="eo-tr-head">
            <h3 class="eo-tr-title">🗣 Transcription</h3>
            <p class="eo-tr-sub">
              Générée gratuitement en direct dans le navigateur. Corrige le texte
              à la main si besoin, puis analyse-le comme une rédaction.
            </p>
          </header>

          <textarea
            class="eo-tr-area"
            v-model="recorder.transcript.value"
            rows="6"
            spellcheck="false"
            placeholder="La transcription apparaîtra ici au fur et à mesure…"
          ></textarea>

          <p v-if="recorder.interim.value" class="eo-interim">
            <em>… {{ recorder.interim.value }}</em>
          </p>

          <div class="eo-tr-actions">
            <button
              class="eo-tr-btn"
              @click="copyTranscript"
              :disabled="!recorder.transcript.value"
            >📋 Copier</button>
            <button
              class="eo-tr-btn"
              @click="recorder.transcript.value = ''"
              :disabled="!recorder.transcript.value"
            >🧹 Effacer</button>
          </div>

          <div class="eo-corrector">
            <header class="eo-corrector-head">
              <h4>📝 Analyse B2+ par Claude</h4>
              <p>
                Réutilise le même correcteur que l'épreuve écrite : erreurs
                marquées, suggestions stylistiques pour viser le niveau B2+.
              </p>
            </header>
            <GrammarCorrectionPanel
              :key="`eo-gc-${currentTaskId}`"
              v-model:text="recorder.transcript.value"
              analyse-label="✨ Analyser ma prise de parole avec Claude"
            />
          </div>
        </section>
      </div>

      <!-- Sidebar vocab (Tâche 3 grand écran) -->
      <aside v-if="showVocabSidebar" class="eo-sidebar">
        <VocabPanel
          :task-id="3"
          :sidebar="true"
          :recording="phase === 'recording'"
          :auto-collapse="false"
        />
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import { eoTasks } from '../../data/speakingPrompts.js'
import { useRecorder } from '../../composables/useRecorder.js'
import { saveAudio, loadAudio, deleteAudio } from '../../composables/useAudioStorage.js'
import VocabPanel from '../../components/VocabPanel.vue'
import StructurePanel from '../../components/StructurePanel.vue'
import GrammarCorrectionPanel from '../../components/GrammarCorrectionPanel.vue'

const STATE_KEY = 'tcf-eo-state-v1'

const currentTaskId = ref(1)
const currentPromptIndices = ref({ 1: 0, 2: 0, 3: 0 })
const pastedSujets = ref({ 1: '', 2: '', 3: '' })
const prepNotes = ref('')

// Structure pédagogique : index de la structure courante + activation, par tâche.
// L'utilisateur peut tourner les structures pour s'habituer à chacune.
const structureIndices = ref({ 1: 0, 2: 0, 3: 0 })
const structureEnabled = ref({ 1: true, 2: true, 3: true })

// One recorder instance, switched per task via clear + reload
const recorder = useRecorder()

// Phase machine per task: idle → prep? → recording ↔ paused → finished
const phase = ref('idle')
let phaseInterval = 0
const phaseStartedAt = ref(0)
const phaseEndsAt = ref(0)
const phaseRemainingFrozen = ref(0) // when paused

const currentTask = computed(
  () => eoTasks.find((t) => t.id === currentTaskId.value) || eoTasks[0]
)
const currentPromptIdx = computed({
  get: () => currentPromptIndices.value[currentTaskId.value] ?? 0,
  set: (v) => { currentPromptIndices.value[currentTaskId.value] = v },
})
const currentPrompt = computed(() => {
  const i = currentPromptIdx.value
  if (i < 0) return null
  return currentTask.value.prompts[i] || null
})

const totalBudget = computed(() =>
  eoTasks.reduce((s, t) => s + t.prepSeconds + t.speakSeconds, 0)
)

const currentStructureIdx = computed({
  get: () => structureIndices.value[currentTaskId.value] ?? 0,
  set: (v) => { structureIndices.value[currentTaskId.value] = v },
})
const currentStructureEnabled = computed({
  get: () => structureEnabled.value[currentTaskId.value] ?? true,
  set: (v) => { structureEnabled.value[currentTaskId.value] = v },
})
// Seconds elapsed inside the current SPEAKING phase (drives step highlight).
const speakingElapsedSeconds = computed(() => {
  if (phase.value !== 'recording' && phase.value !== 'paused') return 0
  return Math.max(0, currentTask.value.speakSeconds - remainingSeconds.value)
})

const phaseTotalSeconds = computed(() => {
  if (phase.value === 'prep') return currentTask.value.prepSeconds
  return currentTask.value.speakSeconds
})

const remainingSeconds = ref(0)
function recomputeRemaining() {
  if (phase.value === 'paused') {
    remainingSeconds.value = phaseRemainingFrozen.value
    return
  }
  if (phase.value === 'prep' || phase.value === 'recording') {
    const ms = phaseEndsAt.value - Date.now()
    remainingSeconds.value = Math.max(0, Math.ceil(ms / 1000))
    if (ms <= 0) {
      onTimerExpired()
    }
    return
  }
  if (phase.value === 'idle') {
    remainingSeconds.value = phaseTotalSeconds.value
  }
  if (phase.value === 'finished') {
    remainingSeconds.value = 0
  }
}

function startPhaseTick() {
  stopPhaseTick()
  phaseInterval = setInterval(recomputeRemaining, 250)
  recomputeRemaining()
}
function stopPhaseTick() {
  if (phaseInterval) {
    clearInterval(phaseInterval)
    phaseInterval = 0
  }
}

const phaseLabel = computed(() => {
  if (phase.value === 'prep') return '⏳ Préparation'
  if (phase.value === 'recording') return '🔴 Enregistrement en cours'
  if (phase.value === 'paused') return '⏸ Enregistrement en pause'
  if (phase.value === 'finished') return '✅ Enregistrement terminé'
  return '⏱ Prêt à commencer'
})

const recorderLabel = computed(() => {
  if (recorder.state.status === 'recording') return 'Enregistrement actif…'
  if (recorder.state.status === 'paused') return 'En pause'
  if (recorder.state.status === 'stopped' && recorder.audioBlob.value) return 'Enregistrement disponible'
  if (recorder.state.status === 'error') return 'Erreur'
  return 'Aucun enregistrement'
})

// Show vocab sidebar only on Tâche 3 + large viewport
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
function onResize() { viewportWidth.value = window.innerWidth }

const showVocabSidebar = computed(
  () => currentTaskId.value === 3 && viewportWidth.value >= 1100
)

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ---- Phase transitions ----
function startPrep() {
  phase.value = 'prep'
  phaseStartedAt.value = Date.now()
  phaseEndsAt.value = Date.now() + currentTask.value.prepSeconds * 1000
  startPhaseTick()
}

function skipPrep() {
  startSpeaking()
}

async function startSpeaking() {
  // If we were on prep, leave it
  await recorder.start()
  if (recorder.state.status !== 'recording') {
    // start() failed (e.g. mic denied) — fall back to idle so user can retry
    phase.value = 'idle'
    stopPhaseTick()
    return
  }
  phase.value = 'recording'
  phaseStartedAt.value = Date.now()
  phaseEndsAt.value = Date.now() + currentTask.value.speakSeconds * 1000
  startPhaseTick()
}

function onPause() {
  if (phase.value !== 'recording') return
  recorder.pause()
  // Freeze remaining time
  phaseRemainingFrozen.value = Math.max(0, Math.ceil((phaseEndsAt.value - Date.now()) / 1000))
  phase.value = 'paused'
  recomputeRemaining()
}

function onResume() {
  if (phase.value !== 'paused') return
  recorder.resume()
  phaseEndsAt.value = Date.now() + phaseRemainingFrozen.value * 1000
  phase.value = 'recording'
  recomputeRemaining()
}

function onStop() {
  if (phase.value !== 'recording' && phase.value !== 'paused') return
  recorder.stop()
  phase.value = 'finished'
  stopPhaseTick()
}

function onTimerExpired() {
  // Time's up — stop recording automatically. Stop the interval FIRST so
  // we don't re-enter this function while startSpeaking() awaits.
  if (phase.value === 'prep') {
    stopPhaseTick()
    // Official exam moves on automatically when prep ends; mimic that.
    startSpeaking()
    return
  }
  if (phase.value === 'recording') {
    stopPhaseTick()
    recorder.stop()
    phase.value = 'finished'
  }
}

function restartAll() {
  recorder.clear()
  deleteAudio(currentTaskId.value).catch(() => {})
  phase.value = 'idle'
  phaseRemainingFrozen.value = 0
  stopPhaseTick()
  recomputeRemaining()
}

async function copyTranscript() {
  try { await navigator.clipboard.writeText(recorder.transcript.value) } catch { /* */ }
}

// ---- Persistence ----
// Persist non-audio bits in localStorage
function savePersistedState() {
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({
        currentTaskId: currentTaskId.value,
        currentPromptIndices: currentPromptIndices.value,
        pastedSujets: pastedSujets.value,
        structureIndices: structureIndices.value,
        structureEnabled: structureEnabled.value,
      })
    )
  } catch { /* quota */ }
}
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return
    const obj = JSON.parse(raw)
    if (obj.currentTaskId) currentTaskId.value = obj.currentTaskId
    if (obj.currentPromptIndices) currentPromptIndices.value = obj.currentPromptIndices
    if (obj.pastedSujets) pastedSujets.value = obj.pastedSujets
    if (obj.structureIndices) structureIndices.value = { ...structureIndices.value, ...obj.structureIndices }
    if (obj.structureEnabled) structureEnabled.value = { ...structureEnabled.value, ...obj.structureEnabled }
  } catch { /* ignore */ }
}

// Reload audio from IndexedDB whenever the active task changes
async function reloadAudioForTask(taskId) {
  // If we're currently recording, stop & clear (switching tasks aborts)
  if (phase.value === 'recording' || phase.value === 'paused') {
    recorder.stop()
  }
  recorder.clear()
  phase.value = 'idle'
  phaseRemainingFrozen.value = 0
  stopPhaseTick()
  recomputeRemaining()
  prepNotes.value = ''

  const entry = await loadAudio(taskId).catch(() => null)
  if (entry?.blob) {
    recorder.loadFromBlob(entry.blob, entry.transcript || '')
    phase.value = 'finished'
  }
}

// Persist audio + transcript whenever a recording finishes
watch(
  () => recorder.audioBlob.value,
  (blob) => {
    if (blob) {
      saveAudio(currentTaskId.value, blob, recorder.transcript.value).catch(() => {})
    }
  }
)
// Persist transcript edits too
watch(
  () => recorder.transcript.value,
  (txt) => {
    if (recorder.audioBlob.value) {
      saveAudio(currentTaskId.value, recorder.audioBlob.value, txt).catch(() => {})
    }
  }
)

watch(currentTaskId, async (id) => {
  savePersistedState()
  await reloadAudioForTask(id)
})
watch([currentPromptIndices, pastedSujets, structureIndices, structureEnabled], savePersistedState, { deep: true })

onMounted(async () => {
  loadPersistedState()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize)
  }
  await reloadAudioForTask(currentTaskId.value)
  recomputeRemaining()
})

onBeforeUnmount(() => {
  stopPhaseTick()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onResize)
  }
})
</script>

<style scoped>
.eo-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Top bar */
.eo-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 10px;
}
.eo-task-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.eo-task-tab {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  min-width: 160px;
}
.eo-task-tab:hover { border-color: #e67e22; }
.eo-task-tab.active {
  border-color: #e67e22;
  background: #e67e2214;
  box-shadow: 0 2px 6px var(--shadow-sm);
}
.eo-tab-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
}
.eo-tab-meta {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: var(--text-faint);
}
.eo-tab-type { color: var(--text-muted); font-size: 11.5px; }
.eo-tab-time { font-variant-numeric: tabular-nums; }

.eo-total-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 8px 12px;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  min-width: 110px;
}
.eo-total-label {
  font-size: 10.5px;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.eo-total-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* Layout */
.eo-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
.eo-layout.with-sidebar {
  grid-template-columns: minmax(0, 1fr) 340px;
  align-items: start;
}
.eo-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.eo-sidebar { min-width: 0; }

/* Timer */
.eo-timer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  transition: all 0.2s;
}
.eo-timer.prep { border-color: #3498db; background: #3498db0d; }
.eo-timer.running { border-color: #c0392b; background: #c0392b0d; }
.eo-timer.paused { border-color: #f39c12; background: #f39c120d; }
.eo-timer.warning {
  border-color: #e67e22;
  background: #e67e220d;
  animation: pulseSoft 1s ease-in-out infinite;
}
.eo-timer.over {
  border-color: #c0392b;
  background: #c0392b1a;
}
@keyframes pulseSoft {
  0%, 100% { box-shadow: 0 0 0 0 rgba(230, 126, 34, 0.0); }
  50% { box-shadow: 0 0 0 5px rgba(230, 126, 34, 0.3); }
}
.eo-timer-info {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.eo-timer-phase {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.eo-timer-value {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.eo-timer-total {
  font-size: 12px;
  color: var(--text-faint);
}
.eo-timer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.eo-timer-btn {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.eo-timer-btn:hover { border-color: #e67e22; color: #e67e22; }
.eo-timer-btn.primary {
  border-color: #e67e22;
  background: #e67e2214;
  color: #e67e22;
  font-weight: 600;
}
.eo-timer-btn.primary:hover { background: #e67e22; color: white; }
.eo-timer-btn.stop {
  border-color: #c0392b;
  background: #c0392b14;
  color: #c0392b;
  font-weight: 600;
}
.eo-timer-btn.stop:hover { background: #c0392b; color: white; }
.eo-timer-btn.ghost { background: transparent; }

/* Consigne */
.eo-prompt-card {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eo-prompt-head {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.eo-prompt-meta { display: flex; gap: 10px; align-items: center; }
.eo-prompt-type { font-weight: 700; color: #e67e22; font-size: 14px; }
.eo-prompt-budget {
  font-size: 11.5px;
  color: var(--text-faint);
  background: var(--surface-alt);
  padding: 2px 8px;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}
.eo-prompt-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
}
.eo-prompt-desc {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.55;
}
.eo-paste-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.eo-paste-area {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px dashed var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.eo-paste-area:focus { border-style: solid; border-color: #e67e22; }
.eo-prompt-text {
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.55;
  background: var(--surface-alt);
  padding: 10px 12px;
  border-radius: 10px;
}
.eo-prompt-text-head {
  font-weight: 600;
  margin-bottom: 4px;
  color: #e67e22;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Notes */
.eo-notes-card {
  border: 1.5px solid #3498db66;
  background: #3498db08;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.eo-notes-label {
  font-size: 12px;
  font-weight: 600;
  color: #2980b9;
}
.eo-notes-area {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.eo-notes-area:focus { border-color: #3498db; }

/* Recorder */
.eo-recorder-card {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eo-rec-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.eo-rec-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
.eo-rec-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.2s;
}
.eo-rec-dot.recording {
  background: #c0392b;
  box-shadow: 0 0 0 0 #c0392b;
  animation: dotPulse 1.2s ease-in-out infinite;
}
.eo-rec-dot.paused { background: #f39c12; }
.eo-rec-dot.done { background: #27ae60; }
@keyframes dotPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.6); }
  50%      { box-shadow: 0 0 0 6px rgba(192, 57, 43, 0); }
}
.eo-rec-meter {
  flex: 1;
  height: 8px;
  background: var(--surface-alt);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.eo-rec-meter-fill {
  height: 100%;
  background: linear-gradient(90deg, #27ae60, #e67e22, #c0392b);
  transition: width 0.08s linear;
}
.eo-rec-error {
  padding: 8px 10px;
  border-radius: 8px;
  background: #c0392b14;
  border: 1px solid #c0392b66;
  color: #c0392b;
  font-size: 12.5px;
}
.eo-rec-warn {
  padding: 8px 10px;
  border-radius: 8px;
  background: #3498db14;
  border: 1px solid #3498db66;
  color: #2980b9;
  font-size: 12.5px;
  line-height: 1.5;
}
.eo-audio {
  width: 100%;
  margin-top: 4px;
}

/* Transcription */
.eo-transcript-card {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eo-tr-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--title-color);
}
.eo-tr-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.5;
}
.eo-tr-area {
  width: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.eo-tr-area:focus { border-color: #e67e22; }
.eo-interim {
  font-size: 13px;
  color: var(--text-faint);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--surface-alt);
}
.eo-tr-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.eo-tr-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.15s;
}
.eo-tr-btn:hover:not(:disabled) { border-color: #e67e22; color: #e67e22; }
.eo-tr-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.eo-corrector {
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1.5px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eo-corrector-head h4 {
  font-size: 14px;
  font-weight: 700;
  color: var(--title-color);
  margin-bottom: 2px;
}
.eo-corrector-head p {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

@media (max-width: 900px) {
  .eo-task-tab { min-width: 130px; }
  .eo-timer-value { font-size: 24px; }
}
</style>
