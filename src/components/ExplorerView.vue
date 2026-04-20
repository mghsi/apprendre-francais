<template>
  <div class="explorer">
    <div class="search-row">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          ref="searchInput"
          type="text"
          :placeholder="`Chercher parmi ${totalVerbs} verbes…`"
          v-model="query"
          class="search-input"
          @input="onSearch"
        />
        <button v-if="query" class="search-clear" @click="clearSearch">✕</button>
      </div>
    </div>

    <div v-if="!selectedVerb">
      <div v-if="!query" class="browse-section">
        <p class="browse-hint">Tapez le début d'un verbe ou parcourez par lettre :</p>
        <div class="alpha-bar">
          <button
            v-for="l in alphabet"
            :key="l"
            class="alpha-btn"
            :class="{ active: activeLetter === l }"
            @click="browseLetter(l)"
          >{{ l.toUpperCase() }}</button>
        </div>
      </div>

      <div v-if="groupeFilter" class="active-filter">
        <span>{{ groupeFilter }}</span>
        <button class="filter-clear" @click="groupeFilter = ''">✕</button>
      </div>

      <div v-if="results.length > 0" class="results-list">
        <div class="results-header">
          <span class="results-count">{{ results.length }} résultat{{ results.length > 1 ? 's' : '' }}</span>
          <div class="groupe-filters">
            <button
              v-for="g in groupes"
              :key="g"
              class="groupe-btn"
              :class="{ active: groupeFilter === g }"
              @click="groupeFilter = groupeFilter === g ? '' : g"
            >{{ g }}</button>
          </div>
        </div>
        <button
          v-for="r in filteredResults"
          :key="r.verb"
          class="result-item"
          @click="selectVerb(r)"
        >
          <span class="result-verb">{{ r.verb }}</span>
          <span class="result-groupe">{{ r.groupe || '' }}</span>
          <span class="result-arrow">›</span>
        </button>
        <p v-if="filteredResults.length === 0" class="no-filter-results">
          Aucun verbe de ce groupe trouvé.
        </p>
      </div>

      <div v-else-if="query && !loading" class="no-results">
        <p>Aucun verbe trouvé pour « {{ query }} »</p>
      </div>

      <div v-if="loading" class="loading">
        <span class="spinner"></span> Chargement…
      </div>
    </div>

    <div v-if="selectedVerb" class="detail-view">
      <button class="back-btn" @click="goBack">← Retour</button>

      <div class="verb-hero">
        <h2 class="verb-name">{{ selectedVerb.verb }}</h2>
        <div class="verb-meta">
          <span class="verb-groupe">{{ verbData?.groupe }}</span>
          <span class="verb-badge catalogue">Catalogue</span>
          <span v-if="isDefective" class="verb-badge defective">Défectif</span>
        </div>
      </div>

      <div v-if="verbData" class="detail-content">
        <div class="temps-chips">
          <button
            v-for="t in availableTenses"
            :key="t"
            class="temps-chip"
            :class="{ selected: detailTemps === t }"
            @click="detailTemps = t"
          >{{ tempsLabelsAll[t] }}</button>
        </div>

        <h3 class="table-heading">
          {{ tempsLabelsAll[detailTemps] }} de <em>{{ selectedVerb.verb }}</em>
        </h3>

        <p v-if="isDefective" class="defective-note">
          ⚠️ Verbe défectif : certaines personnes sont rarement ou jamais utilisées.
        </p>

        <div class="table-wrapper">
          <table class="conj-table">
            <thead>
              <tr>
                <th>Sujet</th>
                <th>Conjugaison</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(s, i) in displayedSujets"
                :key="i"
                :class="{ 'row-even': s.index % 2 === 0 }"
              >
                <td class="sujet-cell">{{ s.label }}</td>
                <td class="conj-cell">
                  <template v-if="quizMode && s.form !== null">
                    <div class="quiz-input-row">
                      <input
                        type="text"
                        :value="quizAnswers[s.index] || ''"
                        @input="quizAnswers[s.index] = $event.target.value"
                        :disabled="showResults"
                        class="quiz-input"
                        :class="showResults ? (isAnswerCorrect(s.index) ? 'input-correct' : 'input-wrong') : ''"
                        placeholder="?"
                      />
                      <span
                        v-if="showResults && !isAnswerCorrect(s.index)"
                        class="correct-answer"
                      >{{ s.form }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <span class="conj-value" :class="{ na: s.form === null }">
                      {{ s.form ?? '—' }}
                    </span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!quizMode" class="quiz-actions">
          <button class="start-quiz-btn" @click="startQuiz">🎯 Quiz sur ce verbe</button>
        </div>

        <div v-if="quizMode && !showResults" class="quiz-actions">
          <button class="check-btn" @click="showResults = true">✓ Vérifier mes réponses</button>
          <button class="cancel-quiz-btn" @click="quizMode = false">Annuler</button>
        </div>

        <div v-if="quizMode && showResults" class="quiz-results">
          <div class="score-badge">
            <span class="score-number">{{ score }}</span>
            <span class="score-total">/ {{ totalQuestions }}</span>
          </div>
          <p class="score-label">
            {{ score === totalQuestions ? '🎉 Parfait !' : score >= totalQuestions / 2 ? '👏 Bien joué !' : '💪 Continue !' }}
          </p>
          <button class="retry-btn" @click="startQuiz">Recommencer</button>
          <button class="cancel-quiz-btn" @click="quizMode = false">Quitter le quiz</button>
        </div>
      </div>

      <div v-else class="loading">
        <span class="spinner"></span> Chargement…
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useExtendedVerbs } from '../composables/useExtendedVerbs.js'
import { sujets } from '../data/verbs.js'

