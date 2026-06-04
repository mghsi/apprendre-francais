// TCF Canada – Expression Orale (EO)
// 3 tâches, ~12 minutes au total.
//   Tâche 1 : entretien dirigé, 1'30 de parole (pas de préparation).
//   Tâche 2 : échange d'informations, 2'00 de parole (pas de préparation).
//   Tâche 3 : expression d'une opinion, 2'00 préparation + 5'00 parole.
//
// Sources publiques : tcf-canada.ca, France Éducation international.

export const eoTasks = [
  {
    id: 1,
    name: 'Tâche 1',
    type: "Entretien dirigé",
    prepSeconds: 0,
    speakSeconds: 90, // 1'30
    description:
      "Présentez-vous et parlez de vous (famille, études, profession, projets, loisirs). Réponses naturelles à une série de questions courtes.",
    prompts: [
      {
        title: "Présentation personnelle",
        text: "Pouvez-vous vous présenter ? Parlez de votre famille, de vos études ou de votre travail, et de ce que vous aimez faire pendant votre temps libre."
      },
      {
        title: "Projets et motivations",
        text: "Pourquoi apprenez-vous le français ? Quels sont vos projets pour les prochaines années ?"
      },
      {
        title: "Votre quotidien",
        text: "Décrivez une journée typique de votre semaine. Qu'est-ce que vous appréciez le plus dans votre routine ?"
      }
    ],
    structures: [
      {
        name: "Pyramide personnelle",
        description: "On part du général (identité) vers le particulier (projets).",
        steps: [
          { label: "Identité", hint: "Prénom, âge, origine, lieu actuel.", seconds: 15 },
          { label: "Études / Travail", hint: "Ce que vous faites aujourd'hui, depuis quand.", seconds: 25 },
          { label: "Famille / Quotidien", hint: "Avec qui vous vivez, votre rythme habituel.", seconds: 25 },
          { label: "Projets / Loisirs", hint: "Ce qui vous anime, vos envies pour la suite.", seconds: 25 }
        ]
      },
      {
        name: "Du présent au futur",
        description: "Récit chronologique en trois temps : qui je suis, ce que je fais, où je vais.",
        steps: [
          { label: "Qui je suis", hint: "Origine, parcours en une phrase.", seconds: 20 },
          { label: "Ce que je fais aujourd'hui", hint: "Travail / études, contexte, ce qui vous plaît.", seconds: 35 },
          { label: "Où je veux aller", hint: "Projet à court terme + ambition à long terme.", seconds: 35 }
        ]
      },
      {
        name: "Trois rôles",
        description: "Vous décrivez les trois rôles que vous tenez dans la vie.",
        steps: [
          { label: "Étudiant·e / Professionnel·le", hint: "Domaine, missions, ce que vous apprenez.", seconds: 30 },
          { label: "Membre de famille / d'une communauté", hint: "Avec qui, comment vous y contribuez.", seconds: 30 },
          { label: "Passionné·e", hint: "Loisir, sport, art qui vous définit.", seconds: 30 }
        ]
      }
    ]
  },
  {
    id: 2,
    name: 'Tâche 2',
    type: "Échange d'informations",
    prepSeconds: 0,
    speakSeconds: 120, // 2'00
    description:
      "À partir d'une situation, posez ~5 questions à l'examinateur(trice) pour obtenir des informations précises. Variez les structures interrogatives.",
    prompts: [
      {
        title: "Inscription à un cours",
        text: "Vous souhaitez vous inscrire à un cours de cuisine dans une association. Vous appelez le secrétariat. Posez toutes les questions utiles pour vous inscrire."
      },
      {
        title: "Location d'un appartement",
        text: "Vous voulez louer un appartement meublé pour six mois. Vous rencontrez le propriétaire. Posez-lui les questions nécessaires avant de prendre une décision."
      },
      {
        title: "Voyage organisé",
        text: "Vous envisagez de participer à un voyage organisé au Québec. Vous appelez l'agence. Posez les questions indispensables avant de réserver."
      }
    ],
    structures: [
      {
        name: "Les 5 questions essentielles (QQQOC)",
        description: "Une question pour chacune des dimensions Quoi / Qui / Quand / Où / Combien.",
        steps: [
          { label: "Q1 — Quoi", hint: "« En quoi consiste exactement… ? » Détails de la prestation.", seconds: 20 },
          { label: "Q2 — Qui", hint: "« À qui s'adresse… ? » Public, encadrement.", seconds: 20 },
          { label: "Q3 — Quand", hint: "« Quels sont les horaires / dates… ? »", seconds: 20 },
          { label: "Q4 — Où", hint: "« Où cela se déroule-t-il ? »", seconds: 20 },
          { label: "Q5 — Combien", hint: "« Combien cela coûte-t-il ? Y a-t-il des frais cachés ? »", seconds: 40 }
        ]
      },
      {
        name: "Chronologique (avant / pendant / après)",
        description: "Vos questions suivent le déroulement de la situation.",
        steps: [
          { label: "Avant — Inscription", hint: "Conditions d'accès, documents requis, délais.", seconds: 30 },
          { label: "Pendant — Déroulement", hint: "Programme, encadrement, matériel fourni.", seconds: 45 },
          { label: "Pendant — Modalités pratiques", hint: "Horaires, fréquence, langue, sécurité.", seconds: 30 },
          { label: "Après — Suite & engagement", hint: "Annulation, remboursement, suite possible.", seconds: 15 }
        ]
      },
      {
        name: "Variété des structures interrogatives",
        description: "Une question par type pour montrer la maîtrise grammaticale.",
        steps: [
          { label: "Inversion soutenue", hint: "« Pourriez-vous me dire… ? » / « Quels sont… ? »", seconds: 25 },
          { label: "Est-ce que…", hint: "Forme standard, polie : « Est-ce qu'il est possible de… ? »", seconds: 20 },
          { label: "Qu'est-ce que / Qu'est-ce qui", hint: "« Qu'est-ce qui est inclus dans le tarif ? »", seconds: 25 },
          { label: "Question avec préposition", hint: "« Avec qui… ? », « À partir de quand… ? »", seconds: 25 },
          { label: "Question indirecte", hint: "« Je voudrais savoir si / comment / pourquoi… »", seconds: 25 }
        ]
      }
    ]
  },
  {
    id: 3,
    name: 'Tâche 3',
    type: "Expression d'une opinion",
    prepSeconds: 120, // 2'00 de préparation
    speakSeconds: 300, // 5'00 de parole
    description:
      "À partir d'un document court, dégagez le thème, exprimez et défendez votre opinion avec des arguments structurés. Vous disposez de 2 minutes de préparation puis 5 minutes pour parler.",
    prompts: [
      {
        title: "Le télétravail",
        text: "Vous lisez ce témoignage :\n\n« Depuis que je travaille à la maison, je gagne deux heures de transport par jour mais je me sens isolée et j'ai du mal à séparer ma vie professionnelle de ma vie privée. »\n\nQue pensez-vous du télétravail ? Donnez votre opinion en l'illustrant par des exemples."
      },
      {
        title: "L'usage des écrans chez les jeunes",
        text: "Dans un magazine, vous lisez :\n\n« Les adolescents passent en moyenne plus de 5 heures par jour devant un écran. Certains parents demandent l'interdiction des smartphones avant 15 ans. »\n\nQu'en pensez-vous ? Argumentez votre point de vue."
      },
      {
        title: "Acheter local",
        text: "Vous lisez :\n\n« De plus en plus de consommateurs choisissent d'acheter des produits locaux, même s'ils sont plus chers, au nom de l'environnement et du soutien aux producteurs régionaux. »\n\nPartagez-vous cette démarche ? Donnez vos arguments."
      }
    ],
    structures: [
      {
        name: "Plan dialectique (thèse / antithèse / synthèse)",
        description: "Le grand classique : on expose les deux camps puis on tranche.",
        steps: [
          {
            label: "Introduction", seconds: 30,
            hint: "Présentez le thème, reformulez la problématique, annoncez votre plan.",
            templates: [
              "De nos jours, [thème] suscite de vifs débats / occupe une place centrale.",
              "On peut alors se demander si [reformulation de la problématique].",
              "Pour répondre à cette question, nous examinerons d'abord [thèse], puis [antithèse], avant de prendre position."
            ]
          },
          {
            label: "Thèse — arguments pour", seconds: 90,
            hint: "« Certes… », deux arguments + un exemple concret.",
            templates: [
              "Certes, il est indéniable que [argument favorable n°1].",
              "En effet, [développement / mécanisme].",
              "Par ailleurs, on peut souligner que [argument favorable n°2].",
              "À titre d'illustration, [exemple concret]."
            ]
          },
          {
            label: "Antithèse — arguments contre", seconds: 90,
            hint: "« Cependant / Toutefois… », deux arguments + un exemple.",
            templates: [
              "Cependant / Toutefois, cette position mérite d'être nuancée.",
              "D'une part, [argument défavorable n°1].",
              "D'autre part, [argument défavorable n°2], comme en témoigne [exemple]."
            ]
          },
          {
            label: "Synthèse — votre position", seconds: 75,
            hint: "« Pour ma part… », nuancez et justifiez.",
            templates: [
              "Pour ma part, je considère que [votre position nuancée].",
              "En effet, si [reconnaissance d'un point], il reste que [argument décisif].",
              "C'est pourquoi [conclusion personnelle]."
            ]
          },
          {
            label: "Conclusion ouverte", seconds: 15,
            hint: "Élargissez : conséquence à long terme ou question ouverte.",
            templates: [
              "En définitive, [reformulation de votre position].",
              "Reste à savoir si [question ouverte vers un sujet connexe]."
            ]
          }
        ]
      },
      {
        name: "Plan analytique (constat / causes / conséquences / solutions)",
        description: "Idéal pour les sujets de société : on analyse le phénomène avant de se positionner.",
        steps: [
          {
            label: "Introduction", seconds: 30,
            hint: "Accroche + reformulation + annonce du plan.",
            templates: [
              "Force est de constater que [phénomène] prend de l'ampleur ces dernières années.",
              "La question qui se pose est de savoir [reformulation].",
              "Nous étudierons d'abord les causes, puis les conséquences, avant d'évoquer des pistes de solution."
            ]
          },
          {
            label: "Constat", seconds: 60,
            hint: "Décrivez la réalité (chiffres, témoignages, exemples).",
            templates: [
              "Aujourd'hui, on observe que [description du phénomène].",
              "Selon [source / étude / observation], [donnée / chiffre / fait]."
            ]
          },
          {
            label: "Causes", seconds: 75,
            hint: "« Cela s'explique par… », deux causes principales.",
            templates: [
              "Cela s'explique d'abord par [cause n°1].",
              "Ensuite, [cause n°2] joue également un rôle déterminant.",
              "C'est notamment le cas de / dans [exemple précis]."
            ]
          },
          {
            label: "Conséquences", seconds: 75,
            hint: "« Il en résulte que… », positives et/ou négatives.",
            templates: [
              "Il en résulte que [conséquence directe].",
              "Sur le plan [social / économique / personnel], [conséquence indirecte].",
              "À long terme, [projection / risque / bénéfice]."
            ]
          },
          {
            label: "Solutions & votre position", seconds: 45,
            hint: "« À mon sens… », pistes et engagement personnel.",
            templates: [
              "Plusieurs solutions peuvent être envisagées, à commencer par [piste n°1].",
              "À mon sens, il serait souhaitable de [position personnelle]."
            ]
          },
          {
            label: "Conclusion", seconds: 15,
            hint: "Bilan en une phrase + ouverture.",
            templates: [
              "En somme, [bilan en une phrase], et il appartient à chacun de [appel à l'action / ouverture]."
            ]
          }
        ]
      },
      {
        name: "Concession nuancée (« Oui, mais… »)",
        description: "Reconnaître la position adverse pour mieux défendre la sienne.",
        steps: [
          {
            label: "Introduction", seconds: 30,
            hint: "Posez le débat sans annoncer trop vite votre opinion.",
            templates: [
              "La question de [thème] divise depuis longtemps l'opinion publique.",
              "Faut-il / Doit-on [reformulation] ? La réponse n'est pas évidente."
            ]
          },
          {
            label: "Reconnaissance — « Il est vrai que… »", seconds: 60,
            hint: "Donnez crédit à la position opposée, un argument fort.",
            templates: [
              "Il est vrai que [argument adverse pertinent].",
              "On comprend dès lors pourquoi certains défendent [position adverse]."
            ]
          },
          {
            label: "Réfutation — « Néanmoins / Cela dit… »", seconds: 90,
            hint: "Pointez ses limites avec deux contre-arguments.",
            templates: [
              "Néanmoins / Cela dit, cette vision ne tient pas compte de [limite n°1].",
              "De plus, [limite n°2 / nuance importante].",
              "Cela est manifeste lorsque l'on observe [exemple concret]."
            ]
          },
          {
            label: "Votre opinion défendue", seconds: 90,
            hint: "Trois arguments hiérarchisés, un exemple personnel.",
            templates: [
              "C'est pourquoi je suis convaincu(e) que [votre position].",
              "Premièrement, [argument n°1]. Deuxièmement, [argument n°2]. Enfin, [argument n°3].",
              "À titre personnel, [anecdote courte qui illustre votre point]."
            ]
          },
          {
            label: "Ouverture", seconds: 30,
            hint: "Élargissez vers une question plus large ou un parallèle.",
            templates: [
              "En définitive, [reformulation].",
              "Une réflexion similaire pourrait d'ailleurs s'appliquer à [parallèle]."
            ]
          }
        ]
      },
      {
        name: "Plan thématique (3 angles)",
        description: "Vous traitez le sujet sous 3 angles complémentaires (social / éco / personnel, ou autres).",
        steps: [
          {
            label: "Introduction", seconds: 30,
            hint: "Cadre + annonce des 3 angles d'analyse.",
            templates: [
              "[Thème] est un sujet qui mérite d'être analysé sous plusieurs angles.",
              "Je l'aborderai successivement sous l'angle social, économique, puis personnel."
            ]
          },
          {
            label: "Angle 1 — Social / collectif", seconds: 75,
            hint: "Impact sur la société, la communauté.",
            templates: [
              "D'un point de vue social, [argument lié à la collectivité].",
              "On constate notamment que [exemple sociétal]."
            ]
          },
          {
            label: "Angle 2 — Économique / pratique", seconds: 75,
            hint: "Coût, faisabilité, gains concrets.",
            templates: [
              "Sur le plan économique, [argument lié au coût / à la faisabilité].",
              "En termes pratiques, [conséquence concrète]."
            ]
          },
          {
            label: "Angle 3 — Personnel / éthique", seconds: 75,
            hint: "Votre expérience, vos valeurs.",
            templates: [
              "Enfin, à titre personnel, [valeur ou expérience qui vous touche].",
              "Cela rejoint la question éthique de [valeur engagée]."
            ]
          },
          {
            label: "Conclusion — synthèse", seconds: 45,
            hint: "Votre position finale, qui découle des 3 angles.",
            templates: [
              "En définitive, ces trois angles convergent vers une même conclusion : [votre position].",
              "Il me semble donc essentiel de [recommandation / appel]."
            ]
          }
        ]
      },
      {
        name: "PROC (Problème / Raisons / Opinion / Conclusion)",
        description: "Format court et direct, parfait quand on manque d'idées.",
        steps: [
          {
            label: "Problème", seconds: 45,
            hint: "Reformulez la question en problème clair.",
            templates: [
              "Le document soulève une question fondamentale : [reformulation en problème].",
              "Ce sujet est d'autant plus sensible que [enjeu sous-jacent]."
            ]
          },
          {
            label: "Raisons / Analyse", seconds: 90,
            hint: "Pourquoi est-ce un sujet sensible ? 2-3 raisons.",
            templates: [
              "Plusieurs raisons expliquent ce débat. Tout d'abord, [raison n°1].",
              "Ensuite, [raison n°2].",
              "Enfin, [raison n°3 — facultatif]."
            ]
          },
          {
            label: "Opinion argumentée", seconds: 135,
            hint: "Votre position + 3 arguments + 1 exemple personnel.",
            templates: [
              "Personnellement, je pense que [votre position claire].",
              "D'abord, [argument n°1]. Par ailleurs, [argument n°2]. Enfin, [argument n°3].",
              "Mon propre vécu confirme ce point de vue : [anecdote courte]."
            ]
          },
          {
            label: "Conclusion", seconds: 30,
            hint: "Récapitulez en une phrase, terminez sur une ouverture.",
            templates: [
              "Pour conclure, [bilan en une phrase], et il serait intéressant de se demander [ouverture]."
            ]
          }
        ]
      },
      {
        name: "5 paragraphes guidés (B2+) — phrases-modèles",
        description: "Structure académique en 5 blocs avec des phrases-types prêtes à réutiliser. Idéal pour avoir un fil clair et placer les bons connecteurs.",
        steps: [
          {
            label: "Introduction — contexte, sujet, opinion",
            hint: "Plantez le décor (1 phrase), reformulez le sujet (1 phrase), annoncez votre opinion (1 phrase).",
            seconds: 30,
            templates: [
              "Aujourd'hui, [contexte / phénomène] s'est largement développé(e) / est au cœur des débats.",
              "Ce sujet consiste à analyser si / dans quelle mesure [reformulation de la question].",
              "À mon avis, [position] présente des avantages importants, mais [nuance / condition]."
            ]
          },
          {
            label: "Paragraphe 1 — Argument + exemple + mini-conclusion",
            hint: "Idée principale → soutien → exemple concret → phrase de clôture qui ouvre vers la suite.",
            seconds: 75,
            templates: [
              "Pour commencer, il convient de souligner que [argument n°1].",
              "À titre d'exemple, [exemple concret / chiffre / cas].",
              "[Phrase qui développe la conséquence ou le mécanisme].",
              "Ainsi, il est conseillé de [recommandation ou nuance qui prépare l'argument suivant]."
            ]
          },
          {
            label: "Paragraphe 2 — Argument + exemple + mini-conclusion",
            hint: "Connecteur d'ajout fort, deuxième angle, exemple, phrase de clôture.",
            seconds: 75,
            templates: [
              "De surcroît, il est nécessaire de ne pas négliger que [argument n°2].",
              "[Développement : mécanisme, cause, effet].",
              "Par exemple, [exemple concret / témoignage].",
              "Par conséquent, il serait préférable de [recommandation]."
            ]
          },
          {
            label: "Paragraphe 3 — Argument personnel + exemple + mini-conclusion",
            hint: "Connecteur de clôture, troisième argument, illustration vécue (ancrage personnel).",
            seconds: 75,
            templates: [
              "Enfin, il mérite d'être mentionné que [argument n°3].",
              "D'après mon expérience personnelle, [anecdote courte qui illustre l'argument].",
              "Cela m'a permis de [résultat / bénéfice constaté].",
              "En conséquence, il serait recommandé de [recommandation finale]."
            ]
          },
          {
            label: "Conclusion — reformulation, opinion, synthèse des 3 points",
            hint: "Rappelez le sujet, redites votre opinion, énumérez vos 3 arguments en une phrase et terminez sur une nuance ou une ouverture.",
            seconds: 45,
            templates: [
              "En conclusion, [reformulation du phénomène] représente une évolution / un enjeu majeur.",
              "Je pense que [opinion globale], car cela [point 1], [point 2] et [point 3].",
              "[…tout en nécessitant un encadrement adapté / une vigilance / une réflexion collective]."
            ]
          }
        ]
      }
    ]
  }
]
