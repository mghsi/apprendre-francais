<template>
  <div class="corrector">
    <header class="header">
      <h2 class="title">📝 Correcteur grammatical</h2>
      <p class="subtitle">
        Saisis une phrase ou un court paragraphe en français. L’assistant
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

    <div class="page-actions">
      <button
        class="btn-secondary"
        :disabled="!inputText"
        @click="resetAll"
      >
        🗑 Effacer
      </button>
    </div>

    <!-- Panneau d'analyse réutilisable -->
    <GrammarCorrectionPanel
      ref="panelRef"
      v-model:text="inputText"
    />

    <!-- Aide -->
    <details class="help">
      <summary>Comment l’analyse est-elle sécurisée ?</summary>
      <div class="help-body">
        <p>
          Connecte-toi pour lancer une analyse. Le texte est envoyé uniquement
          à l’API sécurisée de l’application, qui contrôle ton identité, les
          limites d’utilisation et l’accès au fournisseur d’IA.
        </p>
        <p>
          Aucun token de fournisseur n’est stocké dans ton navigateur. Le
          texte peut être traité par un fournisseur tiers conformément à la
          politique de confidentialité de l’application.
        </p>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import GrammarCorrectionPanel from '../components/GrammarCorrectionPanel.vue'

const inputText = ref('')
const panelRef = ref(null)

function resetAll() {
  inputText.value = ''
  panelRef.value?.clearAnalysis()
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

.page-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