const tempsLabelsAll = {
  présent: 'Présent',
  futur_proche: 'Futur proche',
  imparfait: 'Imparfait',
  futur: 'Futur simple',
  conditionnel: 'Conditionnel présent',
  subjonctif: 'Subjonctif présent',
  impératif: 'Impératif',
}

const allTenseKeys = Object.keys(tempsLabelsAll)
const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
const groupes = ['1er groupe (-er)', '2e groupe (-ir)', '3e groupe']

const { indexLoaded, indexLoading, loadIndex, getVerb, searchVerbs } = useExtendedVerbs()

const searchInput = ref(null)
const query = ref('')
const activeLetter = ref('')
const groupeFilter = ref('')
const results = ref([])
const loading = ref(false)
const selectedVerb = ref(null)
const verbData = ref(null)
const detailTemps = ref('présent')
const quizMode = ref(false)
const quizAnswers = ref({})
const showResults = ref(false)
const totalVerbs = ref(7772)

onMounted(async () => {
  await loadIndex()
})

watch(indexLoaded, (val) => {
  if (val) {
    const { index } = useExtendedVerbs()
    totalVerbs.value = index.value.length
  }
})

function onSearch() {
  activeLetter.value = ''
  groupeFilter.value = ''
  if (!query.value) {
    results.value = []
    return
  }
  const matches = searchVerbs(query.value, 50)
  // We need groupe info from chunks for filtering — load lazily
  results.value = matches
  loadGroupeInfo(matches)
}

async function loadGroupeInfo(matches) {
  const chunksNeeded = [...new Set(matches.map(m => m.chunk))]
  loading.value = true
  try {
    for (const chunk of chunksNeeded) {
      const data = await (await fetch(`/generated/lefff-chunks/${chunk}.json`)).json()
      for (const m of matches) {
        if (m.chunk === chunk && data[m.verb]) {
          m.groupe = data[m.verb].groupe
        }
      }
    }
    results.value = [...matches]
  } finally {
    loading.value = false
  }
}

async function browseLetter(letter) {
  activeLetter.value = letter
  query.value = ''
  groupeFilter.value = ''
  loading.value = true
  try {
    const chunk = await (await fetch(`/generated/lefff-chunks/${letter}.json`)).json()
    results.value = Object.keys(chunk)
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map(verb => ({ verb, chunk: letter, groupe: chunk[verb].groupe }))
  } finally {
    loading.value = false
  }
}

const filteredResults = computed(() => {
  if (!groupeFilter.value) return results.value
  return results.value.filter(r => r.groupe === groupeFilter.value)
})

