<template>
  <div class="corrector">
    <header class="header">
      <h2 class="title">📝 Correcteur grammatical</h2>
      <p class="subtitle">
        Saisis une phrase ou un court paragraphe en français. Claude
        identifiera chaque <span class="legend legend-error">erreur</span>
        et te proposera des
        <span class="legend legend-suggestion">recommandations B2+</span>
        pour enrichir ton style. Survole un passage pour voir l'explication,
        puis applique chaque correction d'un clic.
      </p>
    </header>

    <!-- Saisie -->
    <label class="input-label" for="grammar-input">Ton texte</label>
    <textarea
      id="grammar-input"
      class="input"
      v-model="inputText"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      autocomplete="off"
      placeholder="Ex. : Hier, je suis allé au marché et j'ai acheté des fruit pour faire une tarte."
      rows="4"
    ></textarea>

    <div class="actions">
      <button
        class="btn-primary"
        :disabled="loading || !inputText.trim()"
        @click="runCorrection"
      >
        {{ loading ? 'Analyse en cours…' : '✨ Analyser avec Claude' }}
      </button>
      <button
        class="btn-secondary"
        :disabled="loading || !inputText"
        @click="resetAll"
      >
        🗑 Effacer
      </button>
    </div>

    <!-- Erreur (réseau / parsing / token manquant) -->
    <div v-if="errorMessage" class="error-banner">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- Résultats -->
    <section v-if="result" class="results">
      <div class="results-head">
        <div>
          <h3 class="results-title">Analyse</h3>
          <p class="results-meta">
            <span v-if="remainingErrors.length === 0 && remainingSuggestions.length === 0" class="ok">
              ✅ Aucune correction ni suggestion en attente.
            </span>
            <span v-else>
              <span v-if="remainingErrors.length > 0">
                <strong class="count-err">{{ remainingErrors.length }}</strong>
                erreur{{ remainingErrors.length > 1 ? 's' : '' }}
              </span>
              <span v-if="remainingErrors.length > 0 && remainingSuggestions.length > 0">
                ·
              </span>
              <span v-if="remainingSuggestions.length > 0">
                <strong class="count-sug">{{ remainingSuggestions.length }}</strong>
                suggestion{{ remainingSuggestions.length > 1 ? 's' : '' }} B2+
              </span>
              — survole un passage pour voir l'explication.
            </span>
          </p>
        </div>
        <div class="results-buttons">
          <button
            class="btn-fix-all"
            :disabled="remainingErrors.length === 0"
            @click="fixAllErrors"
          >
            ⚡ Tout corriger
          </button>
          <button
            class="btn-apply-all-suggestions"
            :disabled="remainingAnchoredSuggestions.length === 0"
            @click="applyAllSuggestions"
          >
            💡 Appliquer les suggestions
          </button>
          <button class="btn-secondary" @click="copyCurrentText">
            📋 Copier
          </button>
        </div>
      </div>

      <!-- Phrase reconstruite avec les fragments mis en évidence -->
      <div class="render" aria-live="polite">
        <template v-for="(seg, i) in segments" :key="i">
          <span
            v-if="seg.kind === 'text'"
            class="seg-plain"
            >{{ seg.text }}</span
          >
          <span
            v-else-if="seg.kind === 'error'"
            class="seg-error"
            tabindex="0"
            @click="applyErrorFix(seg.refIdx)"
            @keydown.enter="applyErrorFix(seg.refIdx)"
          >
            <span class="seg-content">{{ seg.text }}</span>
            <span class="tooltip" role="tooltip">
              <span class="tt-tag tt-tag-error">erreur · {{ seg.ref.type }}</span>
              <span class="tt-arrow">{{ seg.ref.original }} → {{ seg.ref.corrected }}</span>
              <span class="tt-explain">{{ seg.ref.explanation }}</span>
              <span class="tt-cta">Cliquer pour corriger</span>
            </span>
          </span>
          <span
            v-else-if="seg.kind === 'suggestion'"
            class="seg-suggestion"
            tabindex="0"
            @click="applySuggestion(seg.refIdx)"
            @keydown.enter="applySuggestion(seg.refIdx)"
          >
            <span class="seg-content">{{ seg.text }}</span>
            <span class="tooltip" role="tooltip">
              <span class="tt-tag tt-tag-suggestion">suggestion · {{ seg.ref.category }}</span>
              <span v-if="seg.ref.suggested" class="tt-arrow">
                {{ seg.ref.original }} → {{ seg.ref.suggested }}
              </span>
              <span class="tt-explain">{{ seg.ref.explanation }}</span>
              <span v-if="seg.ref.suggested" class="tt-cta">
                Cliquer pour appliquer
              </span>
            </span>
          </span>
        </template>
      </div>

      <!-- Liste détaillée des erreurs avec bouton « Corriger » -->
      <div v-if="result.errors.length > 0" class="block block-errors">
        <h4 class="block-title">
          <span class="dot dot-err"></span>
          Erreurs ({{ result.errors.length }})
        </h4>
        <ul class="error-list">
          <li
            v-for="(err, idx) in result.errors"
            :key="idx"
            class="item item-error"
            :class="{ done: errorFixed[idx] }"
          >
            <div class="item-row">
              <span class="item-tag tag-error">{{ err.type }}</span>
              <span class="item-pair">
                <span class="frag frag-old">{{ err.original }}</span>
                <span class="frag-arrow">→</span>
                <span class="frag frag-new-error">{{ err.corrected }}</span>
              </span>
              <button
                class="btn-fix"
                :disabled="errorFixed[idx]"
                @click="applyErrorFix(idx)"
              >
                {{ errorFixed[idx] ? '✓ Corrigé' : 'Corriger' }}
              </button>
            </div>
            <p class="item-explanation">{{ err.explanation }}</p>
          </li>
        </ul>
      </div>

      <!-- Liste détaillée des suggestions -->
      <div v-if="result.suggestions.length > 0" class="block block-suggestions">
        <h4 class="block-title">
          <span class="dot dot-sug"></span>
          Suggestions B2+ ({{ result.suggestions.length }})
        </h4>
        <ul class="error-list">
          <li
            v-for="(sug, idx) in result.suggestions"
            :key="idx"
            class="item item-suggestion"
            :class="{ done: suggestionApplied[idx], global: !sug.original }"
          >
            <div class="item-row">
              <span class="item-tag tag-suggestion">{{ sug.category }}</span>
              <span class="item-pair">
                <span v-if="sug.original" class="frag frag-old-sug">
                  {{ sug.original }}
                </span>
                <span v-if="sug.original && sug.suggested" class="frag-arrow">→</span>
                <span v-if="sug.suggested" class="frag frag-new-sug">
                  {{ sug.suggested }}
                </span>
                <span v-if="!sug.original" class="frag-global">
                  💡 conseil général
                </span>
              </span>
              <button
                v-if="sug.original && sug.suggested"
                class="btn-apply"
                :disabled="suggestionApplied[idx]"
                @click="applySuggestion(idx)"
              >
                {{ suggestionApplied[idx] ? '✓ Appliqué' : 'Appliquer' }}
              </button>
            </div>
            <p class="item-explanation">{{ sug.explanation }}</p>
          </li>
        </ul>
      </div>

      <!-- Phrase entièrement corrigée pour référence -->
      <details class="full-correction">
        <summary>Voir la version entièrement corrigée par Claude</summary>
        <p>{{ result.fullyCorrected }}</p>
        <small>
          Note : cette version applique les <strong>erreurs</strong> mais pas
          les suggestions stylistiques.
        </small>
      </details>
    </section>

    <!-- Aide / configuration token -->
    <details class="help">
      <summary>Comment configurer le token Claude ?</summary>
      <div class="help-body">
        <p>
          Cette page utilise l'API Claude. Définis l'une de ces variables
          d'environnement avant de lancer <code>npm run dev</code> :
        </p>
        <pre><code>CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...   # OAuth Claude Code (priorité)
