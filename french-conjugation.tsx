import { useState } from "react";

const verbs = {
  être: {
    groupe: "3e groupe",
    présent: ["suis","es","est","sommes","êtes","sont"],
    imparfait: ["étais","étais","était","étions","étiez","étaient"],
    futur: ["serai","seras","sera","serons","serez","seront"],
    conditionnel: ["serais","serais","serait","serions","seriez","seraient"],
    passé_composé: ["ai été","as été","a été","avons été","avez été","ont été"],
    subjonctif: ["sois","sois","soit","soyons","soyez","soient"],
    impératif: ["—","sois","—","soyons","soyez","—"],
  },
  avoir: {
    groupe: "3e groupe",
    présent: ["ai","as","a","avons","avez","ont"],
    imparfait: ["avais","avais","avait","avions","aviez","avaient"],
    futur: ["aurai","auras","aura","aurons","aurez","auront"],
    conditionnel: ["aurais","aurais","aurait","aurions","auriez","auraient"],
    passé_composé: ["ai eu","as eu","a eu","avons eu","avez eu","ont eu"],
    subjonctif: ["aie","aies","ait","ayons","ayez","aient"],
    impératif: ["—","aie","—","ayons","ayez","—"],
  },
  aller: {
    groupe: "3e groupe",
    présent: ["vais","vas","va","allons","allez","vont"],
    imparfait: ["allais","allais","allait","allions","alliez","allaient"],
    futur: ["irai","iras","ira","irons","irez","iront"],
    conditionnel: ["irais","irais","irait","irions","iriez","iraient"],
    passé_composé: ["suis allé(e)","es allé(e)","est allé(e)","sommes allé(e)s","êtes allé(e)(s)","sont allé(e)s"],
    subjonctif: ["aille","ailles","aille","allions","alliez","aillent"],
    impératif: ["—","va","—","allons","allez","—"],
  },
  faire: {
    groupe: "3e groupe",
    présent: ["fais","fais","fait","faisons","faites","font"],
    imparfait: ["faisais","faisais","faisait","faisions","faisiez","faisaient"],
    futur: ["ferai","feras","fera","ferons","ferez","feront"],
    conditionnel: ["ferais","ferais","ferait","ferions","feriez","feraient"],
    passé_composé: ["ai fait","as fait","a fait","avons fait","avez fait","ont fait"],
    subjonctif: ["fasse","fasses","fasse","fassions","fassiez","fassent"],
    impératif: ["—","fais","—","faisons","faites","—"],
  },
  vouloir: {
    groupe: "3e groupe",
    présent: ["veux","veux","veut","voulons","voulez","veulent"],
    imparfait: ["voulais","voulais","voulait","voulions","vouliez","voulaient"],
    futur: ["voudrai","voudras","voudra","voudrons","voudrez","voudront"],
    conditionnel: ["voudrais","voudrais","voudrait","voudrions","voudriez","voudraient"],
    passé_composé: ["ai voulu","as voulu","a voulu","avons voulu","avez voulu","ont voulu"],
    subjonctif: ["veuille","veuilles","veuille","voulions","vouliez","veuillent"],
    impératif: ["—","veuille","—","veuillons","veuillez","—"],
  },
  pouvoir: {
    groupe: "3e groupe",
    présent: ["peux","peux","peut","pouvons","pouvez","peuvent"],
    imparfait: ["pouvais","pouvais","pouvait","pouvions","pouviez","pouvaient"],
    futur: ["pourrai","pourras","pourra","pourrons","pourrez","pourront"],
    conditionnel: ["pourrais","pourrais","pourrait","pourrions","pourriez","pourraient"],
    passé_composé: ["ai pu","as pu","a pu","avons pu","avez pu","ont pu"],
    subjonctif: ["puisse","puisses","puisse","puissions","puissiez","puissent"],
    impératif: ["—","—","—","—","—","—"],
  },
  devoir: {
    groupe: "3e groupe",
    présent: ["dois","dois","doit","devons","devez","doivent"],
    imparfait: ["devais","devais","devait","devions","deviez","devaient"],
    futur: ["devrai","devras","devra","devrons","devrez","devront"],
    conditionnel: ["devrais","devrais","devrait","devrions","devriez","devraient"],
    passé_composé: ["ai dû","as dû","a dû","avons dû","avez dû","ont dû"],
    subjonctif: ["doive","doives","doive","devions","deviez","doivent"],
    impératif: ["—","—","—","—","—","—"],
  },
  savoir: {
    groupe: "3e groupe",
    présent: ["sais","sais","sait","savons","savez","savent"],
    imparfait: ["savais","savais","savait","savions","saviez","savaient"],
    futur: ["saurai","sauras","saura","saurons","saurez","sauront"],
    conditionnel: ["saurais","saurais","saurait","saurions","sauriez","sauraient"],
    passé_composé: ["ai su","as su","a su","avons su","avez su","ont su"],
    subjonctif: ["sache","saches","sache","sachions","sachiez","sachent"],
    impératif: ["—","sache","—","sachons","sachez","—"],
  },
  dire: {
    groupe: "3e groupe",
    présent: ["dis","dis","dit","disons","dites","disent"],
    imparfait: ["disais","disais","disait","disions","disiez","disaient"],
    futur: ["dirai","diras","dira","dirons","direz","diront"],
    conditionnel: ["dirais","dirais","dirait","dirions","diriez","diraient"],
    passé_composé: ["ai dit","as dit","a dit","avons dit","avez dit","ont dit"],
    subjonctif: ["dise","dises","dise","disions","disiez","disent"],
    impératif: ["—","dis","—","disons","dites","—"],
  },
  voir: {
    groupe: "3e groupe",
    présent: ["vois","vois","voit","voyons","voyez","voient"],
    imparfait: ["voyais","voyais","voyait","voyions","voyiez","voyaient"],
    futur: ["verrai","verras","verra","verrons","verrez","verront"],
    conditionnel: ["verrais","verrais","verrait","verrions","verriez","verraient"],
    passé_composé: ["ai vu","as vu","a vu","avons vu","avez vu","ont vu"],
    subjonctif: ["voie","voies","voie","voyions","voyiez","voient"],
    impératif: ["—","vois","—","voyons","voyez","—"],
  },
  venir: {
    groupe: "3e groupe",
    présent: ["viens","viens","vient","venons","venez","viennent"],
    imparfait: ["venais","venais","venait","venions","veniez","venaient"],
    futur: ["viendrai","viendras","viendra","viendrons","viendrez","viendront"],
    conditionnel: ["viendrais","viendrais","viendrait","viendrions","viendriez","viendraient"],
    passé_composé: ["suis venu(e)","es venu(e)","est venu(e)","sommes venu(e)s","êtes venu(e)(s)","sont venu(e)s"],
    subjonctif: ["vienne","viennes","vienne","venions","veniez","viennent"],
    impératif: ["—","viens","—","venons","venez","—"],
  },
  prendre: {
    groupe: "3e groupe",
    présent: ["prends","prends","prend","prenons","prenez","prennent"],
    imparfait: ["prenais","prenais","prenait","prenions","preniez","prenaient"],
    futur: ["prendrai","prendras","prendra","prendrons","prendrez","prendront"],
    conditionnel: ["prendrais","prendrais","prendrait","prendrions","prendriez","prendraient"],
    passé_composé: ["ai pris","as pris","a pris","avons pris","avez pris","ont pris"],
    subjonctif: ["prenne","prennes","prenne","prenions","preniez","prennent"],
    impératif: ["—","prends","—","prenons","prenez","—"],
  },
  mettre: {
    groupe: "3e groupe",
    présent: ["mets","mets","met","mettons","mettez","mettent"],
    imparfait: ["mettais","mettais","mettait","mettions","mettiez","mettaient"],
    futur: ["mettrai","mettras","mettra","mettrons","mettrez","mettront"],
    conditionnel: ["mettrais","mettrais","mettrait","mettrions","mettriez","mettraient"],
    passé_composé: ["ai mis","as mis","a mis","avons mis","avez mis","ont mis"],
    subjonctif: ["mette","mettes","mette","mettions","mettiez","mettent"],
    impératif: ["—","mets","—","mettons","mettez","—"],
  },
  parler: {
    groupe: "1er groupe (-er)",
    présent: ["parle","parles","parle","parlons","parlez","parlent"],
    imparfait: ["parlais","parlais","parlait","parlions","parliez","parlaient"],
    futur: ["parlerai","parleras","parlera","parlerons","parlerez","parleront"],
    conditionnel: ["parlerais","parlerais","parlerait","parlerions","parleriez","parleraient"],
    passé_composé: ["ai parlé","as parlé","a parlé","avons parlé","avez parlé","ont parlé"],
    subjonctif: ["parle","parles","parle","parlions","parliez","parlent"],
    impératif: ["—","parle","—","parlons","parlez","—"],
  },
  manger: {
    groupe: "1er groupe (-er)",
    présent: ["mange","manges","mange","mangeons","mangez","mangent"],
    imparfait: ["mangeais","mangeais","mangeait","mangions","mangiez","mangeaient"],
    futur: ["mangerai","mangeras","mangera","mangerons","mangerez","mangeront"],
    conditionnel: ["mangerais","mangerais","mangerait","mangerions","mangeriez","mangeraient"],
    passé_composé: ["ai mangé","as mangé","a mangé","avons mangé","avez mangé","ont mangé"],
    subjonctif: ["mange","manges","mange","mangions","mangiez","mangent"],
    impératif: ["—","mange","—","mangeons","mangez","—"],
  },
  donner: {
    groupe: "1er groupe (-er)",
    présent: ["donne","donnes","donne","donnons","donnez","donnent"],
    imparfait: ["donnais","donnais","donnait","donnions","donniez","donnaient"],
    futur: ["donnerai","donneras","donnera","donnerons","donnerez","donneront"],
    conditionnel: ["donnerais","donnerais","donnerait","donnerions","donneriez","donneraient"],
    passé_composé: ["ai donné","as donné","a donné","avons donné","avez donné","ont donné"],
    subjonctif: ["donne","donnes","donne","donnions","donniez","donnent"],
    impératif: ["—","donne","—","donnons","donnez","—"],
  },
  penser: {
    groupe: "1er groupe (-er)",
    présent: ["pense","penses","pense","pensons","pensez","pensent"],
    imparfait: ["pensais","pensais","pensait","pensions","pensiez","pensaient"],
    futur: ["penserai","penseras","pensera","penserons","penserez","penseront"],
    conditionnel: ["penserais","penserais","penserait","penserions","penseriez","penseraient"],
    passé_composé: ["ai pensé","as pensé","a pensé","avons pensé","avez pensé","ont pensé"],
    subjonctif: ["pense","penses","pense","pensions","pensiez","pensent"],
    impératif: ["—","pense","—","pensons","pensez","—"],
  },
  aimer: {
    groupe: "1er groupe (-er)",
    présent: ["aime","aimes","aime","aimons","aimez","aiment"],
    imparfait: ["aimais","aimais","aimait","aimions","aimiez","aimaient"],
    futur: ["aimerai","aimeras","aimera","aimerons","aimerez","aimeront"],
    conditionnel: ["aimerais","aimerais","aimerait","aimerions","aimeriez","aimeraient"],
    passé_composé: ["ai aimé","as aimé","a aimé","avons aimé","avez aimé","ont aimé"],
    subjonctif: ["aime","aimes","aime","aimions","aimiez","aiment"],
    impératif: ["—","aime","—","aimons","aimez","—"],
  },
  finir: {
    groupe: "2e groupe (-ir)",
    présent: ["finis","finis","finit","finissons","finissez","finissent"],
    imparfait: ["finissais","finissais","finissait","finissions","finissiez","finissaient"],
    futur: ["finirai","finiras","finira","finirons","finirez","finiront"],
    conditionnel: ["finirais","finirais","finirait","finirions","finiriez","finiraient"],
    passé_composé: ["ai fini","as fini","a fini","avons fini","avez fini","ont fini"],
    subjonctif: ["finisse","finisses","finisse","finissions","finissiez","finissent"],
    impératif: ["—","finis","—","finissons","finissez","—"],
  },
  choisir: {
    groupe: "2e groupe (-ir)",
    présent: ["choisis","choisis","choisit","choisissons","choisissez","choisissent"],
    imparfait: ["choisissais","choisissais","choisissait","choisissions","choisissiez","choisissaient"],
    futur: ["choisirai","choisiras","choisira","choisirons","choisirez","choisiront"],
    conditionnel: ["choisirais","choisirais","choisirait","choisirions","choisiriez","choisiraient"],
    passé_composé: ["ai choisi","as choisi","a choisi","avons choisi","avez choisi","ont choisi"],
    subjonctif: ["choisisse","choisisses","choisisse","choisissions","choisissiez","choisissent"],
    impératif: ["—","choisis","—","choisissons","choisissez","—"],
  },
  partir: {
    groupe: "3e groupe",
    présent: ["pars","pars","part","partons","partez","partent"],
    imparfait: ["partais","partais","partait","partions","partiez","partaient"],
    futur: ["partirai","partiras","partira","partirons","partirez","partiront"],
    conditionnel: ["partirais","partirais","partirait","partirions","partiriez","partiraient"],
    passé_composé: ["suis parti(e)","es parti(e)","est parti(e)","sommes parti(e)s","êtes parti(e)(s)","sont parti(e)s"],
    subjonctif: ["parte","partes","parte","partions","partiez","partent"],
    impératif: ["—","pars","—","partons","partez","—"],
  },
  écrire: {
    groupe: "3e groupe",
    présent: ["écris","écris","écrit","écrivons","écrivez","écrivent"],
    imparfait: ["écrivais","écrivais","écrivait","écrivions","écriviez","écrivaient"],
    futur: ["écrirai","écriras","écrira","écrirons","écrirez","écriront"],
    conditionnel: ["écrirais","écrirais","écrirait","écririons","écririez","écriraient"],
    passé_composé: ["ai écrit","as écrit","a écrit","avons écrit","avez écrit","ont écrit"],
    subjonctif: ["écrive","écrives","écrive","écrivions","écriviez","écrivent"],
    impératif: ["—","écris","—","écrivons","écrivez","—"],
  },
  lire: {
    groupe: "3e groupe",
    présent: ["lis","lis","lit","lisons","lisez","lisent"],
    imparfait: ["lisais","lisais","lisait","lisions","lisiez","lisaient"],
    futur: ["lirai","liras","lira","lirons","lirez","liront"],
    conditionnel: ["lirais","lirais","lirait","lirions","liriez","liraient"],
    passé_composé: ["ai lu","as lu","a lu","avons lu","avez lu","ont lu"],
    subjonctif: ["lise","lises","lise","lisions","lisiez","lisent"],
    impératif: ["—","lis","—","lisons","lisez","—"],
  },
  connaître: {
    groupe: "3e groupe",
    présent: ["connais","connais","connaît","connaissons","connaissez","connaissent"],
    imparfait: ["connaissais","connaissais","connaissait","connaissions","connaissiez","connaissaient"],
    futur: ["connaîtrai","connaîtras","connaîtra","connaîtrons","connaîtrez","connaîtront"],
    conditionnel: ["connaîtrais","connaîtrais","connaîtrait","connaîtrions","connaîtriez","connaîtraient"],
    passé_composé: ["ai connu","as connu","a connu","avons connu","avez connu","ont connu"],
    subjonctif: ["connaisse","connaisses","connaisse","connaissions","connaissiez","connaissent"],
    impératif: ["—","connais","—","connaissons","connaissez","—"],
  },
  croire: {
    groupe: "3e groupe",
    présent: ["crois","crois","croit","croyons","croyez","croient"],
    imparfait: ["croyais","croyais","croyait","croyions","croyiez","croyaient"],
    futur: ["croirai","croiras","croira","croirons","croirez","croiront"],
    conditionnel: ["croirais","croirais","croirait","croirions","croiriez","croiraient"],
    passé_composé: ["ai cru","as cru","a cru","avons cru","avez cru","ont cru"],
    subjonctif: ["croie","croies","croie","croyions","croyiez","croient"],
    impératif: ["—","crois","—","croyons","croyez","—"],
  },
  vivre: {
    groupe: "3e groupe",
    présent: ["vis","vis","vit","vivons","vivez","vivent"],
    imparfait: ["vivais","vivais","vivait","vivions","viviez","vivaient"],
    futur: ["vivrai","vivras","vivra","vivrons","vivrez","vivront"],
    conditionnel: ["vivrais","vivrais","vivrait","vivrions","vivriez","vivraient"],
    passé_composé: ["ai vécu","as vécu","a vécu","avons vécu","avez vécu","ont vécu"],
    subjonctif: ["vive","vives","vive","vivions","viviez","vivent"],
    impératif: ["—","vis","—","vivons","vivez","—"],
  },
  attendre: {
    groupe: "3e groupe",
    présent: ["attends","attends","attend","attendons","attendez","attendent"],
    imparfait: ["attendais","attendais","attendait","attendions","attendiez","attendaient"],
    futur: ["attendrai","attendras","attendra","attendrons","attendrez","attendront"],
    conditionnel: ["attendrais","attendrais","attendrait","attendrions","attendriez","attendraient"],
    passé_composé: ["ai attendu","as attendu","a attendu","avons attendu","avez attendu","ont attendu"],
    subjonctif: ["attende","attendes","attende","attendions","attendiez","attendent"],
    impératif: ["—","attends","—","attendons","attendez","—"],
  },
  comprendre: {
    groupe: "3e groupe",
    présent: ["comprends","comprends","comprend","comprenons","comprenez","comprennent"],
    imparfait: ["comprenais","comprenais","comprenait","comprenions","compreniez","comprenaient"],
    futur: ["comprendrai","comprendras","comprendra","comprendrons","comprendrez","comprendront"],
    conditionnel: ["comprendrais","comprendrais","comprendrait","comprendrions","comprendriez","comprendraient"],
    passé_composé: ["ai compris","as compris","a compris","avons compris","avez compris","ont compris"],
    subjonctif: ["comprenne","comprennes","comprenne","comprenions","compreniez","comprennent"],
    impératif: ["—","comprends","—","comprenons","comprenez","—"],
  },
  sortir: {
    groupe: "3e groupe",
    présent: ["sors","sors","sort","sortons","sortez","sortent"],
    imparfait: ["sortais","sortais","sortait","sortions","sortiez","sortaient"],
    futur: ["sortirai","sortiras","sortira","sortirons","sortirez","sortiront"],
    conditionnel: ["sortirais","sortirais","sortirait","sortirions","sortiriez","sortiraient"],
    passé_composé: ["suis sorti(e)","es sorti(e)","est sorti(e)","sommes sorti(e)s","êtes sorti(e)(s)","sont sorti(e)s"],
    subjonctif: ["sorte","sortes","sorte","sortions","sortiez","sortent"],
    impératif: ["—","sors","—","sortons","sortez","—"],
  },
  dormir: {
    groupe: "3e groupe",
    présent: ["dors","dors","dort","dormons","dormez","dorment"],
    imparfait: ["dormais","dormais","dormait","dormions","dormiez","dormaient"],
    futur: ["dormirai","dormiras","dormira","dormirons","dormirez","dormiront"],
    conditionnel: ["dormirais","dormirais","dormirait","dormirions","dormiriez","dormiraient"],
    passé_composé: ["ai dormi","as dormi","a dormi","avons dormi","avez dormi","ont dormi"],
    subjonctif: ["dorme","dormes","dorme","dormions","dormiez","dorment"],
    impératif: ["—","dors","—","dormons","dormez","—"],
  },
};

