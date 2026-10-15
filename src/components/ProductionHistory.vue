<template>
  <section class="history-card">
    <header class="history-head">
      <div>
        <h2>Historique des tentatives</h2>
        <p>Les tentatives soumises restent distinctes des brouillons.</p>
      </div>
      <span class="history-count">{{ attempts.length }} tentative{{ attempts.length === 1 ? '' : 's' }}</span>
    </header>

    <p v-if="!attempts.length" class="history-empty">Aucune tentative soumise pour le moment.</p>
    <ul v-else class="history-list">
      <li v-for="attempt in attempts" :key="attempt.id" class="history-item">
        <div class="history-main">
          <div class="history-title">
            <strong>Tâche {{ attempt.task }} · {{ attempt.promptTitle || 'Sujet personnel' }}</strong>
            <span class="mode-pill">{{ modeLabel(attempt.mode) }}</span>
          </div>
          <p>
            {{ formatDate(attempt.submittedAt) }} · {{ formatDuration(attempt.activeSeconds) }}
            <template v-if="attempt.wordCount != null"> · {{ attempt.wordCount }} mots</template>
          </p>
          <p v-if="attempt.assistanceUsed?.length" class="assistance">
            Assistance utilisée : {{ attempt.assistanceUsed.join(', ') }}
          </p>
          <div v-if="attempt.evaluation" class="evaluation-summary">
            <strong>Évaluation {{ fulfillmentLabel(attempt.evaluation.taskFulfillment?.status) }}</strong>
            <ul v-if="attempt.evaluation.priorities?.length"><li v-for="priority in attempt.evaluation.priorities" :key="priority">{{ priority }}</li></ul>
          </div>
          <details v-if="attempt.responseText || attempt.transcript">
            <summary>Voir la réponse</summary>
            <p class="response">{{ attempt.responseText || attempt.transcript }}</p>
          </details>
          <div v-if="attempt.audioRef" class="audio-row">
            <button v-if="!audioUrls[attempt.id]" class="audio-btn" @click="openAudio(attempt)">Charger l’audio</button>
            <audio v-else controls :src="audioUrls[attempt.id]" :aria-label="`Audio de ${attempt.promptTitle}`"></audio>
          </div>
        </div>
        <button class="delete-btn" :aria-label="`Supprimer la tentative ${attempt.promptTitle || ''}`" @click="$emit('delete', attempt)">
          Supprimer
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { onBeforeUnmount, reactive } from 'vue'
import { loadProductionAudio } from '../utils/productionStore.js'

defineProps({ attempts: { type: Array, default: () => [] } })
defineEmits(['delete'])
const audioUrls = reactive({})

async function openAudio(attempt) {
  const blob = await loadProductionAudio(attempt.audioRef).catch(() => null)
  if (blob) audioUrls[attempt.id] = URL.createObjectURL(blob)
}
onBeforeUnmount(() => Object.values(audioUrls).forEach(url => URL.revokeObjectURL(url)))

function modeLabel(mode) {
  return ({ learn: 'Apprendre', guided: 'Guidé', exam: 'Examen' })[mode] || mode
}
function fulfillmentLabel(status) { return ({ strong: 'solide', partial: 'partielle', weak: 'à reprendre' })[status] || 'enregistrée' }
function formatDate(value) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}
function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
</script>

<style scoped>
.history-card { padding: 16px; border: 1.5px solid var(--border); border-radius: 14px; background: var(--surface); }
.history-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: start; }
.history-head h2 { font-size: 16px; color: var(--title-color); }
.history-head p, .history-item p, .history-empty { margin-top: 4px; color: var(--text-muted); font-size: 12.5px; }
.history-count, .mode-pill { padding: 3px 8px; border-radius: 999px; background: var(--surface-alt); color: var(--text-secondary); font-size: 11px; font-weight: 700; }
.history-list { display: grid; gap: 8px; list-style: none; margin-top: 14px; }
.history-item { display: flex; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-alt); }
.history-main { min-width: 0; flex: 1; }
.history-title { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--text-primary); font-size: 13px; }
.assistance { color: #e67e22 !important; }
.evaluation-summary { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #27ae6010; color: var(--text-secondary); font-size: 12px; }
.evaluation-summary ul { margin: 4px 0 0 18px; }
details { margin-top: 8px; font-size: 12px; color: var(--text-secondary); }
summary { cursor: pointer; font-weight: 600; }
.response { white-space: pre-wrap; line-height: 1.55; }
.audio-row { margin-top: 8px; }
.audio-row audio { width: 100%; max-width: 520px; }
.audio-btn { min-height: 36px; padding: 6px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text-secondary); font-size: 12px; }
.delete-btn { align-self: start; padding: 6px 9px; border: 1px solid #c0392b66; border-radius: 8px; background: #c0392b12; color: #c0392b; font-size: 12px; }
@media (max-width: 520px) { .history-item { flex-direction: column; } .delete-btn { align-self: stretch; min-height: 44px; } }
</style>