ANTHROPIC_API_KEY=sk-ant-api03-...        # ou clé API standard</code></pre>
        <p>
          Astuce : <code>cp .env.example .env</code> puis remplis‑le. Le
          token est lu côté serveur uniquement (par le middleware Vite) et
          n'est jamais envoyé au navigateur.
        </p>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { applyFrenchElision } from '../utils/frenchElide.js'

const inputText = ref('')
const loading = ref(false)
const errorMessage = ref('')

// Résultat brut renvoyé par /api/correct
const result = ref(null)
// Texte « courant » qui évolue à chaque correction/suggestion appliquée
const currentText = ref('')
// Drapeaux par item
const errorFixed = ref([])
const suggestionApplied = ref([])

const remainingErrors = computed(() =>
  result.value
    ? result.value.errors.filter((_, i) => !errorFixed.value[i])
    : []
)
const remainingSuggestions = computed(() =>
  result.value
    ? result.value.suggestions.filter((_, i) => !suggestionApplied.value[i])
    : []
)
// Suggestions qu'on peut effectivement appliquer (qui ont un span +
// une reformulation).
const remainingAnchoredSuggestions = computed(() =>
  result.value
    ? result.value.suggestions
        .map((s, i) => ({ s, i }))
        .filter(
          ({ s, i }) =>
            !suggestionApplied.value[i] && s.original && s.suggested
        )
    : []
)

