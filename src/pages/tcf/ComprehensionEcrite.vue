<template>
  <div class="ce-page">
    <!-- Barre d'état (mode + minuteur + total) -->
    <header class="ce-topbar">
      <div class="ce-mode-tabs" role="tablist" aria-label="Mode">
        <button
          class="ce-mode-tab"
          :class="{ active: mode === 'edit' }"
          @click="switchMode('edit')"
        >
          🛠 Banque QCM
          <span class="ce-mode-count">{{ questions.length }}</span>
        </button>
        <button
          class="ce-mode-tab"
          :class="{ active: mode === 'exam' || mode === 'results' }"
          @click="switchMode('exam')"
          :disabled="questions.length === 0"
          :title="questions.length === 0 ? 'Ajoutez au moins une question' : ''"
        >
          🎯 Examen blanc
        </button>
        <button
          class="ce-mode-tab"
          :class="{ active: mode === 'fine' }"
          @click="switchMode('fine')"
        >
          🔍 Compréhension fine
          <span class="ce-mode-count">{{ fineItems.length }}</span>
        </button>
      </div>

      <div
        class="ce-timer"
        :class="{
          running: timer.running,
          warning: timer.elapsed >= warningSeconds && timer.elapsed < budgetSeconds,
          over: timer.elapsed >= budgetSeconds
        }"
      >
        <span class="ce-timer-icon">⏱</span>
        <span class="ce-timer-value">{{ formatTime(timer.elapsed) }}</span>
        <span class="ce-timer-budget">/ {{ formatTime(budgetSeconds) }}</span>
        <div v-if="mode === 'exam'" class="ce-timer-actions">
          <button
            class="ce-timer-btn primary"
            :class="{ paused: !timer.running }"
            @click="toggleTimer"
            :title="timer.running ? 'Mettre en pause' : 'Reprendre'"
          >
            <span class="ce-timer-btn-icon">{{ timer.running ? '⏸' : '▶' }}</span>
            <span class="ce-timer-btn-label">{{ timer.running ? 'Pause' : 'Reprendre' }}</span>
          </button>
          <button
            class="ce-timer-btn"
            @click="resetTimer"
            title="Réinitialiser le minuteur"
          >↺</button>
        </div>
      </div>

      <!-- Bandeau de pause (occupe la largeur quand l'examen est en pause) -->
      <div v-if="mode === 'exam' && !timer.running" class="ce-paused-banner">
        ⏸ Examen en pause — cliquez sur <strong>Reprendre</strong> pour continuer.
      </div>
    </header>

    <!-- ============================ MODE BANQUE ============================ -->
    <section v-if="mode === 'edit'" class="ce-edit">

      <!-- Coller les questions en masse -->
      <div class="ce-paste-card">
        <div class="ce-paste-head">
          <h3>📋 Coller un lot de questions</h3>
          <p class="ce-paste-sub">
            Collez vos questions au format ci-dessous. Chaque question commence par
            <code>Question N</code>, suit un passage, l'énoncé, puis quatre options
            <code>A.</code>, <code>B.</code>, <code>C.</code>, <code>D.</code>.
            Vous pouvez ajouter une ligne <code>Réponse : A</code> pour fixer la bonne réponse.
          </p>
          <details class="ce-paste-help">
            <summary>Voir un exemple</summary>
            <pre>{{ exampleFormat }}</pre>
          </details>
        </div>
        <textarea
          v-model="pasteText"
          class="ce-paste-area"
          rows="8"
          spellcheck="false"
          autocorrect="off"
          placeholder="Collez ici vos questions… (Question 1, A./B./C./D., Question 2, …)"
        ></textarea>
        <div class="ce-paste-actions">
          <button
            class="btn-primary"
            :disabled="!pasteText.trim()"
            @click="onParsePaste('append')"
            title="Ajoute les questions du texte à la fin de la banque actuelle"
          >
            ➕ Ajouter à la banque
          </button>
          <button
            class="btn-secondary"
            :disabled="!pasteText.trim()"
            @click="onParsePaste('replace')"
            title="Vide la banque puis charge toutes les questions du texte (utile pour un fichier maître de corrigés)"
          >
            🔄 Remplacer la banque
          </button>
          <button
            class="btn-ghost"
            :disabled="!pasteText"
            @click="pasteText = ''"
          >
            Effacer
          </button>
          <span v-if="parseInfo" class="ce-paste-info" :class="parseInfo.kind">
            {{ parseInfo.message }}
          </span>
        </div>

        <!-- Récapitulatif des corrigés après import -->
        <div v-if="lastImportSummary && lastImportSummary.length > 0" class="ce-import-summary">
          <div class="ce-import-summary-title">
            ✅ Mappage des corrigés importés
          </div>
          <ol class="ce-import-summary-list">
            <li
              v-for="(s, i) in lastImportSummary"
              :key="i"
              :class="{ warn: !s.correctAnswer }"
            >
              <span class="ce-imp-num">Question {{ s.index }}</span>
              <span class="ce-imp-arrow">→</span>
              <span class="ce-imp-ans">
                Réponse :
                <strong>{{ s.correctAnswer || '—' }}</strong>
              </span>
              <span class="ce-imp-prompt">« {{ s.preview }} »</span>
            </li>
          </ol>
          <p class="ce-import-summary-note">
            Chaque numéro <code>Question N</code> du texte est mappé à la
            position <strong>N</strong> de la banque. Le corrigé (réponse,
            raisonnement, vocabulaire) est attaché à la question correspondante
            et utilisé tel quel pendant la correction.
          </p>
        </div>
      </div>

      <!-- Barre d'actions sur la banque -->
      <div class="ce-bank-bar">
        <h3 class="ce-bank-title">
          Banque <span class="ce-bank-count">({{ questions.length }})</span>
        </h3>
        <div class="ce-bank-actions">
          <button class="btn-secondary" @click="addBlankQuestion">
            ➕ Nouvelle question
          </button>
          <button
            class="btn-ghost danger"
            :disabled="questions.length === 0"
            @click="confirmClearAll"
          >
            🗑 Tout supprimer
          </button>
        </div>
      </div>

      <!-- Liste éditable -->
      <p v-if="questions.length === 0" class="ce-empty">
        La banque est vide. Collez des questions ci-dessus ou créez-en une à la main.
      </p>

      <ol class="ce-q-list" v-else>
        <li
          v-for="(q, idx) in questions"
          :key="q.id"
          class="ce-q-card"
        >
          <header class="ce-q-head">
            <span class="ce-q-num">Question {{ idx + 1 }}</span>
            <div class="ce-q-head-actions">
              <button
                class="icon-btn"
                :disabled="idx === 0"
                title="Monter"
                @click="moveQuestion(idx, -1)"
              >↑</button>
              <button
                class="icon-btn"
                :disabled="idx === questions.length - 1"
                title="Descendre"
                @click="moveQuestion(idx, 1)"
              >↓</button>
              <button
                class="icon-btn danger"
                title="Supprimer la question"
                @click="removeQuestion(idx)"
              >🗑</button>
            </div>
          </header>

          <label class="ce-q-label">Passage</label>
          <textarea
            class="ce-q-area"
            v-model="q.passage"
            rows="3"
            placeholder="Texte / annonce / extrait à lire…"
          ></textarea>

          <label class="ce-q-label">Énoncé</label>
          <textarea
            class="ce-q-area"
            v-model="q.prompt"
            rows="2"
            placeholder="Quel est le but de cette annonce ?"
          ></textarea>

          <div class="ce-q-options">
            <div
              v-for="letter in ['A','B','C','D']"
              :key="letter"
              class="ce-opt-row"
              :class="{ correct: q.correctAnswer === letter }"
            >
              <button
                type="button"
                class="ce-opt-mark"
                :class="{ active: q.correctAnswer === letter }"
                :title="q.correctAnswer === letter ? 'Bonne réponse' : 'Marquer comme bonne réponse'"
                @click="toggleCorrect(q, letter)"
              >
                {{ letter }}
              </button>
              <input
                type="text"
                class="ce-opt-input"
                v-model="q.options[letter]"
                :placeholder="`Option ${letter}`"
              />
            </div>
          </div>

          <p v-if="!q.correctAnswer" class="ce-q-warn">
            ⚠ Aucune bonne réponse marquée. Cliquez sur la lettre (A/B/C/D) pour la définir.
          </p>

          <details class="ce-corrige-edit">
            <summary>
              Corrigé : raisonnement
              <span v-if="q.reasoning" class="ce-corrige-flag">✓</span>
              + vocabulaire
              <span class="ce-corrige-flag" :class="{ filled: q.vocabulary?.length > 0 }">
                {{ q.vocabulary?.length || 0 }}
              </span>
            </summary>
            <label class="ce-q-label">Raisonnement (affiché après l'examen)</label>
            <textarea
              class="ce-q-area"
              v-model="q.reasoning"
              rows="3"
              placeholder="Expliquez pourquoi la bonne réponse est correcte…"
            ></textarea>

            <div class="ce-vocab-edit-head">
              <label class="ce-q-label">Vocabulaire détecté</label>
              <button
                class="btn-ghost small"
                type="button"
                @click="refreshVocabulary(q)"
                title="Recalculer depuis le passage / l'énoncé / les options"
              >🔄 Recalculer</button>
            </div>
            <p v-if="!q.vocabulary || q.vocabulary.length === 0" class="ce-vocab-empty">
              Aucun mot annoté. Format dans le texte : <code>mot (définition ; lemme)</code>.
            </p>
            <ul v-else class="ce-vocab-edit-list">
              <li v-for="(v, vi) in q.vocabulary" :key="vi" class="ce-vocab-edit-row">
                <input class="ce-vocab-input" v-model="v.word" placeholder="mot" />
                <input class="ce-vocab-input flex" v-model="v.definition" placeholder="définition" />
                <input
                  class="ce-vocab-input"
                  :value="(v.lemmas || []).join(', ')"
                  @input="v.lemmas = $event.target.value.split(',').map(s => s.trim()).filter(Boolean)"
                  placeholder="lemmes"
                />
                <button
                  class="icon-btn danger"
                  type="button"
                  @click="q.vocabulary.splice(vi, 1)"
                  title="Supprimer"
                >🗑</button>
              </li>
            </ul>
          </details>
        </li>
      </ol>
    </section>

    <!-- ============================ MODE EXAMEN ============================ -->
    <section v-else-if="mode === 'exam'" class="ce-exam">
      <div class="ce-exam-actions-top">
        <button class="btn-ghost" @click="switchMode('edit')">
          ← Modifier la banque
        </button>
        <button class="btn-primary" @click="finishExam">
          ✅ Terminer et corriger
        </button>
      </div>

      <ol v-if="timer.running" class="ce-q-list">
        <li
          v-for="(q, idx) in questions"
          :key="q.id"
          class="ce-q-card exam"
        >
          <header class="ce-q-head">
            <span class="ce-q-num">Question {{ idx + 1 }}</span>
          </header>

          <p v-if="viewClean(q).passage" class="ce-q-passage">{{ viewClean(q).passage }}</p>
          <p class="ce-q-prompt">{{ viewClean(q).prompt }}</p>

          <div class="ce-exam-options">
            <label
              v-for="letter in ['A','B','C','D']"
              :key="letter"
              class="ce-exam-opt"
              :class="{ chosen: userAnswers[q.id] === letter }"
            >
              <input
                type="radio"
                :name="`q-${q.id}`"
                :value="letter"
                v-model="userAnswers[q.id]"
              />
              <span class="ce-exam-letter">{{ letter }}.</span>
              <span class="ce-exam-text">{{ viewClean(q).options[letter] }}</span>
            </label>
          </div>
        </li>
      </ol>

      <div class="ce-exam-actions">
        <button class="btn-ghost" @click="switchMode('edit')">
          ← Modifier la banque
        </button>
        <button class="btn-primary" @click="finishExam">
          ✅ Terminer et corriger
        </button>
      </div>
    </section>

    <!-- ============================ MODE RÉSULTATS ============================ -->
    <section v-else-if="mode === 'results'" class="ce-results">
      <div class="ce-score-card" :class="scoreClass">
        <div class="ce-score-big">
          {{ score.correct }} / {{ score.total }}
        </div>
        <div class="ce-score-pct">
          {{ score.percent }} % de bonnes réponses
        </div>
        <div class="ce-score-time">
          Temps : {{ formatTime(timer.elapsed) }}
        </div>
      </div>

      <ol class="ce-q-list">
        <li
          v-for="(q, idx) in questions"
          :key="q.id"
          class="ce-q-card results"
          :class="resultStatus(q)"
        >
          <header class="ce-q-head">
            <span class="ce-q-num">Question {{ idx + 1 }}</span>
            <span class="ce-q-result-badge">
              {{ resultLabel(q) }}
            </span>
          </header>

          <p v-if="viewClean(q).passage" class="ce-q-passage">{{ viewClean(q).passage }}</p>
          <p class="ce-q-prompt">{{ viewClean(q).prompt }}</p>

          <ul class="ce-results-opts">
            <li
              v-for="letter in ['A','B','C','D']"
              :key="letter"
              :class="optionClass(q, letter)"
            >
              <span class="ce-exam-letter">{{ letter }}.</span>
              <span class="ce-exam-text">{{ viewClean(q).options[letter] }}</span>
              <span v-if="q.correctAnswer === letter" class="ce-tag tag-correct">bonne réponse</span>
              <span v-else-if="userAnswers[q.id] === letter" class="ce-tag tag-yours">votre choix</span>
            </li>
          </ul>

          <!-- Corrigé : raisonnement -->
          <div v-if="q.reasoning" class="ce-corrige">
            <div class="ce-corrige-title">💡 Raisonnement</div>
            <p class="ce-corrige-text">{{ q.reasoning }}</p>
          </div>

          <!-- Corrigé : vocabulaire à apprendre -->
          <div v-if="q.vocabulary && q.vocabulary.length > 0" class="ce-vocab">
            <div class="ce-vocab-title">
              📚 Vocabulaire à retenir
              <span class="ce-vocab-count">({{ q.vocabulary.length }})</span>
            </div>
            <ul class="ce-vocab-list">
              <li v-for="(v, vi) in q.vocabulary" :key="vi" class="ce-vocab-item">
                <span class="ce-vocab-word">{{ v.word }}</span>
                <span class="ce-vocab-arrow">→</span>
                <span class="ce-vocab-def">{{ v.definition }}</span>
                <span
                  v-if="v.lemmas && v.lemmas.length > 0"
                  class="ce-vocab-lemmas"
                  :title="'Lemmes / formes de base'"
                >
                  {{ v.lemmas.join(', ') }}
                </span>
              </li>
            </ul>
          </div>
        </li>
      </ol>

      <div class="ce-exam-actions">
        <button class="btn-ghost" @click="switchMode('edit')">
          ← Retour à la banque
        </button>
        <button class="btn-secondary" @click="restartExam">
          🔄 Refaire l'examen
        </button>
      </div>
    </section>

    <!-- ============================ MODE COMPRÉHENSION FINE ============================ -->
    <section v-else-if="mode === 'fine'" class="ce-fine">

      <div class="ce-paste-card">
        <div class="ce-paste-head">
          <h3>🔍 Coller des textes avec questions de compréhension fine</h3>
          <p class="ce-paste-sub">
            Pour chaque <code>Question N</code>, collez un passage puis une ou plusieurs
            questions du type <em>« Quel mot ou expression dans le texte signifie … ? »</em>.
            Lisez le texte, écrivez votre réponse, puis cliquez sur 👁 pour comparer.
          </p>
          <details class="ce-paste-help">
            <summary>Voir un exemple</summary>
            <pre>{{ exampleFineFormat }}</pre>
          </details>
        </div>
        <textarea
          v-model="finePasteText"
          class="ce-paste-area"
          rows="8"
          spellcheck="false"
          autocorrect="off"
          placeholder="Collez ici vos textes et leurs questions de compréhension fine…"
        ></textarea>
        <div class="ce-paste-actions">
          <button
            class="btn-primary"
            :disabled="!finePasteText.trim()"
            @click="onParseFinePaste"
          >
            ➕ Importer dans la banque
          </button>
          <button
            class="btn-ghost"
            :disabled="!finePasteText"
            @click="finePasteText = ''"
          >
            Effacer
          </button>
          <span v-if="fineParseInfo" class="ce-paste-info" :class="fineParseInfo.kind">
            {{ fineParseInfo.message }}
          </span>
        </div>
      </div>

      <div class="ce-bank-bar">
        <h3 class="ce-bank-title">
          Textes <span class="ce-bank-count">({{ fineItems.length }})</span>
        </h3>
        <div class="ce-bank-actions">
          <button class="btn-secondary" @click="addBlankFineItem">
            ➕ Nouveau texte
          </button>
          <button
            class="btn-ghost danger"
            :disabled="fineItems.length === 0"
            @click="confirmClearFine"
          >
            🗑 Tout supprimer
          </button>
        </div>
      </div>

      <p v-if="fineItems.length === 0" class="ce-empty">
        Aucun texte. Collez un ou plusieurs blocs <code>Question N</code> ci-dessus.
      </p>

      <ol class="ce-q-list" v-else>
        <li
          v-for="(item, idx) in fineItems"
          :key="item.id"
          class="ce-q-card fine"
        >
          <header class="ce-q-head">
            <span class="ce-q-num">Texte {{ idx + 1 }}</span>
            <div class="ce-q-head-actions">
              <button
                class="icon-btn"
                :disabled="idx === 0"
                title="Monter"
                @click="moveFineItem(idx, -1)"
              >↑</button>
              <button
                class="icon-btn"
                :disabled="idx === fineItems.length - 1"
                title="Descendre"
                @click="moveFineItem(idx, 1)"
              >↓</button>
              <button
                class="icon-btn"
                :title="item.passageVisible === false ? 'Afficher le texte' : 'Masquer le texte'"
                @click="item.passageVisible = item.passageVisible === false"
              >{{ item.passageVisible === false ? '👁' : '🙈' }}</button>
              <button
                class="icon-btn danger"
                title="Supprimer ce texte"
                @click="removeFineItem(idx)"
              >🗑</button>
            </div>
          </header>

          <p v-if="item.passageVisible !== false" class="ce-q-passage">{{ item.passage }}</p>
          <p v-else class="ce-q-passage hidden">
            Texte masqué — cliquez sur 👁 pour relire après avoir répondu.
          </p>

          <div class="ce-fine-subq-list">
            <div
              v-for="(sq, qi) in item.questions"
              :key="qi"
              class="ce-fine-subq"
            >
              <div class="ce-fine-subq-head">
                <span class="ce-fine-subq-num">{{ qi + 1 }}.</span>
                <span class="ce-fine-subq-text">{{ sq }}</span>
              </div>
              <input
                type="text"
                class="ce-fine-answer"
                v-model="item.answers[qi]"
                placeholder="Votre réponse (mot ou expression du texte)…"
                autocomplete="off"
              />
            </div>
          </div>

          <details class="ce-corrige-edit">
            <summary>Modifier le texte / les questions</summary>
            <label class="ce-q-label">Passage</label>
            <textarea
              class="ce-q-area"
              v-model="item.passage"
              rows="3"
            ></textarea>
            <label class="ce-q-label">Questions (une par ligne)</label>
            <textarea
              class="ce-q-area"
              :value="item.questions.join('\n')"
              @input="syncFineQuestions(item, $event.target.value)"
              rows="3"
            ></textarea>
          </details>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/* ------------------------------------------------------------------ */
/* Persistance                                                         */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'tcf-ce-questions-v1'
const FINE_STORAGE_KEY = 'tcf-ce-fine-v1'

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */
// Minuteur conseillé : 45 min comme l'épreuve officielle.
const budgetSeconds = 45 * 60
const warningSeconds = Math.floor(budgetSeconds * 0.8)

const questions = ref([])
const mode = ref('edit')          // 'edit' | 'exam' | 'results' | 'fine'
const userAnswers = reactive({})  // { [questionId]: 'A'|'B'|'C'|'D' }
const pasteText = ref('')
const parseInfo = ref(null)
const lastImportSummary = ref(null) // [{ index, correctAnswer, preview }]

// Compréhension fine
const fineItems = ref([])         // [{ id, passage, questions: [string], answers: {}, passageVisible: bool }]
const finePasteText = ref('')
const fineParseInfo = ref(null)

const timer = reactive({ elapsed: 0, running: false })
let timerInterval = null
let uid = 1
function nextId() { return `q-${Date.now()}-${uid++}` }

/* ------------------------------------------------------------------ */
/* Exemple affiché dans <details>                                     */
/* ------------------------------------------------------------------ */
const exampleFormat = `Question 1
Pour l'été, voici quelques gestes simples s'il fait très chaud:
boire un litre et demi d'eau par jour ;
limiter les efforts physiques ;
manger des fruits et des légumes ;
garder sa maison au frais.
Quel est le but de cette annonce ?
A. Donner des conseils.
B. Informer sur la météo.
C. Présenter des activités.
D. Proposer un menu.
Réponse Correcte : A)
Raisonnement :
L'annonce liste des gestes simples pour bien vivre la chaleur. Il s'agit donc de conseils.

Question 2
L'Association (groupe de personnes ; associer) « Bon appétit ! » vous propose (offrir ; proposer)
des bons petits plats (repas préparés ; plat) livrés à domicile.
Qu'est-ce que cette association propose ?
A. Des achats (action d'acheter ; achat).
B. Des conseils pour maigrir (perdre du poids ; maigrir).
C. Des recettes (instructions ; recette).
D. Des repas livrés (apporter ; livrer) à domicile.
Réponse Correcte : D)
Raisonnement :
L'association apporte des plats directement chez les personnes.`

const exampleFineFormat = `Question 1
Maman,
Je fais mes devoirs de mathématiques chez Louise. Je rentre à 21 heures.
Bises et à ce soir.
Patrick
Quel mot ou expression dans le texte signifie "faire des exercices scolaires à la maison" ?
Quel mot ou expression dans le texte signifie "être occupé à une activité" ?

Question 2
Attention,
Cette semaine, l'accueil de l'université est fermé lundi toute la journée.
Quel mot ou expression dans le texte signifie "endroit où l'on reçoit les visiteurs" ?
Quel mot ou expression dans le texte signifie "indiquer une nouvelle importante" ?`

/* ------------------------------------------------------------------ */
/* Parser                                                              */
/* ------------------------------------------------------------------ */
function parsePastedText(raw) {
  const text = (raw || '').replace(/\r\n?/g, '\n').trim()
  if (!text) return []

  // Découpe sur "Question N" en début de ligne
  const parts = text.split(/^\s*Question\s+\d+\s*[:.\-)]?\s*$/im)
  // parts[0] = ce qui précède la 1re "Question N" (souvent vide) → on l'ignore
  const chunks = parts.slice(1).map(s => s.trim()).filter(Boolean)

  // Si l'utilisateur n'a pas mis "Question N", on tente quand même de traiter
  // le bloc unique tel quel.
  const blocks = chunks.length > 0 ? chunks : [text]

  const out = []
  for (const block of blocks) {
    const parsed = parseQuestionBlock(block)
    if (parsed) out.push(parsed)
  }
  return out
}

function parseQuestionBlock(block) {
  const rawLines = block.split('\n')
  const lines = rawLines.map(l => l.trim())

  const options = { A: '', B: '', C: '', D: '' }
  let correctAnswer = null
  let reasoning = ''

  const nonOptionLines = []

  const optionRe = /^([A-D])\s*[.\)\-:]\s*(.+)$/
  const answerRe = /^(?:r[ée]ponse(?:\s+correcte)?|answer|correct)\s*[:\-]?\s*\(?\s*([A-D])\b[\)\.]?/i
  const reasoningRe = /^(?:raisonnement|reasoning|explication|explanation)\s*[:\-]?\s*(.*)$/i

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line) { i++; continue }

    const optMatch = line.match(optionRe)
    if (optMatch) {
      options[optMatch[1]] = optMatch[2].trim()
      i++
      continue
    }
    const ansMatch = line.match(answerRe)
    if (ansMatch) {
      correctAnswer = ansMatch[1].toUpperCase()
      i++
      continue
    }
    const reasMatch = line.match(reasoningRe)
    if (reasMatch) {
      // Tout le reste du bloc fait partie du raisonnement.
      const rest = []
      if (reasMatch[1] && reasMatch[1].trim()) rest.push(reasMatch[1].trim())
      i++
      while (i < lines.length) {
        const l = lines[i]
        if (l) rest.push(l)
        i++
      }
      reasoning = rest.join(' ').replace(/\s+/g, ' ').trim()
      break
    }
    nonOptionLines.push(line)
    i++
  }

  // Pas d'options détectées → on ignore le bloc.
  const hasAnyOption = Object.values(options).some(v => v)
  if (!hasAnyOption) return null

  // L'énoncé est la dernière ligne avant les options ; le reste = passage.
  let prompt = ''
  let passage = ''
  const nonEmpty = nonOptionLines.filter(l => l.length > 0)
  if (nonEmpty.length === 1) {
    prompt = nonEmpty[0]
  } else if (nonEmpty.length > 1) {
    prompt = nonEmpty[nonEmpty.length - 1]
    passage = nonEmpty.slice(0, -1).join('\n')
  }

  // Vocabulaire : on extrait depuis passage + énoncé + options.
  const vocabSource = [passage, prompt, ...Object.values(options)].join('\n')
  const vocabulary = extractVocabulary(vocabSource)

  return {
    id: nextId(),
    passage,
    prompt,
    options,
    correctAnswer,
    reasoning,
    vocabulary
  }
}