async function selectVerb(r) {
  selectedVerb.value = r
  verbData.value = null
  detailTemps.value = 'présent'
  quizMode.value = false
  const data = await getVerb(r.verb, r.chunk)
  verbData.value = data
}

function goBack() {
  selectedVerb.value = null
  verbData.value = null
  quizMode.value = false
  showResults.value = false
}

function clearSearch() {
  query.value = ''
  results.value = []
  activeLetter.value = ''
  groupeFilter.value = ''
  nextTick(() => searchInput.value?.focus())
}

const availableTenses = computed(() => {
  if (!verbData.value) return []
  return allTenseKeys.filter(t => verbData.value[t])
})

const isDefective = computed(() => {
  if (!verbData.value) return false
  const present = verbData.value['présent']
  return present && present.some(v => v === null)
})

const displayedSujets = computed(() => {
  if (!verbData.value || !detailTemps.value) return []
  const forms = verbData.value[detailTemps.value]
  if (!forms) return []

  // For impératif, only show tu/nous/vous
  if (detailTemps.value === 'impératif') {
    return [
      { label: sujets[1], form: forms[1], index: 1 },
      { label: sujets[3], form: forms[3], index: 3 },
      { label: sujets[4], form: forms[4], index: 4 },
    ].filter(s => s.form !== null)
  }

  return sujets.map((label, i) => ({ label, form: forms[i], index: i }))
})

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

function isAnswerCorrect(i) {
  const forms = verbData.value?.[detailTemps.value]
  if (!forms) return false
  return normalize(quizAnswers.value[i]) === normalize(forms[i])
}

function startQuiz() {
  quizMode.value = true
  quizAnswers.value = {}
  showResults.value = false
}

const totalQuestions = computed(() =>
  displayedSujets.value.filter(s => s.form !== null).length
)

const score = computed(() =>
  displayedSujets.value.filter(s => s.form !== null && isAnswerCorrect(s.index)).length
)
</script>

<style scoped>
.explorer {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.search-row {
  margin-bottom: 16px;
}

.search-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 12px 36px 12px 36px;
  border-radius: 14px;
  border: 1.5px solid var(--border);
  font-size: 15px;
  outline: none;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  border-color: #27ae60;
  box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.1);
}

.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-faint);
  font-size: 16px;
  padding: 4px 6px;
}

.browse-section {
  margin-bottom: 20px;
}

.browse-hint {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.alpha-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.alpha-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.alpha-btn:hover {
  border-color: #27ae60;
  color: #27ae60;
}

.alpha-btn.active {
  border-color: #27ae60;
  background: #27ae6015;
  color: #27ae60;
}

.active-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: #27ae6015;
  color: #27ae60;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}

.filter-clear {
  background: none;
  border: none;
  color: #27ae60;
  font-size: 14px;
  padding: 0 2px;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 8px;
}

.results-count {
  font-size: 13px;
  color: var(--text-faint);
  font-weight: 500;
}

.groupe-filters {
  display: flex;
  gap: 4px;
}

.groupe-btn {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  transition: all 0.15s;
}

.groupe-btn:hover, .groupe-btn.active {
  border-color: #27ae60;
  color: #27ae60;
  background: #27ae6010;
}

.results-list {
  margin-bottom: 20px;
}

.result-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid var(--border-table);
  background: var(--surface);
  text-align: left;
  transition: background 0.15s;
}

.result-item:first-of-type {
  border-radius: 12px 12px 0 0;
}

.result-item:last-of-type {
  border-radius: 0 0 12px 12px;
  border-bottom: none;
}

.result-item:only-of-type {
  border-radius: 12px;
}

.result-item:hover {
  background: var(--surface-hover);
}

.result-verb {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  flex: 1;
}

.result-groupe {
  font-size: 12px;
  color: var(--text-faint);
}

.result-arrow {
  font-size: 18px;
  color: var(--text-faintest);
  font-weight: 300;
}

.no-results, .no-filter-results {
  text-align: center;
  color: var(--text-faint);
  font-size: 14px;
  padding: 24px 0;
}