// Découpe le texte courant en segments mêlant erreurs (rouge) et
// suggestions (jaune). Erreurs prioritaires en cas de chevauchement.
const segments = computed(() => {
  if (!result.value) return []
  const text = currentText.value

  const spans = []

  // 1) Erreurs non encore corrigées.
  let cursorErr = 0
  result.value.errors.forEach((e, i) => {
    if (errorFixed.value[i]) return
    const idx = text.indexOf(e.original, cursorErr)
    if (idx < 0) return
    spans.push({
      start: idx,
      end: idx + e.original.length,
      kind: 'error',
      refIdx: i,
      ref: e,
      priority: 0,
    })
    cursorErr = idx + e.original.length
  })

  // 2) Suggestions non encore appliquées (et qui ont un span).
  let cursorSug = 0
  result.value.suggestions.forEach((s, i) => {
    if (suggestionApplied.value[i]) return
    if (!s.original) return
    const idx = text.indexOf(s.original, cursorSug)
    if (idx < 0) return
    spans.push({
      start: idx,
      end: idx + s.original.length,
      kind: 'suggestion',
      refIdx: i,
      ref: s,
      priority: 1,
    })
    cursorSug = idx + s.original.length
  })

  // Trier par position; en cas de chevauchement, garder la priorité la
  // plus basse (erreur > suggestion) et celle qui commence la première.
  spans.sort((a, b) =>
    a.start === b.start ? a.priority - b.priority : a.start - b.start
  )
  const kept = []
  let lastEnd = -1
  for (const sp of spans) {
    if (sp.start < lastEnd) continue // chevauchement → on saute
    kept.push(sp)
    lastEnd = sp.end
  }

  const out = []
  let pos = 0
  for (const sp of kept) {
    if (sp.start > pos) {
      out.push({ kind: 'text', text: text.slice(pos, sp.start) })
    }
    out.push({
      kind: sp.kind,
      text: text.slice(sp.start, sp.end),
      refIdx: sp.refIdx,
      ref: sp.ref,
    })
    pos = sp.end
  }
  if (pos < text.length) {
    out.push({ kind: 'text', text: text.slice(pos) })
  }
  return out
})

async function runCorrection() {
  errorMessage.value = ''
  result.value = null
  loading.value = true
  try {
    const res = await fetch('/api/correct', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: inputText.value }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(payload?.error || `Échec HTTP ${res.status}`)
    }
    result.value = payload
    currentText.value = payload.original
    errorFixed.value = payload.errors.map(() => false)
    suggestionApplied.value = payload.suggestions.map(() => false)
  } catch (err) {
    errorMessage.value = err?.message || 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}

// Replaces `from` with `to` at its first occurrence in `text`, then
// applies the French elision safety-net so that joins like "de accès"
// automatically become "d'accès". Returns the cleaned text.
function spliceAndNormalise(text, from, to) {
  const at = text.indexOf(from)
  if (at < 0) return text
  const out = text.slice(0, at) + to + text.slice(at + from.length)
  return applyFrenchElision(out)
}

