// Local, newly authored training content. It is not official exam material.
const source = { kind: 'editorial-derivative', sourceRef: 'local-tcf-pilot', license: 'local-training-only', reviewedAt: '2026-08-09' }

const prompt = (task, slug, title, text, themes, expectedCoverage, extra = {}) => ({
  id: `eo-t${task}-${slug}`, skill: 'eo', task, version: 1, status: 'reviewed', title, text,
  themes, difficulty: 'intermediate', objectives: task === 2 ? ['question-variety', 'coverage', 'follow-up'] : ['coherence', 'development', 'examples'],
  expectedCoverage, source: { ...source }, ...extra
})

const t1 = [
  prompt(1, 'identity-001', 'Présentation personnelle', 'Présentez-vous et parlez de votre parcours, de votre situation actuelle et de vos loisirs.', ['society'], ['identity', 'present-situation', 'interests']),
  prompt(1, 'plans-001', 'Projets et motivations', 'Pourquoi apprenez-vous le français et quels projets souhaitez-vous réaliser dans les prochaines années ?', ['education', 'life-in-canada'], ['motivation', 'future-plans', 'reasons']),
  prompt(1, 'routine-001', 'Votre quotidien', "Décrivez une journée habituelle et expliquez ce que vous appréciez dans votre rythme de vie.", ['society', 'health'], ['routine', 'preferences', 'example'])
]

const t2Data = [
  ['housing-apartment-001', 'Un appartement meublé', 'Vous visitez un appartement meublé. Interrogez la propriétaire avant de décider.', ['housing'], ['rent', 'availability', 'utilities', 'rules', 'transport'], 'personne intéressée', 'propriétaire', 'formal'],
  ['housing-roommate-002', 'Une chambre en colocation', 'Un ami cherche une personne pour sa colocation. Demandez-lui les détails utiles.', ['housing'], ['price', 'room', 'shared-spaces', 'rules', 'move-in'], 'personne intéressée', 'ami déjà locataire', 'informal'],
  ['housing-neighbourhood-003', 'Choisir un quartier', 'Une agente municipale vous renseigne sur un quartier où vous envisagez de vivre.', ['housing', 'life-in-canada'], ['transport', 'services', 'safety', 'shops'], 'nouvel arrivant', 'agente municipale', 'formal'],
  ['travel-tour-001', 'Circuit dans les Maritimes', 'Vous appelez une agence au sujet d’un circuit dans les provinces maritimes.', ['travel'], ['dates', 'price', 'itinerary', 'accommodation', 'cancellation'], 'cliente potentielle', 'conseillère de voyage', 'formal'],
  ['travel-cabin-002', 'Séjour dans un chalet', 'Un ami a loué un chalet et vous propose de venir. Demandez les renseignements pratiques.', ['travel'], ['location', 'transport', 'equipment', 'cost', 'activities'], 'ami invité', 'organisateur du séjour', 'informal'],
  ['travel-bike-003', 'Location de vélo', 'Vous vous renseignez auprès d’un commerce sur la location d’un vélo pour deux jours.', ['travel', 'services'], ['price', 'deposit', 'equipment', 'return', 'insurance'], 'touriste', 'employée du magasin', 'formal'],
  ['course-cooking-001', 'Atelier de cuisine', 'Vous téléphonez à un centre communautaire pour vous inscrire à un atelier de cuisine.', ['education', 'culture'], ['schedule', 'level', 'price', 'equipment', 'registration'], 'future participante', 'secrétaire', 'formal'],
  ['course-language-002', 'Groupe de conversation', 'Une collègue participe à un groupe de conversation française. Demandez comment le rejoindre.', ['education'], ['level', 'frequency', 'location', 'activities', 'registration'], 'collègue intéressé', 'participante', 'informal'],
  ['course-sports-003', 'Club de canot', 'Vous contactez un club de canot pour découvrir ses activités.', ['culture', 'health'], ['schedule', 'membership', 'equipment', 'safety', 'level'], 'future membre', 'responsable du club', 'formal'],
  ['work-training-001', 'Formation professionnelle', 'Votre responsable propose une formation. Posez-lui des questions avant de vous inscrire.', ['work', 'education'], ['content', 'schedule', 'cost', 'recognition', 'workload'], 'salarié', 'responsable', 'neutral'],
  ['work-job-002', 'Offre d’emploi', 'Vous appelez une entreprise au sujet d’une offre d’emploi récemment publiée.', ['work'], ['duties', 'schedule', 'salary', 'requirements', 'application'], 'candidat', 'recruteuse', 'formal'],
  ['work-volunteer-003', 'Bénévolat au bureau', 'Une collègue organise une journée de bénévolat. Demandez-lui comment participer.', ['work', 'community'], ['date', 'tasks', 'transport', 'equipment', 'registration'], 'collègue volontaire', 'organisatrice', 'informal'],
  ['service-bus-001', 'Abonnement de transport', 'Vous demandez au service de transport quel abonnement correspond à vos déplacements.', ['services', 'transport'], ['zones', 'price', 'validity', 'purchase', 'replacement'], 'usager', 'agente du service', 'formal'],
  ['service-library-002', 'Services de la bibliothèque', 'Vous venez d’arriver dans la ville et téléphonez à la bibliothèque.', ['services', 'community'], ['membership', 'hours', 'loans', 'activities', 'digital-services'], 'nouveau résident', 'bibliothécaire', 'formal'],
  ['family-daycare-001', 'Une place en garderie', 'Vous contactez une garderie pour connaître ses conditions d’accueil.', ['family', 'services'], ['availability', 'hours', 'fees', 'meals', 'adaptation'], 'parent', 'direction de garderie', 'formal'],
  ['family-pet-002', 'Garde d’un chien', 'Votre voisin peut garder votre chien pendant un week-end. Organisez les détails avec lui.', ['family', 'animals'], ['dates', 'food', 'walks', 'health', 'emergency'], 'propriétaire du chien', 'voisin', 'informal'],
  ['event-festival-001', 'Festival de quartier', 'Vous contactez l’organisation d’un festival pour préparer votre visite.', ['events', 'culture'], ['program', 'tickets', 'access', 'food', 'weather-policy'], 'visiteur', 'bénévole du festival', 'formal'],
  ['event-birthday-002', 'Fête surprise', 'Un ami prépare une fête surprise. Posez-lui des questions pour pouvoir l’aider.', ['events', 'family'], ['time', 'place', 'guests', 'food', 'tasks'], 'ami participant', 'organisateur', 'informal'],
  ['canada-health-001', 'Trouver une clinique', 'Un conseiller d’accueil vous explique les services de santé de votre nouvelle ville.', ['life-in-canada', 'health'], ['registration', 'appointment', 'documents', 'cost', 'emergency'], 'nouvel arrivant', 'conseiller d’accueil', 'formal'],
  ['canada-settlement-002', 'Atelier d’installation', 'Vous appelez un organisme d’aide aux nouveaux arrivants au sujet de ses ateliers.', ['life-in-canada', 'community'], ['topics', 'schedule', 'language', 'cost', 'registration'], 'nouvelle arrivante', 'conseillère', 'formal']
]