/* ------------------------------------------------------------------ */
/* Vocabulaire : extraction des annotations « mot (déf ; lemme) »     */
/* ------------------------------------------------------------------ */
const VOCAB_RE = /([^\s().,;:!?«»"']+)\s*\(([^()]*?;\s*[^()]*?)\)/g
const ANNOTATION_STRIP_RE = /\s*\([^()]*?;\s*[^()]*?\)/g

function extractVocabulary(text) {
  if (!text) return []
  const seen = new Set()
  const out = []
  let m
  // On clone l'expression pour pouvoir réinitialiser lastIndex.
  const re = new RegExp(VOCAB_RE.source, VOCAB_RE.flags)
  while ((m = re.exec(text)) !== null) {
    const word = (m[1] || '').trim()
    const inner = (m[2] || '').trim()
    const [defPart, lemmaPart = ''] = inner.split(';').map(s => s.trim())
    const lemmas = lemmaPart
      ? lemmaPart.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const key = `${word}|${defPart}|${lemmas.join(',')}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ word, definition: defPart, lemmas })
  }
  return out
}

function stripAnnotations(text) {
  if (!text) return text
  return text.replace(ANNOTATION_STRIP_RE, '').replace(/[ \t]{2,}/g, ' ')
}

function stripAnnotationsInOptions(opts) {
  const out = { A: '', B: '', C: '', D: '' }
  for (const k of ['A', 'B', 'C', 'D']) out[k] = stripAnnotations(opts?.[k] || '')
  return out
}

function onParsePaste(action = 'append') {
  const parsed = parsePastedText(pasteText.value)
  if (parsed.length === 0) {
    parseInfo.value = {
      kind: 'error',
      message: "Aucune question détectée. Vérifiez le format (Question N + lignes A./B./C./D.)."
    }
    lastImportSummary.value = null
    return
  }

  // Mode "replace" : on remplace la banque entière et on réinitialise les réponses.
  if (action === 'replace') {
    if (questions.value.length > 0) {
      const ok = window.confirm(
        `Remplacer les ${questions.value.length} question(s) actuelle(s) par les ${parsed.length} nouvelle(s) ?\n\n` +
        'Cela écrasera la banque actuelle. Les réponses en cours seront effacées.'
      )
      if (!ok) return
    }
    questions.value = parsed
    Object.keys(userAnswers).forEach(k => delete userAnswers[k])
  } else {
    // Mode "append" : on ajoute à la fin.
    questions.value.push(...parsed)
  }

  // Construction du récapitulatif de mappage (la position N reflète l'ordre
  // dans la banque finale).
  const startIdx = action === 'replace' ? 0 : (questions.value.length - parsed.length)
  lastImportSummary.value = parsed.map((q, i) => ({
    index: startIdx + i + 1,
    correctAnswer: q.correctAnswer,
    preview: (q.prompt || stripAnnotations(q.passage || '')).slice(0, 70)
              + ((q.prompt || q.passage || '').length > 70 ? '…' : '')
  }))

  const missingAns = parsed.filter(q => !q.correctAnswer).length
  const verb = action === 'replace' ? 'remplacée(s)' : 'ajoutée(s)'
  parseInfo.value = {
    kind: missingAns > 0 ? 'warn' : 'ok',
    message: `${parsed.length} question(s) ${verb}.`
      + (missingAns > 0 ? ` ${missingAns} sans « Réponse Correcte ».` : '')
  }
  pasteText.value = ''
}

/* ------------------------------------------------------------------ */
/* Édition de la banque                                                */
/* ------------------------------------------------------------------ */
function addBlankQuestion() {
  questions.value.push({
    id: nextId(),
    passage: '',
    prompt: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: null,
    reasoning: '',
    vocabulary: []
  })
  parseInfo.value = null
}

/* Recalcule le vocabulaire d'une question à partir du texte courant. */
function refreshVocabulary(q) {
  const src = [q.passage, q.prompt, ...Object.values(q.options || {})].join('\n')
  q.vocabulary = extractVocabulary(src)
}

/* Vue propre (sans annotations) pour le mode examen / résultats. */
function viewClean(q) {
  return {
    passage: stripAnnotations(q.passage),
    prompt: stripAnnotations(q.prompt),
    options: stripAnnotationsInOptions(q.options)
  }
}

function removeQuestion(idx) {
  const q = questions.value[idx]
  if (!q) return
  if (!window.confirm(`Supprimer la question ${idx + 1} ?`)) return
  delete userAnswers[q.id]
  questions.value.splice(idx, 1)
}

function moveQuestion(idx, delta) {
  const ni = idx + delta
  if (ni < 0 || ni >= questions.value.length) return
  const [item] = questions.value.splice(idx, 1)
  questions.value.splice(ni, 0, item)
}

function toggleCorrect(q, letter) {
  q.correctAnswer = q.correctAnswer === letter ? null : letter
}

function confirmClearAll() {
  if (!window.confirm('Supprimer toutes les questions de la banque ?')) return
  questions.value = []
  Object.keys(userAnswers).forEach(k => delete userAnswers[k])
  parseInfo.value = null
}

/* ------------------------------------------------------------------ */
/* Compréhension fine                                                  */
/* ------------------------------------------------------------------ */
// On considère qu'une ligne est une "sous-question" si elle se termine par "?"
// (cas courant : « Quel mot ou expression dans le texte signifie … ? »).
const FINE_SUBQ_RE = /\?\s*$/

function parsePastedFineText(raw) {
  const text = (raw || '').replace(/\r\n?/g, '\n').trim()
  if (!text) return []
  const parts = text.split(/^\s*Question\s+\d+\s*[:.\-)]?\s*$/im)
  const chunks = parts.slice(1).map(s => s.trim()).filter(Boolean)
  const blocks = chunks.length > 0 ? chunks : [text]

  const out = []
  for (const block of blocks) {
    const parsed = parseFineBlock(block)
    if (parsed) out.push(parsed)
  }
  return out
}

function parseFineBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  const passageLines = []
  const subQuestions = []
  // On parcourt depuis la fin : tant que la ligne se termine par "?", c'est une sous-question.
  let i = lines.length - 1
  while (i >= 0 && FINE_SUBQ_RE.test(lines[i])) {
    subQuestions.unshift(lines[i])
    i--
  }
  for (let j = 0; j <= i; j++) passageLines.push(lines[j])

  if (subQuestions.length === 0) return null

  const answers = {}
  subQuestions.forEach((_, qi) => { answers[qi] = '' })

  return {
    id: nextId(),
    passage: passageLines.join('\n').trim(),
    questions: subQuestions,
    answers,
    passageVisible: true
  }
}

function onParseFinePaste() {
  const parsed = parsePastedFineText(finePasteText.value)
  if (parsed.length === 0) {
    fineParseInfo.value = {
      kind: 'error',
      message: "Aucun texte détecté. Chaque bloc doit contenir au moins une ligne se terminant par '?'."
    }
    return
  }
  fineItems.value.push(...parsed)
  fineParseInfo.value = {
    kind: 'ok',
    message: `${parsed.length} texte${parsed.length > 1 ? 's' : ''} ajouté${parsed.length > 1 ? 's' : ''}.`
  }
  finePasteText.value = ''
}

function addBlankFineItem() {
  fineItems.value.push({
    id: nextId(),
    passage: '',
    questions: [''],
    answers: { 0: '' },
    passageVisible: true
  })
  fineParseInfo.value = null
}

function removeFineItem(idx) {
  if (!window.confirm(`Supprimer le texte ${idx + 1} ?`)) return
  fineItems.value.splice(idx, 1)
}

function moveFineItem(idx, delta) {
  const ni = idx + delta
  if (ni < 0 || ni >= fineItems.value.length) return
  const [item] = fineItems.value.splice(idx, 1)
  fineItems.value.splice(ni, 0, item)
}

function confirmClearFine() {
  if (!window.confirm('Supprimer tous les textes de compréhension fine ?')) return
  fineItems.value = []
  fineParseInfo.value = null
}

function syncFineQuestions(item, value) {
  const newQs = value.split('\n').map(s => s.trim()).filter(Boolean)
  item.questions = newQs
  // On garde les réponses existantes pour les indices encore valides.
  const newAnswers = {}
  newQs.forEach((_, i) => { newAnswers[i] = item.answers?.[i] || '' })
  item.answers = newAnswers
}

/* ------------------------------------------------------------------ */
/* Examen                                                              */
/* ------------------------------------------------------------------ */
function switchMode(target) {
  if (target === 'exam') {
    if (questions.value.length === 0) return
    // Reset des réponses utilisateur
    Object.keys(userAnswers).forEach(k => delete userAnswers[k])
    for (const q of questions.value) userAnswers[q.id] = null
    timer.elapsed = 0
    startTimer()
    mode.value = 'exam'
    return
  }
  if (target === 'edit') {
    stopTimer()
    mode.value = 'edit'
    return
  }
  if (target === 'fine') {
    stopTimer()
    mode.value = 'fine'
    return
  }
}

function finishExam() {
  stopTimer()
  mode.value = 'results'
}

function restartExam() {
  Object.keys(userAnswers).forEach(k => delete userAnswers[k])
  for (const q of questions.value) userAnswers[q.id] = null
  timer.elapsed = 0
  startTimer()
  mode.value = 'exam'
}

const score = computed(() => {
  const total = questions.value.length
  let correct = 0
  for (const q of questions.value) {
    if (q.correctAnswer && userAnswers[q.id] === q.correctAnswer) correct++
  }
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100)
  return { correct, total, percent }
})

const scoreClass = computed(() => {
  if (score.value.total === 0) return 'neutral'
  if (score.value.percent >= 70) return 'good'
  if (score.value.percent >= 50) return 'ok'
  return 'bad'
})

function resultStatus(q) {
  if (!q.correctAnswer) return 'unknown'
  const ans = userAnswers[q.id]
  if (!ans) return 'skipped'
  return ans === q.correctAnswer ? 'correct' : 'wrong'
}

function resultLabel(q) {
  const s = resultStatus(q)
  if (s === 'correct') return '✓ Correct'
  if (s === 'wrong') return '✗ Incorrect'
  if (s === 'skipped') return '— Sans réponse'
  return '? Sans clé'
}

function optionClass(q, letter) {
  const isCorrect = q.correctAnswer === letter
  const isChosen = userAnswers[q.id] === letter
  return {
    correct: isCorrect,
    chosen: isChosen,
    wrong: isChosen && !isCorrect
  }
}

/* ------------------------------------------------------------------ */
/* Minuteur                                                            */
/* ------------------------------------------------------------------ */
function startTimer() {
  timer.running = true
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (timer.running) timer.elapsed++
  }, 1000)
}

function stopTimer() {
  timer.running = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function toggleTimer() {
  timer.running = !timer.running
  if (timer.running && !timerInterval) startTimer()
}

function resetTimer() {
  if (!window.confirm('Réinitialiser le minuteur à 00:00 ?')) return
  timer.elapsed = 0
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/* Persistance (localStorage)                                          */
/* ------------------------------------------------------------------ */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (Array.isArray(data?.questions)) {
      questions.value = data.questions.map(q => {
        const passage = q.passage || ''
        const prompt = q.prompt || ''
        const options = {
          A: q.options?.A || '',
          B: q.options?.B || '',
          C: q.options?.C || '',
          D: q.options?.D || ''
        }
        // Si l'ancien stockage n'avait pas de vocabulaire, on l'extrait.
        const vocabSource = [passage, prompt, ...Object.values(options)].join('\n')
        const vocabulary = Array.isArray(q.vocabulary) && q.vocabulary.length > 0
          ? q.vocabulary
          : extractVocabulary(vocabSource)
        return {
          id: q.id || nextId(),
          passage,
          prompt,
          options,
          correctAnswer: q.correctAnswer || null,
          reasoning: q.reasoning || '',
          vocabulary
        }
      })
    }
  } catch (e) {
    console.warn('CE: échec de chargement', e)
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ questions: questions.value })
    )
  } catch (e) {
    console.warn('CE: échec de sauvegarde', e)
  }
}

watch(questions, saveToStorage, { deep: true })

function loadFineFromStorage() {
  try {
    const raw = localStorage.getItem(FINE_STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (Array.isArray(data?.items)) {
      fineItems.value = data.items.map(it => {
        const qs = Array.isArray(it.questions) ? it.questions : []
        const ans = {}
        qs.forEach((_, i) => { ans[i] = it.answers?.[i] || '' })
        return {
          id: it.id || nextId(),
          passage: it.passage || '',
          questions: qs,
          answers: ans,
          passageVisible: it.passageVisible !== false
        }
      })
    }
  } catch (e) {
    console.warn('CE (fine): échec de chargement', e)
  }
}

function saveFineToStorage() {
  try {
    localStorage.setItem(
      FINE_STORAGE_KEY,
      JSON.stringify({ items: fineItems.value })
    )
  } catch (e) {
    console.warn('CE (fine): échec de sauvegarde', e)
  }
}

watch(fineItems, saveFineToStorage, { deep: true })

onMounted(() => {
  loadFromStorage()
  loadFineFromStorage()
})
onBeforeUnmount(() => stopTimer())
</script>

<style scoped>
.ce-page { display: flex; flex-direction: column; gap: 16px; }

/* -------- Topbar ----------------------------------------------------- */
.ce-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.ce-mode-tabs {
  display: flex;
  gap: 6px;
  background: var(--surface-alt);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--border);
}
.ce-mode-tab {
  background: transparent;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.ce-mode-tab:hover:not(:disabled) {
  color: #16a085;
  background: #16a08510;
}
.ce-mode-tab.active {
  background: var(--surface);
  color: #16a085;
  box-shadow: 0 1px 3px var(--shadow-sm);
}
.ce-mode-tab:disabled { opacity: 0.45; cursor: not-allowed; }
.ce-mode-count {
  background: #16a08522;
  color: #16a085;
  padding: 1px 7px;
  border-radius: 8px;
  font-size: 11px;
}

.ce-timer {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  font-variant-numeric: tabular-nums;
}
.ce-timer.running { border-color: #27ae60; background: #27ae600d; }
.ce-timer.warning { border-color: #e67e22; background: #e67e220d; }
.ce-timer.over   { border-color: #c0392b; background: #c0392b12; }
.ce-timer-icon { font-size: 14px; }
.ce-timer-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.ce-timer-budget { font-size: 12px; color: var(--text-faint); }
.ce-timer-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
}
.ce-timer-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.15s;
}
.ce-timer-btn:hover { border-color: #16a085; color: #16a085; }
.ce-timer-btn.primary {
  border-color: #16a085;
  background: #16a085;
  color: #fff;
}
.ce-timer-btn.primary:hover { background: #138a72; border-color: #138a72; }
.ce-timer-btn.primary.paused {
  background: #e67e22;
  border-color: #e67e22;
  animation: blink 1.6s ease-in-out infinite;
}
.ce-timer-btn.primary.paused:hover { background: #d35400; border-color: #d35400; }
.ce-timer-btn-icon { font-size: 13px; }
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.78; }
}

.ce-paused-banner {
  width: 100%;
  margin-top: 8px;
  padding: 14px 16px;
  border: 1.5px dashed #e67e22;
  background: #e67e2210;
  color: #b9651b;
  border-radius: 12px;
  font-size: 14px;
  text-align: center;
}
.ce-paused-banner strong { color: #b9651b; }

/* -------- Coller --------------------------------------------------- */
.ce-paste-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border: 1.5px dashed var(--border);
  background: var(--surface);
  border-radius: 14px;
}
.ce-paste-head h3 {
  margin: 0 0 4px;
  font-size: 15px;
  color: var(--title-color);
}
.ce-paste-sub {
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
}
.ce-paste-sub code {
  background: var(--surface-alt);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}
.ce-paste-help {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--text-muted);
}
.ce-paste-help summary { cursor: pointer; user-select: none; }
.ce-paste-help pre {
  margin-top: 6px;
  padding: 10px 12px;
  background: var(--surface-alt);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--text-secondary);
}
.ce-paste-area {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
.ce-paste-area:focus { border-color: #16a085; box-shadow: 0 0 0 3px #16a08522; }
.ce-paste-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.ce-paste-info {
  font-size: 12.5px;
  padding: 4px 8px;
  border-radius: 6px;
}
.ce-paste-info.ok    { color: #16a085; background: #16a08515; }
.ce-paste-info.warn  { color: #b9651b; background: #e67e2218; }
.ce-paste-info.error { color: #c0392b; background: #c0392b15; }

/* Récapitulatif d'import */
.ce-import-summary {
  margin-top: 4px;
  padding: 12px 14px;
  background: #16a08508;
  border: 1px solid #16a08533;
  border-radius: 10px;
}
.ce-import-summary-title {
  font-size: 12px;
  font-weight: 700;
  color: #16a085;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
}
.ce-import-summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ce-import-summary-list li {
  display: flex;
  gap: 6px;
  align-items: baseline;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface);
}
.ce-import-summary-list li.warn {
  background: #e67e2210;
  color: #b9651b;
}
.ce-imp-num    { font-weight: 700; color: #16a085; min-width: 80px; }
.ce-imp-arrow  { color: var(--text-faint); }
.ce-imp-ans    { color: var(--text-primary); }
.ce-imp-ans strong { color: #16a085; font-size: 13px; }
.ce-import-summary-list li.warn .ce-imp-ans strong { color: #b9651b; }
.ce-imp-prompt {
  flex: 1;
  min-width: 0;
  color: var(--text-muted);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ce-import-summary-note {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.5;
}
.ce-import-summary-note code {
  background: var(--surface-alt);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11px;
}

/* -------- Boutons --------------------------------------------------- */
.btn-primary, .btn-secondary, .btn-ghost {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1.5px solid transparent;
}
.btn-primary {
  background: #16a085;
  color: #fff;
}
.btn-primary:hover:not(:disabled) { background: #138a72; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  border-color: var(--border);
  background: var(--surface);
  color: var(--text-secondary);
}
.btn-secondary:hover:not(:disabled) { border-color: #16a085; color: #16a085; }

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-muted);
}
.btn-ghost:hover:not(:disabled) { background: var(--surface-alt); color: var(--text-primary); }
.btn-ghost.danger:hover:not(:disabled) { background: #c0392b15; color: #c0392b; }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

/* -------- Banque --------------------------------------------------- */
.ce-bank-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 4px;
}
.ce-bank-title { font-size: 15px; color: var(--title-color); margin: 0; }
.ce-bank-count { color: var(--text-faint); font-weight: 500; }
.ce-bank-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.ce-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.ce-q-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ce-q-card {
  border: 1.5px solid var(--border);
  background: var(--surface);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ce-q-card.exam   { border-left: 4px solid #16a085; }
.ce-q-card.results.correct { border-left: 4px solid #27ae60; }
.ce-q-card.results.wrong   { border-left: 4px solid #c0392b; }
.ce-q-card.results.skipped { border-left: 4px solid #95a5a6; }
.ce-q-card.results.unknown { border-left: 4px solid #f1c40f; }

.ce-q-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.ce-q-num {
  font-weight: 700;
  color: #16a085;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.ce-q-head-actions { display: flex; gap: 4px; }
.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.icon-btn:hover:not(:disabled) { border-color: #16a085; color: #16a085; }
.icon-btn.danger:hover:not(:disabled) { border-color: #c0392b; color: #c0392b; }
.icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.ce-q-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.ce-q-area {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  resize: vertical;
}
.ce-q-area:focus { outline: none; border-color: #16a085; }

.ce-q-options { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.ce-opt-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ce-opt-row.correct .ce-opt-input { background: #27ae6010; }
.ce-opt-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.ce-opt-mark:hover { border-color: #16a085; color: #16a085; }
.ce-opt-mark.active {
  border-color: #27ae60;
  background: #27ae60;
  color: #fff;
}
.ce-opt-input {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
}
.ce-opt-input:focus { outline: none; border-color: #16a085; }

.ce-q-warn {
  font-size: 12px;
  color: #b7950b;
  background: #f1c40f1c;
  padding: 6px 10px;
  border-radius: 8px;
  margin: 0;
}

/* -------- Examen --------------------------------------------------- */
.ce-exam-actions-top, .ce-exam-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ce-q-passage {
  white-space: pre-wrap;
  font-size: 14px;
  color: var(--text-secondary);
  background: var(--surface-alt);
  padding: 10px 12px;
  border-radius: 10px;
  line-height: 1.6;
  margin: 0;
}
.ce-q-prompt {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.ce-exam-options { display: flex; flex-direction: column; gap: 6px; }
.ce-exam-opt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.12s;
  font-size: 13.5px;
  line-height: 1.5;
}
.ce-exam-opt:hover { border-color: #16a085; background: #16a08508; }
.ce-exam-opt.chosen { border-color: #16a085; background: #16a08515; }
.ce-exam-opt input[type="radio"] { margin-top: 3px; accent-color: #16a085; }
.ce-exam-letter { font-weight: 700; color: #16a085; margin-right: 2px; }
.ce-exam-text { flex: 1; color: var(--text-primary); }

/* -------- Résultats ------------------------------------------------ */
.ce-score-card {
  text-align: center;
  padding: 20px;
  border-radius: 16px;
  border: 1.5px solid var(--border);
  background: var(--surface);
}
.ce-score-card.good { border-color: #27ae60; background: #27ae6010; }
.ce-score-card.ok   { border-color: #e67e22; background: #e67e2210; }
.ce-score-card.bad  { border-color: #c0392b; background: #c0392b10; }
.ce-score-big {
  font-size: 38px;
  font-weight: 800;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.ce-score-pct  { font-size: 16px; color: var(--text-muted); margin-top: 4px; }
.ce-score-time { font-size: 13px; color: var(--text-faint); margin-top: 4px; }

.ce-q-result-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 8px;
  background: var(--surface-alt);
  color: var(--text-muted);
}
.ce-q-card.results.correct .ce-q-result-badge { background: #27ae6018; color: #27ae60; }
.ce-q-card.results.wrong   .ce-q-result-badge { background: #c0392b18; color: #c0392b; }
.ce-q-card.results.skipped .ce-q-result-badge { background: #95a5a618; color: #7f8c8d; }
.ce-q-card.results.unknown .ce-q-result-badge { background: #f1c40f25; color: #b7950b; }

.ce-results-opts {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ce-results-opts li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
}
.ce-results-opts li.correct { border-color: #27ae60; background: #27ae6015; }
.ce-results-opts li.wrong   { border-color: #c0392b; background: #c0392b15; }
.ce-tag {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 7px;
  border-radius: 6px;
}
.ce-tag.tag-correct { background: #27ae60; color: #fff; }
.ce-tag.tag-yours   { background: #c0392b; color: #fff; }

/* -------- Corrigé : raisonnement + vocabulaire --------------------- */
.ce-corrige {
  margin-top: 4px;
  padding: 10px 12px;
  border-left: 3px solid #f1c40f;
  background: #f1c40f10;
  border-radius: 8px;
}
.ce-corrige-title {
  font-size: 12px;
  font-weight: 700;
  color: #b7950b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 4px;
}
.ce-corrige-text {
  font-size: 13.5px;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

.ce-vocab {
  margin-top: 4px;
  padding: 10px 12px;
  border-left: 3px solid #16a085;
  background: #16a08510;
  border-radius: 8px;
}
.ce-vocab-title {
  font-size: 12px;
  font-weight: 700;
  color: #16a085;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
}
.ce-vocab-count { color: var(--text-faint); font-weight: 500; margin-left: 4px; }
.ce-vocab-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ce-vocab-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}
.ce-vocab-word { font-weight: 700; color: var(--text-primary); }
.ce-vocab-arrow { color: var(--text-faint); }
.ce-vocab-def { flex: 1; min-width: 0; }
.ce-vocab-lemmas {
  font-size: 11.5px;
  font-style: italic;
  color: #16a085;
  background: #16a08518;
  padding: 1px 7px;
  border-radius: 5px;
}

/* -------- Édition du corrigé (mode banque) ------------------------- */
.ce-corrige-edit {
  margin-top: 4px;
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}
.ce-corrige-edit > summary {
  cursor: pointer;
  user-select: none;
  font-size: 12.5px;
  color: var(--text-muted);
  font-weight: 600;
  padding: 4px 0;
  list-style: revert;
}
.ce-corrige-edit > summary:hover { color: #16a085; }
.ce-corrige-flag {
  display: inline-block;
  background: var(--surface-alt);
  color: var(--text-faint);
  padding: 0 6px;
  border-radius: 6px;
  font-size: 11px;
  margin-left: 2px;
}
.ce-corrige-flag.filled,
.ce-corrige-edit > summary > .ce-corrige-flag:not(.filled):first-of-type {
  background: #16a08522;
  color: #16a085;
}
.ce-vocab-edit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  margin-bottom: 4px;
}
.btn-ghost.small { padding: 4px 8px; font-size: 12px; }
.ce-vocab-empty {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}
.ce-vocab-empty code {
  background: var(--surface-alt);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 11.5px;
}
.ce-vocab-edit-list {
  list-style: none;
  padding: 0;
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ce-vocab-edit-row {
  display: flex;
  gap: 4px;
  align-items: center;
}
.ce-vocab-input {
  width: 110px;
  padding: 5px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 12px;
}
.ce-vocab-input.flex { flex: 1; min-width: 80px; width: auto; }
.ce-vocab-input:focus { outline: none; border-color: #16a085; }

/* -------- Compréhension fine -------------------------------------- */
.ce-q-card.fine { border-left: 4px solid #2980b9; }
.ce-q-passage.hidden {
  font-style: italic;
  color: var(--text-faint);
  background: var(--surface-alt);
  border: 1px dashed var(--border);
}

.ce-fine-subq-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.ce-fine-subq {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--surface-alt);
  border-radius: 10px;
  border: 1px solid var(--border);
}
.ce-fine-subq-head {
  display: flex;
  gap: 6px;
  align-items: baseline;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-primary);
}
.ce-fine-subq-num { font-weight: 700; color: #2980b9; }
.ce-fine-subq-text { flex: 1; }
.ce-fine-answer {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--input-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13.5px;
}
.ce-fine-answer:focus { outline: none; border-color: #2980b9; box-shadow: 0 0 0 3px #2980b922; }
</style>