.loading {
  text-align: center;
  color: var(--text-faint);
  font-size: 14px;
  padding: 20px 0;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: #27ae60;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Detail view */
.back-btn {
  background: none;
  border: none;
  color: #27ae60;
  font-weight: 600;
  font-size: 14px;
  padding: 0;
  margin-bottom: 14px;
  transition: opacity 0.15s;
}

.back-btn:hover {
  opacity: 0.7;
}

.verb-hero {
  background: linear-gradient(135deg, var(--hero-gradient-1) 0%, var(--hero-gradient-2) 100%);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 18px;
  box-shadow: 0 2px 8px var(--shadow-sm);
}

.verb-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--verb-name-color);
  margin-bottom: 4px;
}

.verb-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.verb-groupe {
  font-size: 13px;
  color: var(--text-faint);
  font-style: italic;
}

.verb-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.verb-badge.catalogue {
  background: #27ae6018;
  color: #27ae60;
}

.verb-badge.defective {
  background: #e67e2218;
  color: #e67e22;
}

.defective-note {
  font-size: 13px;
  color: #e67e22;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #e67e2208;
  border-radius: 8px;
}

.temps-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.temps-chip {
  padding: 7px 16px;
  border-radius: 22px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  font-weight: 400;
  font-size: 13px;
  color: var(--text-muted);
  transition: all 0.15s;
}

.temps-chip:hover {
  border-color: #8e44ad;
  color: #8e44ad;
  background: var(--chip-temps-hover-bg);
}

.temps-chip.selected {
  border-color: #8e44ad;
  background: var(--chip-temps-selected-bg);
  color: #8e44ad;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(142, 68, 173, 0.15);
}

.table-heading {
  font-size: 16px;
  font-weight: 600;
  color: #8e44ad;
  margin-bottom: 12px;
}

.table-heading em {
  font-style: italic;
}

.table-wrapper {
  background: var(--surface);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 6px var(--shadow-md);
}

.conj-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.conj-table thead tr {
  border-bottom: 2px solid #8e44ad;
}

.conj-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: #8e44ad;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conj-table th:first-child {
  width: 40%;
}

.conj-table tbody tr {
  border-bottom: 1px solid var(--border-table);
  transition: background 0.2s;
}

.conj-table tbody tr:last-child {
  border-bottom: none;
}

.row-even {
  background: var(--row-even-bg);
}

.sujet-cell {
  padding: 12px 16px;
  font-weight: 500;
  color: var(--text-secondary);
}

.conj-cell {
  padding: 12px 16px;
}

.conj-value {
  font-weight: 600;
  color: var(--conj-value-color);
}

.conj-value.na {
  color: var(--conj-na-color);
}

.quiz-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quiz-input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1.5px solid var(--border-light);
  font-size: 15px;
  width: 100%;
  max-width: 220px;
  outline: none;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.quiz-input:focus {
  border-color: #8e44ad;
  box-shadow: 0 0 0 3px rgba(142, 68, 173, 0.1);
}

.quiz-input:disabled {
  background: var(--input-disabled-bg);
}

.input-correct {
  border-color: #27ae60 !important;
}

.input-wrong {
  border-color: #e74c3c !important;
}

.correct-answer {
  color: #27ae60;
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
}

.quiz-actions {
  text-align: center;
  margin-top: 18px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.start-quiz-btn {
  padding: 10px 24px;
  border-radius: 12px;
  border: 1.5px solid #27ae60;
  background: transparent;
  color: #27ae60;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.start-quiz-btn:hover {
  background: #27ae60;
  color: #fff;
}

.check-btn {
  padding: 12px 32px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.25);
  transition: transform 0.15s, box-shadow 0.15s;
}

.check-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(39, 174, 96, 0.3);
}

.cancel-quiz-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 500;
  font-size: 14px;
}

.quiz-results {
  text-align: center;
  margin-top: 20px;
  padding: 20px;
  background: var(--quiz-results-bg);
  border-radius: 16px;
  box-shadow: 0 2px 8px var(--shadow-md);
}

.score-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}

.score-number {
  font-size: 36px;
  font-weight: 700;
  color: #27ae60;
}

.score-total {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-faint);
}

.score-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--score-label-color);
  margin: 8px 0 16px;
}

.retry-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  background: #27ae60;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s;
  margin-right: 8px;
}

.retry-btn:hover {
  background: #219a52;
}
</style>