function applyErrorFix(idx) {
  if (!result.value) return
  if (errorFixed.value[idx]) return
  const e = result.value.errors[idx]
  currentText.value = spliceAndNormalise(
    currentText.value,
    e.original,
    e.corrected
  )
  errorFixed.value[idx] = true
}

function applySuggestion(idx) {
  if (!result.value) return
  if (suggestionApplied.value[idx]) return
  const s = result.value.suggestions[idx]
  if (!s.original || !s.suggested) {
    suggestionApplied.value[idx] = true
    return
  }
  currentText.value = spliceAndNormalise(
    currentText.value,
    s.original,
    s.suggested
  )
  suggestionApplied.value[idx] = true
}

function fixAllErrors() {
  if (!result.value) return
  for (let i = 0; i < result.value.errors.length; i++) {
    if (!errorFixed.value[i]) applyErrorFix(i)
  }
}

function applyAllSuggestions() {
  if (!result.value) return
  for (let i = 0; i < result.value.suggestions.length; i++) {
    if (suggestionApplied.value[i]) continue
    const s = result.value.suggestions[i]
    if (!s.original || !s.suggested) continue
    applySuggestion(i)
  }
}

function resetAll() {
  inputText.value = ''
  result.value = null
  currentText.value = ''
  errorFixed.value = []
  suggestionApplied.value = []
  errorMessage.value = ''
}

async function copyCurrentText() {
  try {
    await navigator.clipboard.writeText(currentText.value)
  } catch {
    /* ignore */
  }
}
</script>