const t2 = t2Data.map(([slug, title, text, themes, coverage, learner, interlocutor, register]) =>
  prompt(2, slug, title, text, themes, coverage, {
    roles: { learner, interlocutor }, register,
    hints: { categories: coverage.slice(0, 4), phrases: ['Pourriez-vous me préciser… ?', 'Est-ce que… ?', 'Et concernant… ?'] }
  }))

const t3Data = [
  ['immigration-integration-001', 'S’intégrer dans un nouveau pays', 'Les nouveaux arrivants doivent-ils adopter rapidement toutes les habitudes du pays d’accueil ?', ['immigration', 'life-in-canada'], ['identity', 'belonging', 'mutual-adaptation']],
  ['immigration-language-002', 'Langue et installation', 'La maîtrise de la langue locale est-elle la condition principale d’une intégration réussie ?', ['immigration', 'education'], ['access', 'employment', 'social-links']],
  ['technology-remote-001', 'Le télétravail', 'Le télétravail devrait-il devenir la forme de travail privilégiée quand le métier le permet ?', ['technology', 'work'], ['flexibility', 'isolation', 'productivity']],
  ['technology-screens-002', 'Les écrans chez les jeunes', 'Faut-il fixer par la loi un âge minimum pour utiliser les réseaux sociaux ?', ['technology', 'family'], ['protection', 'autonomy', 'enforcement']],
  ['education-homework-001', 'Les devoirs à la maison', 'Les devoirs après l’école sont-ils indispensables pour apprendre efficacement ?', ['education'], ['learning', 'inequality', 'family-time']],
  ['education-online-002', 'Étudier à distance', 'Un cours en ligne peut-il remplacer durablement un cours en classe ?', ['education', 'technology'], ['access', 'interaction', 'autonomy']],
  ['society-fourday-001', 'La semaine de quatre jours', 'Une semaine de travail plus courte améliorerait-elle vraiment la vie collective ?', ['society', 'work'], ['well-being', 'services', 'productivity']],
  ['society-consumption-002', 'Vivre avec moins', 'La réduction volontaire de la consommation est-elle réaliste pour la majorité des personnes ?', ['society', 'lifestyle'], ['budget', 'values', 'inequality']],
  ['health-prevention-001', 'Prévenir plutôt que guérir', 'Les pouvoirs publics devraient-ils davantage récompenser les habitudes favorables à la santé ?', ['health'], ['responsibility', 'privacy', 'public-cost']],
  ['health-food-002', 'Mieux informer sur les aliments', 'Un étiquetage nutritionnel très simple suffit-il à améliorer les choix alimentaires ?', ['health'], ['information', 'price', 'habits']],
  ['environment-local-001', 'Acheter local', 'Faut-il privilégier les produits locaux même lorsqu’ils coûtent plus cher ?', ['environment'], ['emissions', 'local-economy', 'affordability']],
  ['environment-city-002', 'La voiture en centre-ville', 'Les centres-villes devraient-ils réserver davantage d’espace aux transports collectifs et actifs ?', ['environment', 'transport'], ['pollution', 'accessibility', 'businesses']]
]
const t3 = t3Data.map(([slug, title, text, themes, coverage]) => prompt(3, slug, title, text, themes, coverage, {
  hints: { argumentCategories: ['avantages', 'limites', 'personnes concernées', 'exemple concret', 'solution nuancée'] }
}))