const guideData = [
  {
    temps: "Présent",
    color: "#2980b9",
    construction: [
      { groupe: "1er groupe (-er)", rule: "Radical + -e, -es, -e, -ons, -ez, -ent", ex: "parler → je parle, tu parles, il parle..." },
      { groupe: "2e groupe (-ir)", rule: "Radical + -is, -is, -it, -issons, -issez, -issent", ex: "finir → je finis, nous finissons..." },
      { groupe: "3e groupe", rule: "Irréguliers — à mémoriser !", ex: "être → je suis, faire → je fais, aller → je vais..." },
    ],
    usage: "Actions habituelles, vérités générales, actions en cours",
    exemples: [
      "Je parle français tous les jours. (habitude)",
      "La Terre tourne autour du Soleil. (vérité)",
      "En ce moment, je lis un livre. (action en cours)",
    ],
    astuce: "C'est le temps le plus utilisé. En cas de doute, commencez par le présent !",
  },
  {
    temps: "Imparfait",
    color: "#8e44ad",
    construction: [
      { groupe: "Tous les verbes", rule: "Radical du « nous » au présent + -ais, -ais, -ait, -ions, -iez, -aient", ex: "nous parlons → parl- → je parlais\nnous finissons → finiss- → je finissais" },
      { groupe: "Exception", rule: "être → ét- (j'étais, tu étais...)", ex: "" },
    ],
    usage: "Descriptions au passé, habitudes passées, actions en cours dans le passé",
    exemples: [
      "Quand j'étais petit, je jouais dehors. (habitude passée)",
      "Il faisait beau et les oiseaux chantaient. (description)",
      "Je dormais quand le téléphone a sonné. (action en cours + interruption)",
    ],
    astuce: "Pensez à l'imparfait comme un « décor » ou un « film en continu » du passé. Le passé composé, lui, est une « photo » — un événement ponctuel.",
  },
  {
    temps: "Futur simple",
    color: "#e67e22",
    construction: [
      { groupe: "1er et 2e groupes", rule: "Infinitif + -ai, -as, -a, -ons, -ez, -ont", ex: "parler → je parlerai\nfinir → je finirai" },
      { groupe: "3e groupe", rule: "Radical irrégulier + mêmes terminaisons", ex: "être → je serai, avoir → j'aurai,\naller → j'irai, faire → je ferai,\nvenir → je viendrai, voir → je verrai" },
    ],
    usage: "Actions futures, promesses, prédictions",
    exemples: [
      "Demain, je partirai à 8 heures. (plan futur)",
      "Un jour, tu comprendras. (prédiction)",
      "Je te dirai la vérité. (promesse)",
    ],
    astuce: "En conversation courante, on utilise souvent « aller + infinitif » (je vais partir) pour le futur proche. Le futur simple est plus formel ou pour un futur plus lointain.",
  },
  {
    temps: "Passé composé",
    color: "#27ae60",
    construction: [
      { groupe: "Avec avoir", rule: "Avoir au présent + participe passé", ex: "j'ai parlé, tu as fini, il a pris" },
      { groupe: "Avec être", rule: "Être au présent + participe passé (accord !)", ex: "je suis allé(e), elle est partie\n→ 16 verbes + tous les pronominaux" },
      { groupe: "Participes passés", rule: "-er → -é, -ir → -i, irréguliers à mémoriser", ex: "parlé, fini, fait, dit, vu, pris, mis, écrit, lu, su, pu, voulu, dû, cru, vécu, eu, été" },
    ],
    usage: "Actions terminées dans le passé, événements ponctuels",
    exemples: [
      "Hier, j'ai mangé au restaurant. (événement terminé)",
      "Elle est venue à 15 heures. (action ponctuelle)",
      "Nous avons compris la leçon. (résultat acquis)",
    ],
    astuce: "Les 16 verbes avec « être » : aller, venir, arriver, partir, entrer, sortir, monter, descendre, naître, mourir, rester, tomber, retourner, passer, devenir, revenir. Moyen mnémotechnique : la « maison d'être » !",
  },
  {
    temps: "Conditionnel présent",
    color: "#c0392b",
    construction: [
      { groupe: "Tous les verbes", rule: "Radical du futur + terminaisons de l'imparfait (-ais, -ais, -ait, -ions, -iez, -aient)", ex: "parler → je parlerais\nêtre → je serais (futur: ser- + imparfait: -ais)\navoir → j'aurais" },
    ],
    usage: "Politesse, souhait, hypothèse, conseil",
    exemples: [
      "Je voudrais un café, s'il vous plaît. (politesse)",
      "J'aimerais voyager en France. (souhait)",
      "Si j'avais le temps, je lirais plus. (hypothèse)",
      "Tu devrais dormir plus. (conseil)",
    ],
    astuce: "Futur = « je ferai » (c'est sûr). Conditionnel = « je ferais » (c'est imaginaire/poli). La différence est souvent juste un « s » à l'oral !",
  },
  {
    temps: "Subjonctif présent",
    color: "#16a085",
    construction: [
      { groupe: "La plupart", rule: "Radical du « ils » au présent + -e, -es, -e, -ions, -iez, -ent", ex: "ils prennent → prenn- → que je prenne\nils finissent → finiss- → que je finisse" },
      { groupe: "Irréguliers", rule: "être, avoir, aller, faire, pouvoir, savoir, vouloir", ex: "que je sois, que j'aie, que j'aille,\nque je fasse, que je puisse,\nque je sache, que je veuille" },
    ],
    usage: "Après des expressions de doute, émotion, volonté, nécessité — toujours avec « que »",
    exemples: [
      "Il faut que tu fasses tes devoirs. (nécessité)",
      "Je veux que vous veniez. (volonté)",
      "Je suis content qu'elle soit là. (émotion)",
      "Je doute qu'il puisse venir. (doute)",
    ],
    astuce: "Mots déclencheurs : il faut que, je veux que, je souhaite que, je suis content/triste que, bien que, pour que, avant que... Si vous voyez « que » + sentiment/volonté → subjonctif !",
  },
  {
    temps: "Impératif",
    color: "#d35400",
    construction: [
      { groupe: "Formation", rule: "Comme le présent, mais SANS sujet. Seulement 3 formes : tu, nous, vous", ex: "Parle ! Parlons ! Parlez !\nFinis ! Finissons ! Finissez !" },
      { groupe: "Attention", rule: "Les verbes en -er perdent le « s » à la 2e personne du singulier", ex: "tu parles → Parle ! (pas « Parles »)\nMais : tu finis → Finis ! (le s reste)" },
      { groupe: "Irréguliers", rule: "être → sois, soyons, soyez\navoir → aie, ayons, ayez\nsavoir → sache, sachons, sachez", ex: "" },
    ],
    usage: "Ordres, conseils, instructions, invitations",
    exemples: [
      "Écoute bien ! (ordre)",
      "Allons au cinéma ! (invitation)",
      "Prenez la première rue à droite. (instruction)",
      "Sois patient ! (conseil)",
    ],
    astuce: "Certains verbes n'ont pas d'impératif, comme pouvoir et devoir — on ne peut pas « ordonner » à quelqu'un de pouvoir !",
  },
];