<style scoped>
.corrector {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header { text-align: center; padding: 4px 8px 0; }
.title {
  font-size: 22px;
  font-weight: 700;
  color: var(--title-color);
  margin-bottom: 6px;
}
.subtitle {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
  max-width: 620px;
  margin: 0 auto;
}
.legend {
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 5px;
}
.legend-error { background: #c0392b18; color: #c0392b; }
.legend-suggestion { background: #f1c40f33; color: #b7950b; }

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}
.input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 0 3px #8e44ad22;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.btn-primary {
  padding: 10px 16px;
  border-radius: 10px;
  border: 1.5px solid #8e44ad;
  background: #8e44ad;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.18s;
}
.btn-primary:hover:not(:disabled) {
  background: #7d3c98;
  border-color: #7d3c98;
  transform: translateY(-1px);
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-secondary {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.18s;
}
.btn-secondary:hover:not(:disabled) {
  border-color: #8e44ad;
  color: #8e44ad;
}
.btn-secondary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.error-banner {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #c0392b;
  background: #c0392b12;
  color: #c0392b;
  font-size: 13px;
  white-space: pre-wrap;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  box-shadow: 0 1px 3px var(--shadow-sm);
}
.results-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.results-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.results-meta {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 520px;
}
.results-meta .ok {
  color: #27ae60;
  font-weight: 600;
}
.count-err { color: #c0392b; }
.count-sug { color: #b7950b; }

.results-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-fix-all {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #c0392b;
  background: #c0392b;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.18s;
}
.btn-fix-all:hover:not(:disabled) {
  background: #a83226;
  border-color: #a83226;
}
.btn-fix-all:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-apply-all-suggestions {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #b7950b;
  background: #f1c40f;
  color: #5a4302;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.18s;
}
.btn-apply-all-suggestions:hover:not(:disabled) {
  background: #d4ac0d;
  border-color: #b7950b;
}
.btn-apply-all-suggestions:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Phrase reconstruite avec mise en évidence */
.render {
  font-size: 16px;
  line-height: 1.95;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-alt);
  white-space: pre-wrap;
  word-break: break-word;
}
.seg-plain { color: var(--text-primary); }
.seg-error,
.seg-suggestion {
  position: relative;
  display: inline;
  cursor: pointer;
  border-radius: 4px;
  padding: 1px 3px;
  margin: 0 1px;
  font-weight: 600;
  transition: background 0.15s;
  outline: none;
}
.seg-error {
  background: #c0392b18;
  border-bottom: 2px solid #c0392b;
  color: #c0392b;
}
.seg-error:hover,
.seg-error:focus-visible {
  background: #c0392b30;
}
.seg-suggestion {
  background: #f1c40f33;
  border-bottom: 2px dashed #b7950b;
  color: #8a6d09;
}
.seg-suggestion:hover,
.seg-suggestion:focus-visible {
  background: #f1c40f55;
}

.tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 240px;
  max-width: 340px;
  padding: 10px 12px;
  background: var(--text-primary);
  color: var(--surface);
  font-weight: 400;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
  display: none;
  z-index: 50;
  text-align: left;
  white-space: normal;
}
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--text-primary);
}
.seg-error:hover .tooltip,
.seg-error:focus-visible .tooltip,
.seg-suggestion:hover .tooltip,
.seg-suggestion:focus-visible .tooltip {
  display: block;
}
.tt-tag {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 6px;
  margin-bottom: 6px;
  font-weight: 700;
}
.tt-tag-error { background: #c0392b66; color: #fff; }
.tt-tag-suggestion { background: #f1c40fcc; color: #4a3700; }
.tt-arrow {
  display: block;
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--surface);
}
.tt-explain {
  display: block;
  margin-bottom: 6px;
  color: var(--surface);
}
.tt-cta {
  display: block;
  font-size: 11px;
  opacity: 0.7;
  font-style: italic;
}

/* Listes détaillées */
.block { display: flex; flex-direction: column; gap: 8px; }
.block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}
.dot-err { background: #c0392b; }
.dot-sug { background: #f1c40f; border: 1px solid #b7950b; }

.error-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item {
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--surface-alt);
  transition: opacity 0.2s;
}
.item-error { border-left: 4px solid #c0392b; }
.item-suggestion { border-left: 4px solid #f1c40f; }
.item.global { border-left-style: dashed; }
.item.done {
  opacity: 0.55;
  background: #27ae6010;
  border-color: #27ae60;
  border-left-color: #27ae60;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.item-tag {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}
.tag-error { background: #c0392b18; color: #c0392b; }
.tag-suggestion { background: #f1c40f33; color: #8a6d09; }
.item-pair {
  flex: 1;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 14px;
}
.frag {
  padding: 1px 6px;
  border-radius: 5px;
  font-weight: 600;
}
.frag-old {
  background: #c0392b18;
  color: #c0392b;
  text-decoration: line-through;
}
.frag-new-error {
  background: #27ae6018;
  color: #1f8c4d;
}
.frag-old-sug {
  background: #f1c40f33;
  color: #8a6d09;
  text-decoration: line-through;
}
.frag-new-sug {
  background: #2980b918;
  color: #1f6391;
}
.frag-arrow { color: var(--text-faint); }
.frag-global {
  font-style: italic;
  color: var(--text-muted);
  font-size: 13px;
}
.btn-fix {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid #c0392b;
  background: var(--surface);
  color: #c0392b;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s;
}
.btn-fix:hover:not(:disabled) {
  background: #c0392b;
  color: #fff;
}
.btn-fix:disabled {
  border-color: #27ae60;
  color: #27ae60;
  background: transparent;
  cursor: default;
}
.btn-apply {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1.5px solid #b7950b;
  background: var(--surface);
  color: #8a6d09;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s;
}
.btn-apply:hover:not(:disabled) {
  background: #f1c40f;
  color: #4a3700;
}
.btn-apply:disabled {
  border-color: #27ae60;
  color: #27ae60;
  background: transparent;
  cursor: default;
}
.item-explanation {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.55;
}

.full-correction {
  font-size: 13px;
  color: var(--text-muted);
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}
.full-correction summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--text-secondary);
}
.full-correction p {
  margin-top: 8px;
  padding: 10px 12px;
  background: var(--surface-alt);
  border-radius: 10px;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
}
.full-correction small {
  display: block;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--text-faint);
}

.help {
  font-size: 12px;
  color: var(--text-muted);
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 8px 12px;
}
.help summary {
  cursor: pointer;
  font-weight: 600;
}
.help-body { margin-top: 8px; }
.help pre {
  margin: 6px 0;
  padding: 8px 10px;
  background: var(--surface-alt);
  border-radius: 8px;
  font-size: 11.5px;
  overflow-x: auto;
}
.help code { font-family: ui-monospace, Menlo, Consolas, monospace; }
</style>
