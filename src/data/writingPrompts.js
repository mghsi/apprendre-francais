// Local, newly authored training content. It is not official exam material.
const source = { kind: 'editorial-derivative', sourceRef: 'local-tcf-pilot', license: 'local-training-only', reviewedAt: '2026-08-09' }
const prompt = (task, slug, title, text, themes, expectedCoverage, extra = {}) => ({
  id: `ee-t${task}-${slug}`, skill: 'ee', task, version: 1, status: 'reviewed', title, text,
  themes, difficulty: 'intermediate', objectives: task === 3 ? ['reformulation', 'comparison', 'argumentation'] : ['task-fulfillment', 'coherence', 'register'],
  expectedCoverage, source: { ...source }, ...extra
})

const t1 = [
  prompt(1, 'travel-visit-001', 'Une visite chez un ami', 'Écrivez à un ami de Montréal : annoncez vos dates de visite, proposez deux activités et demandez une recommandation.', ['travel', 'life-in-canada'], ['recipient', 'dates', 'activities', 'request'], { register: 'informal', genre: 'email' }),
  prompt(1, 'course-absence-001', 'Absence à un cours', 'Écrivez à votre professeure pour expliquer une absence, demander le travail à rattraper et proposer un rendez-vous.', ['education'], ['reason', 'missed-work', 'solution'], { register: 'formal', genre: 'email' }),
  prompt(1, 'housing-room-001', 'Recherche de colocation', 'Publiez une annonce : présentez-vous, décrivez le logement recherché, indiquez votre budget et votre date d’arrivée.', ['housing'], ['profile', 'housing-needs', 'budget', 'move-in'], { register: 'neutral', genre: 'announcement' }),
  prompt(1, 'service-delivery-001', 'Un colis en retard', 'Écrivez au service clientèle : identifiez votre commande, décrivez le problème et demandez une solution précise.', ['services'], ['order', 'problem', 'requested-resolution'], { register: 'formal', genre: 'email' }),
  prompt(1, 'event-invitation-001', 'Invitation à un repas', 'Invitez vos voisins à un repas : précisez le lieu et l’heure, expliquez l’occasion et demandez une confirmation.', ['events', 'community'], ['occasion', 'place', 'time', 'reply'], { register: 'neutral', genre: 'message' })
]
const t2 = [
  prompt(2, 'work-discovery-001', 'Découvrir un métier', 'Pour un blog étudiant, racontez une rencontre professionnelle, expliquez ce que vous avez appris et conseillez cette découverte.', ['work', 'education'], ['experience', 'lesson', 'recommendation'], { register: 'neutral', genre: 'blog-post' }),
  prompt(2, 'travel-local-001', 'Un séjour près de chez vous', 'Sur un forum de voyage, racontez une escapade locale, décrivez un moment marquant et donnez des conseils pratiques.', ['travel', 'environment'], ['sequence', 'description', 'memorable-moment', 'advice'], { register: 'neutral', genre: 'forum-post' }),
  prompt(2, 'activity-volunteer-001', 'Une expérience bénévole', 'Rédigez un article sur une activité bénévole : racontez votre participation, son effet sur la communauté et vos recommandations.', ['community'], ['experience', 'community-impact', 'opinion', 'recommendation'], { register: 'neutral', genre: 'article' }),
  prompt(2, 'settlement-firstweek-001', 'Première semaine dans une nouvelle ville', 'Partagez avec de nouveaux arrivants votre première semaine, les difficultés rencontrées, les aides utiles et une leçon retenue.', ['life-in-canada', 'services'], ['chronology', 'challenge', 'support', 'lesson'], { register: 'neutral', genre: 'forum-post' }),
  prompt(2, 'health-routine-001', 'Changer une habitude', 'Sur un blog bien-être, racontez comment vous avez changé une habitude quotidienne, les obstacles rencontrés et les résultats observés.', ['health', 'lifestyle'], ['before-after', 'obstacles', 'results', 'advice'], { register: 'neutral', genre: 'blog-post' })
]

const paired = (slug, title, themes, a, b) => prompt(3, slug, title,
  `Document A : « ${a} »\n\nDocument B : « ${b} »\n\nComparez ces deux points de vue, puis donnez et justifiez votre opinion.`,
  themes, ['viewpoint-a', 'viewpoint-b', 'comparison', 'personal-position'], { register: 'neutral', genre: 'comparative-article', viewpoints: [{ id: 'a', text: a }, { id: 'b', text: b }] })
const t3 = [
  paired('technology-children-001', 'Internet et les jeunes', ['technology', 'family'], 'Les outils numériques développent la curiosité lorsqu’ils sont accompagnés.', 'Ils réduisent la concentration et prennent la place des activités hors ligne.'),
  paired('work-remote-001', 'Le travail à distance', ['work', 'technology'], 'Le travail à distance offre autonomie et temps libre grâce aux trajets évités.', 'Il fragilise les liens d’équipe et rend la déconnexion plus difficile.'),
  paired('environment-city-001', 'Les déplacements en ville', ['environment', 'transport'], 'Réduire la place de la voiture rend les centres plus calmes et moins pollués.', 'Des restrictions rapides compliquent la vie des familles et de certains travailleurs.'),
  paired('education-online-001', 'La formation en ligne', ['education', 'technology'], 'Les cours en ligne rendent la formation accessible malgré la distance et les horaires.', 'La classe reste essentielle pour échanger, persévérer et recevoir une aide immédiate.'),
  paired('health-food-001', 'Le prix des aliments sains', ['health', 'society'], 'Des aides publiques devraient rendre les aliments sains accessibles à tous.', 'L’éducation alimentaire et les choix individuels comptent davantage que les subventions.')
]

export const tcfTasks = [
  { id: 1, name: 'Tâche 1', type: 'Message / e-mail', minWords: 60, maxWords: 120, description: 'Rédigez un message pour décrire, raconter ou expliquer à un destinataire précisé.', prompts: t1 },
  { id: 2, name: 'Tâche 2', type: 'Article de blog / forum', minWords: 120, maxWords: 150, description: 'Racontez une expérience et accompagnez-la de commentaires, opinions ou recommandations.', prompts: t2 },
  { id: 3, name: 'Tâche 3', type: 'Article comparatif', minWords: 120, maxWords: 180, description: 'Comparez deux points de vue, puis donnez une opinion argumentée.', prompts: t3 }
]

export function validateWritingPrompts(tasks = tcfTasks) {
  const ids = new Set()
  for (const task of tasks) for (const item of task.prompts) {
    if (ids.has(item.id)) throw new Error(`Duplicate EE prompt id: ${item.id}`)
    ids.add(item.id)
    const required = ['id', 'version', 'status', 'themes', 'difficulty', 'objectives', 'expectedCoverage', 'source']
    if (required.some(key => item[key] == null || (Array.isArray(item[key]) && !item[key].length))) throw new Error(`Missing EE metadata: ${item.id}`)
    if (item.status !== 'reviewed') throw new Error(`Unreviewed EE prompt: ${item.id}`)
    if (!item.source.kind || !item.source.sourceRef || !item.source.license || !item.source.reviewedAt) throw new Error(`Missing EE source metadata: ${item.id}`)
    if (task.id === 3 && (item.viewpoints?.length !== 2 || !item.viewpoints.every(view => view.id && view.text) || item.viewpoints[0].text.trim() === item.viewpoints[1].text.trim())) throw new Error(`Malformed EE T3 viewpoints: ${item.id}`)
  }
  return true
}
validateWritingPrompts()

export const accentKeys = ['à', 'â', 'ä', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'ç', 'œ', 'æ', '«', '»', '–', '…']