const sujets = ["je","tu","il / elle / on","nous","vous","ils / elles"];
const tempsLabels = {
  présent: "Présent",
  imparfait: "Imparfait",
  futur: "Futur simple",
  conditionnel: "Conditionnel présent",
  passé_composé: "Passé composé",
  subjonctif: "Subjonctif présent",
  impératif: "Impératif",
};
const tempsList = Object.keys(tempsLabels);
const verbNames = Object.keys(verbs);

function GuideView({ openGuide, setOpenGuide }) {
  return (
    <div>
      {guideData.map((g, idx) => {
        const isOpen = openGuide === idx;
        return (
          <div key={idx} style={{marginBottom:10,borderRadius:12,border:`1px solid ${g.color}22`,overflow:"hidden",background:"#fff"}}>
            <button onClick={()=>setOpenGuide(isOpen?null:idx)}
              style={{width:"100%",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",
                border:"none",cursor:"pointer",background:isOpen?`${g.color}11`:"#fafafa",textAlign:"left"}}>
              <span style={{fontWeight:700,fontSize:16,color:g.color}}>{g.temps}</span>
              <span style={{fontSize:13,color:"#888",fontStyle:"italic",flex:1,marginLeft:12,marginRight:8}}>{g.usage}</span>
              <span style={{fontSize:18,color:g.color,fontWeight:700,transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0)"}}>{"\u25BC"}</span>
            </button>
            {isOpen && (
              <div style={{padding:"0 16px 16px"}}>
                <div style={{marginTop:12}}>
                  <h4 style={{fontSize:14,fontWeight:700,color:g.color,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:0.5}}>Construction</h4>
                  {g.construction.map((c,i)=>(
                    <div key={i} style={{background:"#f8f9fa",borderRadius:8,padding:"10px 12px",marginBottom:8,borderLeft:`3px solid ${g.color}`}}>
                      <div style={{fontWeight:600,fontSize:13,color:"#444",marginBottom:4}}>{c.groupe}</div>
                      <div style={{fontSize:14,color:"#333"}}>{c.rule}</div>
                      {c.ex && <div style={{fontSize:13,color:"#666",fontStyle:"italic",marginTop:4,whiteSpace:"pre-line"}}>{c.ex}</div>}
                    </div>
                  ))}
                </div>
                <div style={{marginTop:14}}>
                  <h4 style={{fontSize:14,fontWeight:700,color:g.color,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:0.5}}>Exemples</h4>
                  {g.exemples.map((e,i)=>(
                    <div key={i} style={{fontSize:14,color:"#333",padding:"4px 0",lineHeight:1.5}}>{e}</div>
                  ))}
                </div>
                <div style={{marginTop:14,background:`${g.color}0d`,borderRadius:8,padding:"10px 14px"}}>
                  <span style={{fontSize:13,fontWeight:700,color:g.color}}>Astuce : </span>
                  <span style={{fontSize:13,color:"#444"}}>{g.astuce}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [selectedVerb, setSelectedVerb] = useState("être");
  const [selectedTemps, setSelectedTemps] = useState("présent");
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("conjugaison");
  const [openGuide, setOpenGuide] = useState(null);

  const filteredVerbs = verbNames.filter(v => v.toLowerCase().includes(search.toLowerCase()));
  const data = verbs[selectedVerb];
  const conjugations = data[selectedTemps];

  const startQuiz = () => { setQuizMode(true); setQuizAnswers({}); setShowResults(false); };
  const checkAnswers = () => setShowResults(true);
  const normalize = (s) => s.toLowerCase().replace(/\s+/g," ").trim();

  return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:720,margin:"0 auto",padding:"12px 16px",color:"var(--text-color, #1a1a2e)"}}>
      <h1 style={{fontSize:22,fontWeight:700,textAlign:"center",margin:"0 0 4px",color:"var(--text-color, #1e3a5f)"}}>Conjugaison française</h1>
      <p style={{textAlign:"center",fontSize:13,color:"#666",margin:"0 0 12px"}}>30 verbes courants · 7 temps · Niveau B1</p>

      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button onClick={()=>{setView("conjugaison");setQuizMode(false)}}
          style={{flex:1,padding:"9px 0",borderRadius:10,border:view==="conjugaison"?"2px solid #2980b9":"1px solid #ddd",
            background:view==="conjugaison"?"#ebf5fb":"#fff",fontWeight:view==="conjugaison"?700:400,fontSize:14,cursor:"pointer",color:view==="conjugaison"?"#2980b9":"#555"}}>
          Tableaux
        </button>
        <button onClick={()=>setView("guide")}
          style={{flex:1,padding:"9px 0",borderRadius:10,border:view==="guide"?"2px solid #e67e22":"1px solid #ddd",
            background:view==="guide"?"#fef5e7":"#fff",fontWeight:view==="guide"?700:400,fontSize:14,cursor:"pointer",color:view==="guide"?"#e67e22":"#555"}}>
          Guide des temps
        </button>
      </div>

      {view==="guide" && <GuideView openGuide={openGuide} setOpenGuide={setOpenGuide} />}

      {view==="conjugaison" && <>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          <input type="text" placeholder="Chercher un verbe..." value={search}
            onChange={e=>{setSearch(e.target.value);setQuizMode(false);setShowResults(false)}}
            style={{flex:"1 1 160px",padding:"8px 12px",borderRadius:8,border:"1px solid #ccc",fontSize:14,outline:"none"}} />
          <button onClick={()=>{quizMode?setQuizMode(false):startQuiz()}}
            style={{padding:"8px 16px",borderRadius:8,border:"none",background:quizMode?"#e74c3c":"#2980b9",color:"#fff",fontWeight:600,fontSize:14,cursor:"pointer"}}>
            {quizMode?"✕ Quitter le quiz":"Quiz"}
          </button>
        </div>

        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {filteredVerbs.map(v=>(
            <button key={v} onClick={()=>{setSelectedVerb(v);setQuizMode(false);setShowResults(false);setQuizAnswers({})}}
              style={{padding:"5px 12px",borderRadius:16,border:selectedVerb===v?"2px solid #2980b9":"1px solid #ddd",
                background:selectedVerb===v?"#ebf5fb":"#fff",fontWeight:selectedVerb===v?700:400,fontSize:13,cursor:"pointer",
                color:selectedVerb===v?"#2980b9":"#333"}}>
              {v}
            </button>
          ))}
        </div>

        <div style={{background:"linear-gradient(135deg,#ebf5fb,#fdf2e9)",borderRadius:12,padding:"12px 16px",marginBottom:14}}>
          <h2 style={{margin:"0 0 2px",fontSize:20,fontWeight:700}}>{selectedVerb}</h2>
          <span style={{fontSize:13,color:"#777",fontStyle:"italic"}}>{data.groupe}</span>
        </div>

        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {tempsList.map(t=>(
            <button key={t} onClick={()=>{setSelectedTemps(t);setShowResults(false);setQuizAnswers({})}}
              style={{padding:"6px 14px",borderRadius:20,border:selectedTemps===t?"2px solid #8e44ad":"1px solid #ddd",
                background:selectedTemps===t?"#f4ecf7":"#fff",fontWeight:selectedTemps===t?700:400,fontSize:13,cursor:"pointer",
                color:selectedTemps===t?"#8e44ad":"#555"}}>
              {tempsLabels[t]}
            </button>
          ))}
        </div>

        <h3 style={{fontSize:16,fontWeight:600,margin:"0 0 10px",color:"#8e44ad"}}>{tempsLabels[selectedTemps]} de <em>{selectedVerb}</em></h3>

        <table style={{width:"100%",borderCollapse:"collapse",fontSize:15}}>
          <thead>
            <tr style={{borderBottom:"2px solid #8e44ad"}}>
              <th style={{textAlign:"left",padding:"8px 10px",fontWeight:600,color:"#8e44ad",width:"40%"}}>Sujet</th>
              <th style={{textAlign:"left",padding:"8px 10px",fontWeight:600,color:"#8e44ad"}}>Conjugaison</th>
            </tr>
          </thead>
          <tbody>
            {sujets.map((s,i)=>{
              const correct = conjugations[i];
              const isImpNA = correct === "—";
              const ans = quizAnswers[i] || "";
              const isCorrect = showResults && normalize(ans) === normalize(correct);
              const isWrong = showResults && normalize(ans) !== normalize(correct);
              let bg = i%2===0?"rgba(255,255,255,0.5)":"transparent";
              if(showResults && quizMode && !isImpNA){ bg = isCorrect?"#d5f5e3":"#fadbd8"; }
              return (
                <tr key={i} style={{background:bg,borderBottom:"1px solid #eee"}}>
                  <td style={{padding:"8px 10px",fontWeight:500}}>{s}</td>
                  <td style={{padding:"8px 10px"}}>
                    {quizMode && !isImpNA ? (
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <input type="text" value={ans}
                          onChange={e=>{const v={...quizAnswers};v[i]=e.target.value;setQuizAnswers(v)}}
                          disabled={showResults}
                          style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${showResults?(isCorrect?"#27ae60":"#e74c3c"):"#ccc"}`,
                            fontSize:15,width:"100%",maxWidth:220,outline:"none",background:showResults?"#fafafa":"#fff"}}
                          placeholder="?" />
                        {showResults && isWrong && <span style={{color:"#27ae60",fontWeight:600,fontSize:14,whiteSpace:"nowrap"}}>{correct}</span>}
                      </div>
                    ) : (
                      <span style={{fontWeight:600,color:isImpNA?"#aaa":"#2c3e50"}}>{correct}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {quizMode && !showResults && (
          <button onClick={checkAnswers}
            style={{display:"block",margin:"14px auto 0",padding:"10px 28px",borderRadius:10,border:"none",
              background:"#27ae60",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>
            Vérifier mes réponses
          </button>
        )}
        {quizMode && showResults && (
          <div style={{textAlign:"center",marginTop:14}}>
            <p style={{fontWeight:600,fontSize:15,color:"#2c3e50"}}>
              Score : {sujets.filter((_,i)=>conjugations[i]!=="—"&&normalize(quizAnswers[i]||"")===normalize(conjugations[i])).length} / {sujets.filter((_,i)=>conjugations[i]!=="—").length}
            </p>
            <button onClick={startQuiz}
              style={{padding:"8px 22px",borderRadius:8,border:"none",background:"#2980b9",color:"#fff",fontWeight:600,fontSize:14,cursor:"pointer"}}>
              Recommencer
            </button>
          </div>
        )}
      </>}
    </div>
  );
}