const structures = {
  1: [{ name: 'Passé, présent, futur', description: 'Reliez votre parcours, votre situation et vos projets.', steps: [{ label: 'Parcours', hint: 'Un fait et un exemple.', seconds: 40 }, { label: 'Présent et projets', hint: 'Situation, motivation et avenir.', seconds: 80 }] }],
  2: [{ name: 'Préparation puis interaction', description: 'Les 120 premières secondes servent à noter des catégories; les 210 suivantes à interagir.', steps: [{ label: 'Préparation officielle', hint: 'Notez des mots-clés, pas un texte.', seconds: 120 }, { label: 'Questions et relances', hint: 'Couvrez les catégories et rebondissez sur les réponses.', seconds: 210 }] }],
  3: [{ name: 'Opinion spontanée en 4 min 30', description: 'Aucune préparation officielle : prenez position, développez et concluez.', steps: [{ label: 'Position et enjeux', hint: 'Reformulez puis annoncez votre avis.', seconds: 45 }, { label: 'Arguments, nuance et exemples', hint: 'Développez deux angles et considérez une objection.', seconds: 180 }, { label: 'Conclusion', hint: 'Résumez votre position.', seconds: 45 }] }]
}

export const eoTasks = [
  { id: 1, name: 'Tâche 1', type: 'Entretien dirigé', prepSeconds: 0, speakSeconds: 120, description: 'Répondez spontanément aux questions de l’examinateur sur vous-même.', prompts: t1, structures: structures[1] },
  { id: 2, name: 'Tâche 2', type: "Échange d'informations", prepSeconds: 120, speakSeconds: 210, totalSeconds: 330, description: 'Après 2 minutes de préparation, obtenez des informations dans une situation quotidienne en respectant les rôles.', prompts: t2, structures: structures[2] },
  { id: 3, name: 'Tâche 3', type: "Expression d'une opinion", prepSeconds: 0, speakSeconds: 270, description: 'Exprimez spontanément et défendez un point de vue pendant 4 minutes 30, sans préparation officielle.', prompts: t3, structures: structures[3] }
]

export function validateSpeakingPrompts(tasks = eoTasks) {
  const ids = new Set()
  for (const task of tasks) for (const item of task.prompts) {
    if (ids.has(item.id)) throw new Error(`Duplicate EO prompt id: ${item.id}`)
    ids.add(item.id)
    const required = ['id', 'version', 'status', 'themes', 'difficulty', 'objectives', 'expectedCoverage', 'source']
    if (required.some(key => item[key] == null || (Array.isArray(item[key]) && !item[key].length))) throw new Error(`Missing EO metadata: ${item.id}`)
    if (item.status !== 'reviewed') throw new Error(`Unreviewed EO prompt: ${item.id}`)
    if (!item.source.kind || !item.source.sourceRef || !item.source.license || !item.source.reviewedAt) throw new Error(`Missing EO source metadata: ${item.id}`)
    if (task.id === 2 && (!item.roles?.learner || !item.roles?.interlocutor)) throw new Error(`Missing EO T2 roles: ${item.id}`)
  }
  return true
}

validateSpeakingPrompts()
