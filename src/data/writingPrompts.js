// TCF Canada – Expression Écrite
// 3 tâches, 60 minutes au total. Chaque tâche a une consigne et des limites de mots.
// Sources : tcf-canada.ca / France Éducation international (publiquement décrites).

export const tcfTasks = [
  {
    id: 1,
    name: 'Tâche 1',
    type: 'Message / e-mail',
    minWords: 60,
    maxWords: 120,
    description:
      "Rédigez un message, un mail ou une annonce pour décrire, raconter et/ou expliquer, à un ou plusieurs destinataires précisés dans la consigne.",
    prompts: [
      {
        title: "Vacances chez un ami",
        text: "Vous allez passer une semaine à Paris le mois prochain. Écrivez un mail à votre ami(e) Ayoub qui habite là-bas. Annoncez-lui votre venue, donnez les dates, expliquez ce que vous aimeriez faire et demandez-lui de vous suggérer des activités."
      },
      {
        title: "Annulation d'un cours",
        text: "Vous êtes inscrit(e) à un cours du soir mais vous ne pouvez plus y aller. Écrivez un mail à votre professeur(e) pour expliquer les raisons de votre absence et proposer une solution."
      },
      {
        title: "Petite annonce",
        text: "Vous cherchez une colocation dans votre nouvelle ville. Rédigez une annonce à publier sur un site spécialisé : présentez-vous, précisez ce que vous cherchez, votre budget et votre date d'emménagement."
      }
    ]
  },
  {
    id: 2,
    name: 'Tâche 2',
    type: 'Article de blog / forum',
    minWords: 120,
    maxWords: 150,
    description:
      "Rédigez un article de blog ou de forum à l'intention de plusieurs destinataires : un compte rendu d'expérience ou un récit, accompagné de commentaires, d'opinions ou d'arguments.",
    prompts: [
      {
        title: "Un métier qui vous passionne",
        text: "Sur un blog destiné aux jeunes, rédigez un article sur un métier qui vous passionne. Présentez ce métier, racontez votre expérience ou vos rencontres avec ce milieu et donnez envie aux lecteurs de s'y intéresser."
      },
      {
        title: "Un voyage marquant",
        text: "Sur le forum d'un site de voyage, racontez un voyage qui vous a particulièrement marqué(e). Décrivez l'endroit, ce que vous avez vécu et donnez vos recommandations à ceux qui souhaiteraient s'y rendre."
      },
      {
        title: "Une activité sportive ou culturelle",
        text: "Sur un blog, partagez votre expérience d'une activité sportive ou culturelle que vous pratiquez régulièrement. Expliquez ce qu'elle vous apporte et pourquoi vous la conseilleriez."
      }
    ]
  },
  {
    id: 3,
    name: 'Tâche 3',
    type: 'Article comparatif',
    minWords: 120,
    maxWords: 180,
    description:
      "Rédigez un article (journal, site Internet, etc.) qui (1) compare les deux points de vue exprimés dans les documents ci-dessous (40–60 mots), puis (2) donne et argumente votre propre opinion (80–120 mots).",
    prompts: [
      {
        title: "Internet et les enfants",
        text: "Vous lisez les deux opinions suivantes sur un forum :\n\nDocument A : « Internet rend les enfants paresseux et improductifs : ils ne lisent plus, ne jouent plus dehors et perdent leur capacité de concentration. »\n\nDocument B : « Internet est au contraire un formidable outil de connaissance et de créativité, à condition que les parents accompagnent les enfants. »\n\nRédigez un court article qui résume les deux points de vue puis donne le vôtre."
      },
      {
        title: "Télétravail",
        text: "Document A : « Le télétravail améliore la qualité de vie : moins de transport, plus de temps en famille, meilleure concentration. »\n\nDocument B : « Le télétravail isole les salariés, brouille la frontière entre vie privée et travail et nuit à l'esprit d'équipe. »\n\nRédigez un court article qui compare les deux points de vue, puis exprimez votre opinion argumentée."
      },
      {
        title: "Voiture en ville",
        text: "Document A : « Il faut interdire la voiture individuelle dans les centres-villes pour réduire la pollution et redonner l'espace aux piétons. »\n\nDocument B : « Interdire la voiture pénalise les familles, les commerçants et les personnes à mobilité réduite ; il faut plutôt accompagner la transition. »\n\nRédigez un court article qui compare les deux opinions, puis donnez et argumentez la vôtre."
      }
    ]
  }
]

// Caractères spéciaux français disponibles via le clavier virtuel
// (comme dans l'épreuve officielle TCF SO).
export const accentKeys = [
  'à', 'â', 'ä',
  'é', 'è', 'ê', 'ë',
  'î', 'ï',
  'ô', 'ö',
  'ù', 'û', 'ü',
  'ç',
  'œ', 'æ',
  '«', '»',
  '–', '…'
]
