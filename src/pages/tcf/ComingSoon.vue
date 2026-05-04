<template>
  <div class="coming-soon">
    <div class="cs-icon">{{ icon }}</div>
    <h2 class="cs-title">{{ title }}</h2>
    <p class="cs-subtitle">{{ subtitle }}</p>

    <div class="cs-card">
      <h3>🚧 En cours de construction</h3>
      <p>
        Cette section d'entraînement n'est pas encore disponible. Voici ce qui est prévu :
      </p>
      <ul>
        <li v-for="(f, i) in features" :key="i">{{ f }}</li>
      </ul>
    </div>

    <button class="cs-back" @click="navigate('/tcf')">← Retour aux épreuves TCF</button>
  </div>
</template>

<script setup>
import { navigate } from '../../composables/useRouter.js'

defineProps({
  icon: { type: String, default: '🛠' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  features: { type: Array, default: () => [] }
})
</script>

<style scoped>
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
  gap: 12px;
}
.cs-icon { font-size: 56px; line-height: 1; }
.cs-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--title-color);
}
.cs-subtitle { font-size: 14px; color: var(--text-muted); max-width: 480px; }
.cs-card {
  margin-top: 18px;
  width: 100%;
  max-width: 560px;
  padding: 18px 22px;
  border-radius: 14px;
  border: 1.5px dashed var(--border);
  background: var(--surface);
  text-align: left;
}
.cs-card h3 {
  font-size: 15px;
  margin-bottom: 8px;
  color: #8e44ad;
}
.cs-card p { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.cs-card ul { padding-left: 20px; }
.cs-card li {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 4px;
}
.cs-back {
  margin-top: 18px;
  padding: 9px 16px;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}
.cs-back:hover { border-color: #8e44ad; color: #8e44ad; }
</style>
