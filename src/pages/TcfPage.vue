<template>
  <div class="tcf-page">
    <header class="tcf-header">
      <h2 class="tcf-title">🎓 TCF — Test de Connaissance du Français</h2>
      <p class="tcf-sub">
        Quatre épreuves dans un environnement proche de l'examen officiel
        (TCF Canada / SO). 60 min pour l'EE, minuteur indépendant par tâche.
      </p>
    </header>

    <div class="tcf-grid">
      <article
        v-for="s in skills"
        :key="s.id"
        class="tcf-card"
        :class="{ disabled: s.disabled }"
        :style="{ '--accent': s.color, '--accent-soft': s.color + '14' }"
        @click="!s.disabled && navigate(s.path)"
        tabindex="0"
        @keydown.enter="!s.disabled && navigate(s.path)"
      >
        <div class="tcf-card-top">
          <span class="tcf-card-icon">{{ s.icon }}</span>
          <span class="tcf-card-tag">{{ s.tag }}</span>
        </div>
        <h3 class="tcf-card-title">{{ s.title }}</h3>
        <p class="tcf-card-desc">{{ s.description }}</p>
        <div class="tcf-card-meta">
          <span class="meta-item">⏱ {{ s.duration }}</span>
          <span class="meta-item">{{ s.format }}</span>
        </div>
        <div class="tcf-card-cta">
          {{ s.disabled ? 'Bientôt disponible' : 'Commencer →' }}
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { navigate } from '../composables/useRouter.js'

const skills = [
  {
    id: 'co',
    tag: 'CO',
    title: 'Compréhension orale',
    description: "Questions à choix multiples sur des extraits audio courts à plus longs.",
    duration: '25 min',
    format: '39 questions QCM',
    icon: '🎧',
    color: '#3498db',
    path: '/tcf/co',
    disabled: true
  },
  {
    id: 'ce',
    tag: 'CE',
    title: 'Compréhension écrite',
    description: "Lecture de textes (annonces, articles, courriers) et QCM.",
    duration: '45 min',
    format: '39 questions QCM',
    icon: '📖',
    color: '#16a085',
    path: '/tcf/ce',
    disabled: false
  },
  {
    id: 'eo',
    tag: 'EO',
    title: 'Expression orale',
    description: "Trois tâches : entretien, échange d'informations, exprimer une opinion.",
    duration: '12 min',
    format: '3 tâches enregistrées',
    icon: '🎤',
    color: '#e67e22',
    path: '/tcf/eo',
    disabled: true
  },
  {
    id: 'ee',
    tag: 'EE',
    title: 'Expression écrite',
    description: "Trois tâches rédactionnelles : message, article de blog, article comparatif.",
    duration: '60 min',
    format: '3 tâches rédigées',
    icon: '✍️',
    color: '#8e44ad',
    path: '/tcf/ee',
    disabled: false
  }
]
</script>

<style scoped>
.tcf-page { display: flex; flex-direction: column; gap: 18px; }

.tcf-header { text-align: center; padding: 4px 8px 0; }
.tcf-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--title-color);
  margin-bottom: 6px;
}
.tcf-sub {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
  max-width: 580px;
  margin: 0 auto;
}

.tcf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.tcf-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
  outline: none;
  position: relative;
  overflow: hidden;
}
.tcf-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--accent);
  opacity: 0;
  transition: opacity 0.2s;
}
.tcf-card:hover,
.tcf-card:focus-visible {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: 0 8px 24px var(--shadow-md);
}
.tcf-card:hover::before,
.tcf-card:focus-visible::before { opacity: 1; }
.tcf-card.disabled {
  cursor: not-allowed;
  opacity: 0.62;
}
.tcf-card.disabled:hover { transform: none; box-shadow: none; }

.tcf-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tcf-card-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border-radius: 12px;
  font-size: 22px;
}
.tcf-card-tag {
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent);
}
.tcf-card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.tcf-card-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
  flex: 1;
}
.tcf-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  color: var(--text-faint);
}
.meta-item {
  background: var(--surface-alt);
  padding: 3px 8px;
  border-radius: 8px;
}
.tcf-card-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-top: 4px;
}
</style>
