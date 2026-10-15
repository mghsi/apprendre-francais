# PRD — TCF Expression écrite & Expression orale: content integration and deliberate practice

**Status:** Proposed  
**Owner:** TBD  
**Target release:** Phased local-first implementation  
**Last updated:** 2026-08-09  
**Primary source library reviewed:** `/Users/matingh/Library/Mobile Documents/com~apple~CloudDocs/French/TCF/online resources`

## 1. Executive summary

Transform the existing TCF **Expression écrite (EE)** and **Expression orale (EO)** pages from one-shot prompt simulators into a connected deliberate-practice system.

The product should integrate the useful material in the supplied TCF resource library into the places where it improves learning most:

- a substantially larger and better-tagged EO Task 2 scenario bank;
- a broad EO Task 3 opinion-topic and argument bank;
- task-aware question, argument, connector, and vocabulary coaching;
- repeated micro-practice outside full mock attempts;
- task-specific evaluation rather than grammar correction alone;
- correction-driven vocabulary and grammar review;
- attempt history, progress signals, and recommended next practice;
- cross-skill loops that turn CE/CO input into EE/EO production practice.

The supplied resource library is valuable but incomplete. It contains **four readable PDFs totaling 54 pages and approximately 12,326 words**. Its strongest assets are 245 EO Task 2 scenarios, a large EO Task 3 topic/argument bank, logical connectors, and descriptive vocabulary. It contains no dedicated EE prompt bank, official rubric, complete model response, annotated learner response, EO Task 1 corpus, dialogue audio, or pronunciation material.

The documents must therefore be treated as **source material for an editorial content pipeline**, not copied wholesale into the app. They have no visible author, license, bibliography, source URL, or provenance. Some connector examples contain grammatical problems, and several adjective “B2/C1/C2” mappings are semantically unreliable. Learner-facing content must be rewritten, reviewed, tagged, versioned, and attributed internally.

There is also a release-blocking format error in the current EO implementation. As of the official France Éducation international page reviewed on 2026-08-09:

- EO Task 1 is **2:00, no preparation**;
- EO Task 2 is **5:30 total, including 2:00 preparation**;
- EO Task 3 is **4:30, no preparation**.

The current app instead configures Task 1 as 1:30, Task 2 as 2:00 without preparation, and Task 3 as 5:00 plus 2:00 preparation. Correcting the simulator and coaching assumptions is Phase 0 and must precede expanded content.

### Recommended product sequence

1. Correct the EO exam model and distinguish **training assistance** from **exam conditions**.
2. Establish a reviewed, provenance-aware content schema and import the best EO resources.
3. Add task-specific coaching and micro-drills around that content.
4. Save completed attempts and task-aware evaluations.
5. Build a correction-driven review queue and shared vocabulary bank.
6. Connect CE/CO topics to EE/EO production and add progress/recommendation surfaces.
7. Add richer oral interaction, server transcription, model responses, and calibrated human review only after the core loop is trustworthy.

## 2. Product problem

### 2.1 Current learner experience

The app already has polished foundations:

- EE provides three tasks, independent timers, word counts, prompt selection, draft persistence, accent input, and AI grammar/style correction.
- EO provides task timers, browser audio recording, live browser transcription, playback, structures, thematic vocabulary, and AI correction of the transcript.
- CO demonstrates a stronger local-first attempt lifecycle with import, practice, results, correction review, vocabulary, history, and IndexedDB persistence.

However, EE and EO are currently **workspaces**, not complete training systems:

- only nine built-in prompts exist for each skill;
- prompts have no stable IDs, themes, difficulty, provenance, learning objectives, variants, or review status;
- there is no completed-attempt model or attempt history;
- feedback evaluates grammar and style, not TCF task fulfillment;
- EO reuses an EE-oriented correction prompt for spoken transcripts;
- oral fluency, interaction, question coverage, pace, and organization are not evaluated;
- the app stores only one EO recording per task, not one per prompt or attempt;
- generated vocabulary is isolated inside EO and cannot become review cards;
- corrections are not converted into targeted drills;
- there is no progress view or recommended next activity;
- useful CE/CO passages, transcripts, and vocabulary do not feed production practice.

### 2.2 Learner need

Improvement in EE and EO requires more than repeatedly opening a prompt and receiving corrections. The learner needs a cycle that separates and reconnects the following abilities:

1. understand the exact task and audience;
2. retrieve relevant ideas and vocabulary quickly;
3. organize a response under time pressure;
4. produce language without over-relying on a template;
5. receive task-specific and linguistic feedback;
6. repair recurring weaknesses with short exercises;
7. repeat the same skill with a related but non-identical prompt;
8. observe progress across attempts.

The external PDFs supply meaningful raw material for steps 2–4, especially in EO Tasks 2 and 3. The product must provide the missing system around it.

## 3. Evidence and source inventory

### 3.1 External resource library

The reviewed directory is flat and contains four text-extractable, unencrypted PDFs. No audio, video, spreadsheet, Word, HTML, or Markdown files were present.

| Resource | Pages | Approx. words | Strongest use | Quality concerns |
|---|---:|---:|---|---|
| `EO Tâche 2.pdf` | 26 | 7,184 | EO Task 2 scenarios and question-category hints | No examiner turns, model dialogues, timing, rubric, or provenance |
| `EO Tâche 3.pdf` | 18 | 3,599 | EO Task 3 prompts and argument banks; secondary EE argument use | Repeated/paraphrased topics, no models, audio, rubric, or provenance |
| `Des Connecteurs logiques - TCF.pdf` | 4 | 844 | EE cohesion and EO Task 3 discourse organization | Several incorrect or awkward examples require correction |
| `Adj TCF Canada.pdf` | 6 | 699 | Descriptive vocabulary and collocations | Unsupported CEFR labels and false “upgrade” relationships |

#### EO Task 2 coverage

The largest PDF contains 245 scenario bullets across eight broad domains:

| Domain | Approx. scenarios | Typical situations |
|---|---:|---|
| Housing | 24 | Roommates, renting, buying, hotels, camping, neighborhoods |
| Travel and holidays | 35 | Agencies, tourism offices, destinations, accommodation, Canada |
| Courses and activities | 33 | Language, music, theatre, cooking, clubs |
| Work and professional life | 27 | Job search, interviews, conditions, training, career |
| Services and transport | 33 | Transit, rentals, delivery, public and personal services |
| Children, family, and animals | 28 | Childcare, schools, activities, pets, family services |
| Events and celebrations | 34 | Birthdays, weddings, concerts, festivals, meals, sports |
| Canada and settlement | 31 | Immigration, integration, housing, work, study, healthcare |

Each domain includes reusable question dimensions such as price, schedule, availability, requirements, equipment, location, cancellation, safety, recommendation, and next steps. This is the best immediate source for varied Task 2 practice.

#### EO Task 3 coverage

The Task 3 PDF organizes opinion prompts and supporting ideas into six families:

1. immigration, life abroad, and adaptation;
2. technology, internet, and media;
3. education, learning, and study;
4. society, psychology, and lifestyle;
5. health, well-being, and food;
6. environment, ecology, and citizenship.

It provides approximately 36 core argument headings and 108 supporting points. The material is useful for idea retrieval, pro/con comparison, counterargument practice, and transfer into EE Task 3. It should not be displayed as a memorized script.

#### Shared language resources

The connector PDF covers ten discourse functions: addition, cause, consequence, opposition, purpose, condition, sequence, comparison, illustration, and conclusion.

The adjective PDF contains roughly 20 semantic groups and stronger domain-specific clusters for places, atmosphere, and people. Its collocations are more valuable than its unsourced proficiency ladders.

### 3.2 Official exam facts used by this PRD

The authoritative baseline is the France Éducation international **TCF Canada** page as fetched on 2026-08-09:

`https://www.france-education-international.fr/test/tcf-canada`

#### Expression écrite

- Three tasks in 60 minutes.
- Task 1: 60–120 words; message that describes, recounts, and/or explains to a specified recipient.
- Task 2: 120–150 words; article, letter, note, or similar text reporting an experience or recounting events with comments, opinions, or arguments toward an objective.
- Task 3: 120–180 words; compare two viewpoints and give an argued opinion.
- Assessed abilities include clear communication, requested information, description, narration, explanation, justification, coherence, comparison, argumentation, task-appropriate vocabulary/structures, and reformulation.
- A production may be assessed “A1 non atteint” when required tasks or word counts are not completed, the response is off-topic, or handwriting is illegible on paper.

#### Expression orale

- Individual face-to-face test with an examiner; three tasks in 12 minutes including 2 minutes of preparation.
- Task 1: directed interview, 2:00, no preparation.
- Task 2: interaction, 5:30 including 2:00 preparation; obtain information in a daily-life situation with specified roles.
- Task 3: point of view, 4:30, no preparation; speak spontaneously, continuously, and convincingly.
- Assessed abilities include talking about oneself, asking situation-appropriate questions, giving an opinion, discussing advantages and disadvantages, agreeing/disagreeing, presenting clear structured argumentation in an appropriate style, and developing/concluding complex subjects.

### 3.3 Important source policy

The product must maintain three evidence classes:

1. **Official fact** — linked to a current France Éducation international source and date checked.
2. **Editorial training guidance** — created or reviewed for this app; useful but not presented as an official rule.
3. **Generated/personalized material** — created by an LLM or from learner work; clearly labeled and never presented as official exam content.

No private PDF should be shipped as a public app asset. No imported prompt should be labeled “official” unless its license and exact official provenance are verified.

## 4. Goals

1. Align EE and EO simulation with the current official task format.
2. Expand prompt variety enough to support repeated practice without obvious memorization.
3. Put resource-derived guidance at the correct point in the learning cycle: before, during, or after an attempt.
4. Provide task-aware feedback for communicative success, organization, language control, and—in EO—interaction and delivery proxies.
5. Convert feedback into targeted practice rather than leaving it as a one-time report.
6. Preserve drafts, recordings, transcripts, evaluations, and revisions as distinct attempts.
7. Build a shared vocabulary and review system sourced from prompts, corrections, CE, CO, and learner selections.
8. Recommend the next useful activity based on evidence, not merely offer a larger prompt list.
9. Support full simulations and short 3–10 minute drills across the platform.
10. Keep private learner writing/audio and third-party content local by default.

## 5. Non-goals

### Initial releases

- Claiming to reproduce an official TCF score or examiner decision.
- Publishing the supplied PDFs or their full verbatim contents.
- Automatically trusting PDF CEFR labels or grammatical examples.
- Replacing expert editorial review with LLM generation.
- Real-time pronunciation grading from browser speech recognition alone.
- A fully conversational AI examiner in the first release.
- User accounts, cloud synchronization, social leaderboards, or teacher dashboards.
- A comprehensive general-purpose learning management system.
- Importing arbitrary PDFs at runtime in the learner UI.

### Longer-term exclusions unless separately approved

- Immigration eligibility advice based on practice results.
- Claims that an estimated practice level guarantees a particular NCLC or TCF result.
- Storage of learner audio on a remote server without explicit consent, retention controls, and a privacy design.

## 6. Target users and jobs to be done

### Primary learner

A B1–C1 adult preparing for TCF Canada who needs to move from passive knowledge to reliable timed production.

### Jobs

- “Give me a realistic prompt I have not memorized.”
- “Help me find ideas and vocabulary, but do not write the answer for me.”
- “Tell me whether I completed the communicative task, not only whether my grammar is correct.”
- “Show me the few weaknesses that matter most for my next attempt.”
- “Let me repeat the exact weak skill in a short session.”
- “Help me compare attempts and know whether I am becoming faster, clearer, and more accurate.”
- “Turn vocabulary and mistakes from all TCF sections into active production practice.”

## 7. Product principles

### 7.1 Practice before performance, performance before feedback

Guidance must be progressively removable:

- **Learn mode:** structures, category hints, examples, and vocabulary available.
- **Guided practice:** compact hints available on demand; use is recorded.
- **Exam practice:** no content hints during the attempt; only official-format instructions and timing.

Results must distinguish assisted and unassisted attempts. A heavily guided response must not appear directly comparable to an exam-mode response.

### 7.2 Retrieval, not copying

Argument banks and sample questions should prompt recall rather than invite verbatim reuse. Default behavior:

- learner attempts first;
- hints reveal one category or idea at a time;
- full examples appear after submission or after an explicit “show model” action;
- repeated practice uses a related variant, not the identical answer.

### 7.3 Feedback must produce a next action

Every important feedback item should support at least one of:

- retry this prompt;
- practice a micro-drill;
- save a vocabulary item;
- open the relevant conjugation/grammar practice;
- attempt a related prompt;
- review a model/annotated example.

### 7.4 Training estimate, never official score

Use dimensions and evidence rather than false precision. The app may report a clearly labeled practice profile or approximate readiness band after validation, but must not claim official scoring equivalence.

### 7.5 Content quality over corpus size

A smaller reviewed bank with stable IDs, tags, and clear objectives is preferable to hundreds of duplicated or incorrect prompts.

## 8. Proposed end-to-end learning loop

```text
Choose goal
    ↓
Diagnostic or recommended micro-skill
    ↓
Optional planning / vocabulary retrieval
    ↓
Timed EE draft or EO recording
    ↓
Self-check against task requirements
    ↓
Task-aware evaluation + language correction
    ↓
Select 1–3 priority repairs
    ↓
Micro-drills / vocabulary review / guided retry
    ↓
Related unassisted prompt
    ↓
Attempt history and next recommendation
```

The user must also be able to skip recommendations and directly start any task.

## 9. Content architecture

### 9.1 Canonical prompt model

Replace anonymous prompt-array positions with stable records. A conceptual schema follows; exact module boundaries should follow repository conventions during implementation.

```js
{
  id: 'eo-t2-housing-roommate-001',
  skill: 'eo',
  task: 2,
  version: 1,
  status: 'reviewed',
  title: 'Une chambre en colocation',
  instruction: '...',
  roles: {
    learner: 'personne intéressée',
    interlocutor: 'ami déjà locataire'
  },
  themes: ['housing', 'daily-life'],
  register: 'informal',
  difficulty: 'intermediate',
  objectives: ['question-variety', 'coverage', 'follow-up'],
  expectedCoverage: ['price', 'availability', 'rules', 'transport'],
  hints: {
    categories: ['budget', 'room', 'shared-spaces'],
    phrases: ['À partir de quand… ?']
  },
  relatedVocabularyIds: ['vocab-housing-...'],
  source: {
    kind: 'editorial-derivative',
    sourceRef: 'private-pdf-eo-task-2',
    license: 'unverified-do-not-redistribute',
    reviewedAt: '2026-08-09'
  }
}
```

### 9.2 Shared taxonomy

Minimum tags:

- skill and task;
- theme and subtheme;
- communicative purpose;
- learner role and interlocutor role;
- register: informal, neutral, formal;
- response genre for EE;
- difficulty dimensions, not only one level: idea complexity, linguistic demand, interaction demand;
- training objectives;
- expected coverage points;
- related prompt family and variant ID;
- provenance, editorial status, version, and review date.

Canonical themes should be shared across EE, EO, CE, CO, and vocabulary where practical: housing, work, education, technology, environment, health, travel, family, community, public services, culture, and life in Canada.

### 9.3 Prompt families and variants

Near-duplicate source prompts should not become independent records. Store one canonical topic with controlled variants:

```text
Topic: internet and social isolation
├── EO T3: Does internet isolate people?
├── EO T3 variant: Do social networks weaken real relationships?
├── EE T3: compare two viewpoints on online social life
├── 90-second drill: state and justify one nuanced position
└── vocabulary set: relationships, isolation, digital habits
```

Variant tracking enables spaced transfer without false content diversity.

### 9.4 Content review states

- `raw`: extracted from a source; never learner-facing.
- `draft`: normalized or rewritten; internal preview only.
- `linguistic-review`: checked for grammar, idiom, register, and semantic precision.
- `exam-review`: checked against current task format and pedagogical purpose.
- `reviewed`: eligible for learner-facing use.
- `retired`: preserved for history but no longer assigned.

No content should be shipped from `raw` or `draft` states.

## 10. Editorial ingestion pipeline

### 10.1 Ingestion approach

Use an offline, reviewable process—not runtime PDF parsing:

1. Record a source manifest with file name, hash, page count, extraction date, provenance status, and reuse restriction.
2. Extract text into a non-shipping workspace or script output.
3. Parse headings, scenario bullets, and category tables.
4. Normalize encoding and punctuation.
5. Cluster semantic duplicates.
6. Rewrite prompts to avoid verbatim redistribution and improve consistency.
7. Add tags, objectives, expected coverage, and register.
8. Review all French content manually.
9. Validate each record against a schema.
10. Generate the application content modules from reviewed records.
11. Keep a changelog so attempt history can retain the content version used.

### 10.2 Quality checks

Automated checks should reject or flag:

- duplicate IDs;
- empty or malformed task instructions;
- incorrect task timing or word bounds;
- missing source/provenance status;
- identical normalized prompt text;
- unsupported CEFR claims;
- unreviewed content in production exports;
- malformed quote marks, apostrophes, and elisions;
- hint phrases not found in a reviewed phrase bank;
- EE Task 3 prompts missing two contrasting source viewpoints;
- EO Task 2 prompts missing both participant roles;
- prompts with culturally narrow assumptions or private data.

### 10.3 Required manual review

At minimum, one fluent French reviewer must check:

- naturalness and correctness;
- formal/informal register;
- whether a question category fits the scenario;
- connector placement and punctuation;
- adjective meaning, valency, and collocation;
- whether the prompt elicits the intended task behavior;
- whether hints accidentally provide a complete answer.

## 11. EE product requirements

### 11.1 Shared EE experience

The EE page should support three modes:

1. **Learn:** one skill focus, examples, untimed or lightly timed.
2. **Practice:** task timer, optional progressive hints, task-specific feedback.
3. **Mock:** all three tasks in 60 minutes, no hints, one final submission.

The current independent drafts and timers can remain for Practice mode. Mock mode must preserve one coherent session and clearly show whether every task and word requirement is complete.

### 11.2 EE Task 1 training

Required practice dimensions:

- identify recipient and relationship;
- choose appropriate salutation and closing;
- cover every requested information point;
- describe, recount, and/or explain clearly;
- maintain the required register;
- respect 60–120 words.

Resource integration:

- reuse reviewed housing, travel, course, work, event, and service themes from the EO Task 2 PDF as **newly authored EE situations**, not direct copies;
- use descriptive collocations for places, atmosphere, and people;
- use connector subsets appropriate to short messages, avoiding overly formal or artificial language.

Micro-drills:

- choose the correct register for a recipient;
- rewrite an informal request formally and vice versa;
- order four information points;
- write only the opening and closing;
- compress an overlong message into the word range;
- add one missing requested detail.

### 11.3 EE Task 2 training

Required practice dimensions:

- identify publication/recipient and objective;
- recount an experience with temporal clarity;
- add comments, recommendations, opinions, or arguments;
- organize a beginning, development, and conclusion;
- use concrete examples and descriptive vocabulary;
- respect 120–150 words.

Resource integration:

- transform reviewed travel, work, education, activity, event, settlement, and community themes into varied article/letter/note prompts;
- use adjective collocations in context rather than as isolated “advanced synonyms”;
- use sequence, cause, consequence, illustration, and conclusion connectors;
- derive “experience → lesson → recommendation” planning cards from recurring scenario structures.

Micro-drills:

- turn notes into a chronological paragraph;
- replace generic adjectives with precise collocations;
- add a concrete example to an unsupported claim;
- select connectors by logical relation;
- identify and remove repetition;
- write a 30-word recommendation conclusion.

### 11.4 EE Task 3 training

Required practice dimensions:

- accurately reformulate two source viewpoints;
- compare rather than discuss documents separately;
- distinguish source summary from personal opinion;
- state and support a nuanced position;
- use examples, counterarguments, and logical links;
- respect the total 120–180 word requirement and any current official prompt instructions.

Resource integration:

- use the EO Task 3 themes and pro/con material as an **editorial idea source** for newly authored paired documents;
- cluster related topics to create graduated variants;
- use the connector bank for comparison, opposition, concession, cause, consequence, illustration, and conclusion;
- use argument banks as post-attempt alternatives or progressive hints, never as a prewritten model answer in exam mode.

Micro-drills:

- reformulate one position without copying key phrasing;
- write a one-sentence comparison of two viewpoints;
- classify statements as summary, opinion, evidence, or example;
- build argument → explanation → example chains;
- concede and rebut one opposing point;
- repair a paragraph with misused connectors.

### 11.5 EE self-check before AI feedback

On submission, ask the learner to complete a short checklist before showing automated feedback:

- Did I answer every requested point?
- Is the recipient and register appropriate?
- Am I inside the word range?
- Can I identify my main message or position?
- Did I use at least one concrete detail/example where appropriate?
- For Task 3, did I compare both viewpoints and clearly separate my opinion?

The self-rating is saved and compared with automated feedback to improve metacognition.

## 12. EO product requirements

### 12.1 Correct official-format simulation first

Update the task configuration and state machine:

| Task | Official training target | Preparation | Interaction model |
|---|---:|---:|---|
| EO Task 1 | 2:00 | None | Directed interview with examiner |
| EO Task 2 | 5:30 total | 2:00 | Interactive information seeking |
| EO Task 3 | 4:30 | None | Spontaneous continuous opinion response |

The full simulation should total 12 minutes. Training modes may offer additional planning, but must label it as assistance and must not visually imply it exists in exam conditions.

Existing Task 3 preparation notes should move to:

- Learn/Guided mode for Task 3, labeled non-exam assistance;
- the official 2-minute preparation phase for Task 2;
- post-attempt planning review where useful.

### 12.2 EO Task 1 training

The external library contains no Task 1 material, so this must be authored separately.

Required content families:

- identity and origins;
- family and living situation;
- work and study;
- daily routines;
- interests and activities;
- French-learning motivation;
- past experiences;
- future plans;
- follow-up and clarification questions.

Required experience:

- examiner question bank with controlled follow-ups;
- random short interview sequences rather than one broad monologue prompt;
- record one continuous answer session;
- post-attempt transcript segmented by examiner question when possible.

Micro-drills:

- 20-second answer expansion;
- past/present/future switching;
- answer + reason + detail;
- repair one-word answers;
- natural hesitation and clarification phrases;
- personal vocabulary retrieval.

### 12.3 EO Task 2 training

This is the highest-value resource integration.

#### Scenario bank

Import a reviewed first release of at least 80 unique scenarios, balanced across the eight source domains. Do not ship all 245 until duplicate clustering and review are complete.

Each scenario must define:

- learner and interlocutor roles;
- formal/informal register;
- 4–8 expected information categories;
- optional question stems;
- likely examiner facts/responses for later interaction mode;
- one or more reasonable follow-up opportunities;
- topic vocabulary;
- source/version metadata.

#### Learn mode

- display category cards such as price, dates, conditions, location, equipment, cancellation, and recommendation;
- teach multiple question forms: intonation, `est-ce que`, inversion where natural, indirect polite questions, question words, and prepositional questions;
- teach opening, transition, follow-up, clarification, and closing phrases;
- include register contrast;
- allow untimed category and transformation drills.

#### Guided practice

- use the official 2-minute preparation phase;
- allow the learner to select or jot category keywords, not full scripted sentences;
- record which hints were opened;
- after preparation, hide notes only if configured for stricter practice; otherwise keep the assistance label visible;
- initially use a “question burst” recording even without a simulated examiner.

#### Interactive practice

Later release:

- an examiner agent answers from a bounded scenario fact sheet;
- responses remain concise and consistent;
- the examiner can ask for clarification but must not take over the conversation;
- evaluate whether learner follow-up questions logically use the prior answer;
- save both sides of the transcript and timing by turn.

#### EO Task 2 evaluation dimensions

- number of intelligible questions;
- expected category coverage;
- variety and grammatical control of interrogative forms;
- register and politeness;
- logical ordering;
- follow-up relevance;
- clarification/recovery behavior;
- interaction balance when an examiner simulation exists;
- lexical and grammatical control;
- pace and excessive silence as approximate signals only.

### 12.4 EO Task 3 training

#### Topic bank

Create a reviewed initial bank of at least 60 canonical prompts across the six source themes, with variants linked under common topics.

#### Learn mode

- practice position statements, argument chains, examples, concession, counterargument, and conclusion separately;
- expose alternative plan shapes as editorial guidance;
- teach connectors by discourse function and spoken register;
- surface vocabulary packs by theme;
- teach how to maintain 4:30 without filler or memorized over-formality.

#### Guided practice

- planning may be offered before recording, but must be labeled **“assistance d’entraînement — aucune préparation à l’épreuve”**;
- reveal one argument category at a time;
- optionally challenge the learner to produce a different example from the source bank;
- hide full templates by default to prevent recitation.

#### Exam practice

- no preparation stage;
- prompt selected and timer starts according to the simulated flow;
- no vocabulary, argument, or structure panel during the response;
- post-attempt review can compare the learner’s argument coverage with alternative ideas.

#### EO Task 3 evaluation dimensions

- clear position;
- development and support;
- relevant examples;
- treatment of advantages/disadvantages or alternative views;
- coherent progression and conclusion;
- appropriate spoken connectors;
- lexical and grammatical control;
- continuity, pace, and silence proxies;
- response relevance and sufficient development.

### 12.5 Oral delivery limitations

Browser Web Speech transcription is not a reliable pronunciation evaluator. The product must:

- show transcript confidence limitations;
- allow manual transcript correction without changing the original audio;
- separate transcript-based language feedback from audio-based delivery signals;
- avoid labeling unrecognized speech as a pronunciation error;
- calculate silence or pace only when technically valid and label it approximate;
- preserve playback so the learner can self-assess.

## 13. Feedback and evaluation system

### 13.1 Replace one generic correction with two layers

#### Layer A — Task performance

Task-specific analysis answers:

- Did the response fulfill the requested communicative purpose?
- Were required content points covered?
- Was the register appropriate?
- Was the response organized for this task?
- Was the response relevant, developed, and within constraints?
- For EO Task 2, did the learner actually seek information through suitable questions?

#### Layer B — Language control

Continue the useful current categories:

- orthography;
- agreement;
- conjugation;
- syntax;
- punctuation where relevant;
- prepositions;
- vocabulary;
- anglicisms;
- style;
- connectors, repetition, concision, structure, and clarity.

EO-specific language analysis must recognize transcript conventions and avoid treating natural spoken syntax as formal writing by default.

### 13.2 Evaluation response contract

A task-aware result should conceptually contain:

```js
{
  taskFulfillment: {
    status: 'strong | partial | weak',
    evidence: ['...'],
    missingRequirements: ['...']
  },
  dimensions: [
    {
      id: 'coherence',
      level: 'strong | developing | priority',
      evidence: ['exact or time-anchored evidence'],
      nextAction: '...'
    }
  ],
  language: {
    errors: [],
    suggestions: []
  },
  strengths: [],
  priorities: [],
  retryChallenge: '...',
  disclaimer: 'Évaluation d’entraînement, non officielle'
}
```

The UI should prioritize no more than three repair targets. The complete correction remains available, but the learner should not face an undifferentiated list of every possible improvement.

### 13.3 Evidence requirements

- Writing feedback must quote an exact span or clearly identify a missing task requirement.
- Transcript feedback must quote an exact span.
- Audio-derived feedback must include a timestamp or metric basis.
- Advice without evidence should be omitted or explicitly labeled general guidance.
- If the model cannot evaluate a dimension confidently, return `not_assessed` rather than inventing evidence.

### 13.4 Practice profile

Display a non-official profile such as:

- task completion;
- organization/coherence;
- lexical range/precision;
- grammatical control;
- register;
- oral interaction or delivery where applicable.

Do not convert this into an official TCF 0–20 result until a separately approved validation effort compares the system with trained human ratings on a representative corpus.

## 14. Model and annotated responses

The external library contains no complete model answers. Models must therefore be separately authored or generated and reviewed.

Requirements:

- at least one reviewed model per task family before models are promoted prominently;
- models show why choices work, not only a polished final answer;
- EE models identify task coverage, register, organization, reformulation, and useful language;
- EO models include audio where possible, transcript, timing, argument/question structure, and natural spoken language;
- provide more than one valid approach for selected prompts to prevent formula memorization;
- label generated but unreviewed examples clearly and do not include them in formal progress comparisons;
- models appear after an attempt by default.

## 15. Vocabulary, connectors, and grammar integration

### 15.1 Shared vocabulary bank

Create a learner-owned vocabulary collection that can receive items from:

- EO generated packs;
- reviewed PDF-derived topic packs;
- CE passages;
- CO transcripts/corrections;
- EE/EO correction suggestions;
- learner manual entry.

Each item should retain:

- lemma or phrase;
- meaning in French;
- grammatical category;
- construction/valency where relevant;
- register;
- example sentence;
- source skill, prompt, and attempt;
- theme tags;
- review state and dates;
- learner-created example;
- usage evidence from later EE/EO attempts.

### 15.2 Connector bank

Do not present connectors as interchangeable lists. Store:

- discourse function;
- spoken/written suitability;
- register;
- typical position and punctuation;
- grammatical construction, including subjunctive requirements;
- one reviewed example;
- one misuse or overuse warning.

Practice forms:

- classify relation;
- choose between similar connectors;
- repair punctuation/construction;
- combine two clauses;
- replace repeated connectors;
- detect unnatural overuse in a response.

### 15.3 Adjective and collocation bank

Discard unsupported “B2 → C1 → C2” ladders unless individually validated. Prefer semantic records:

- meaning and nuance;
- positive/negative connotation;
- register;
- common noun collocations;
- incompatible or misleading substitutions;
- learner example.

Prioritize the source’s strongest domains: places, neighborhoods, cities, atmosphere, landscapes, and people.

### 15.4 Correction-driven drills

Map existing correction categories to short actions:

| Signal | Next practice |
|---|---|
| Repeated conjugation error | Open existing verb/tense quiz with the relevant verb |
| Agreement error | Short rewrite or choice drill using learner sentence |
| Preposition error | Construction card plus one production sentence |
| Weak/repeated vocabulary | Save reviewed alternative and reuse in a new sentence |
| Connector misuse | Relation/connector repair drill |
| Missing task point | Outline or checklist drill for the same task type |
| EO Task 2 low coverage | Category-planning drill on a related scenario |
| EO Task 3 weak development | Argument → explanation → example drill |

## 16. Practice throughout the platform

### 16.1 Home dashboard

Use existing card patterns to show compact, actionable state:

- continue current EE draft;
- replay or review latest EO attempt;
- due vocabulary/error reviews;
- recommended 5-minute drill;
- days since last unassisted EE/EO attempt.

Do not build charts into the home page.

### 16.2 TCF landing

Each EE/EO card should show:

- most recent completed attempt;
- current incomplete work;
- next recommended task;
- number of due review items;
- clear Learn / Practice / Mock entry points.

Correct the existing home shortcut inconsistency that marks EO unavailable despite a working route.

### 16.3 CE/CO → EE/EO transfer

Add optional post-comprehension actions:

- summarize a CE passage in 60–100 words;
- give a 90-second oral reaction to a CO topic;
- transform two CE viewpoints into an EE Task 3 plan;
- save CE/CO vocabulary to a theme pack;
- use comprehension reasoning as a source for argument/evidence classification drills.

These are training exercises, not official task replicas unless they meet the exact task contract.

### 16.4 Vocabulary review → production

Review should not stop at recognition. Cards progress through:

1. recognize meaning;
2. recall phrase/collocation;
3. complete a sentence;
4. produce an original sentence;
5. use naturally in an EE/EO attempt.

Marking a term “mastered” should require successful production evidence or repeated self-assessed recall, not merely opening the card.

### 16.5 Conjugation integration

Use the existing conjugation explorer/quiz as the destination for correction-driven practice. The learner should be able to open a relevant verb and tense directly from feedback and return to the originating attempt.

### 16.6 Review queue

The queue should mix:

- vocabulary;
- connectors/collocations;
- recurring grammar errors;
- task checklist weaknesses;
- idea/argument retrieval;
- EO Task 2 question transformations;
- retry prompts.

Cap a default review session to a small achievable set, such as 5–10 items, and explain why each item is due.

## 17. Attempt, history, and progress model

### 17.1 Completed attempt record

Build on the existing CO IndexedDB history pattern. An EE/EO attempt should retain:

```js
{
  id,
  skill,
  task,
  promptId,
  promptVersion,
  mode,                 // learn, guided, practice, mock
  assistanceUsed: [],
  startedAt,
  submittedAt,
  activeSeconds,
  responseText,
  wordCount,
  audioRef,
  transcript,
  transcriptEdited,
  preparationNotes,
  selfAssessment,
  evaluation,
  revisionOfAttemptId,
  contentTags: []
}
```

Large audio blobs stay in IndexedDB and are referenced by ID. Evaluation and text records must remain usable if audio is later deleted.

### 17.2 Draft versus attempt

- A **draft** is mutable current work.
- A **submitted attempt** is immutable evidence.
- A **revision/retry** creates a new attempt linked to the prior one.
- Changing the selected prompt must never silently associate an old draft or recording with the new prompt.

### 17.3 Progress measures

Initial progress should use interpretable metrics:

- attempts by skill/task/theme/mode;
- completion of all task requirements;
- time versus target;
- EE word-range compliance;
- frequency of correction categories per 100 words;
- repeated priority weaknesses;
- EO question category coverage;
- EO speaking duration and approximate pace where valid;
- guided versus unassisted performance;
- retry improvement on the same skill;
- vocabulary reviewed and later used in production.

Avoid a single composite score in the initial release.

### 17.4 Recommendation logic

Start rule-based and explainable:

1. If a task has not been practiced recently, recommend it.
2. If the latest attempt missed a blocking requirement, recommend a targeted drill then a related retry.
3. If the same error category occurs in two or more recent attempts, recommend the mapped grammar/vocabulary drill.
4. If only guided attempts exist for a task, recommend an unassisted attempt.
5. If review items are overdue, recommend a short review before new content.
6. Avoid repeating the exact prompt until related variants have been attempted, unless the learner explicitly chooses retry.

## 18. UX and information architecture

### 18.1 Required route-level surfaces

Keep the existing lightweight routing approach unless implementation scope justifies Vue Router.

Required destinations:

- `/tcf/ee`: Learn / Practice / Mock / History tabs;
- `/tcf/eo`: Learn / Practice / Mock / History tabs;
- a shared review/vocabulary destination activated from the existing disabled module card;
- optional later progress destination if summaries no longer fit existing cards/history.

### 18.2 EE/EO practice layout

Follow the existing TCF compact top bar and card system:

- task and mode tabs;
- adjacent timer/total panel;
- prompt card;
- optional preparation/coach card;
- response/recording card;
- self-check and results cards;
- vocabulary or review sidebar only when space permits.

At 360 px:

- controls wrap;
- essential actions remain visible;
- optional coaching moves below the response;
- audio never exceeds container width;
- touch controls remain practical;
- no critical content is hidden solely to preserve a desktop layout.

### 18.3 Hint behavior

- Every hint is explicitly opened by the learner.
- Hint usage is saved on the attempt.
- Progressive reveal prevents accidental display of a complete answer.
- Exam mode contains no learner-facing hint controls.
- Assistance status remains visible in results and history.

### 18.4 Results hierarchy

Show in this order:

1. task completion and blocking issues;
2. two or three strengths;
3. one to three priorities;
4. evidence and detailed correction;
5. targeted practice actions;
6. alternative ideas or reviewed model;
7. retry/related-prompt action.

## 19. AI and service requirements

### 19.1 Task-aware APIs

The current `/api/correct` endpoint receives text only and is explicitly prompted for EE. Replace or extend it with task context:

```text
POST /api/evaluate
{
  skill,
  task,
  promptId,
  promptVersion,
  instruction,
  responseText,
  transcriptMetadata?,
  mode,
  assistanceUsed
}
```

The server must select a versioned evaluator prompt by skill/task and validate structured output.

### 19.2 Keep correction and evaluation separable

Task evaluation and exact-span correction have different failure modes. They may share one model call initially for cost, but their schemas and UI states should remain conceptually separate so one can fail without erasing the other.

### 19.3 Guardrails

- validate skill/task combinations;
- enforce request-size bounds;
- reject empty or implausibly large responses;
- use structured schemas and normalization;
- record evaluator version with the attempt;
- never send private source PDFs to the model at learner runtime;
- avoid logging full learner writing/audio transcripts by default;
- show when evaluation is unavailable and preserve the attempt;
- do not fabricate official scores or examiner claims;
- cache immutable reviewed content, not personalized evaluations across users.

### 19.4 Deployment constraint

The current APIs exist only as Vite dev/preview middleware. Before treating AI evaluation as a production feature, define a deployable server boundary with:

- authentication or an explicit single-user deployment model;
- rate limiting;
- request limits;
- secret handling;
- timeout and retry behavior;
- privacy-safe logging;
- provider fallback visibility;
- usage/cost controls.

The local static application must remain usable when AI endpoints are unavailable.

## 20. Privacy, storage, and learner control

- Store drafts, attempts, and audio locally by default.
- Clearly state when text or transcripts are sent to an external LLM provider.
- Require explicit consent before any future server audio upload.
- Allow deletion of one attempt, one audio file, one vocabulary item, or all local EE/EO data.
- Allow export/backup before adding cloud sync.
- Do not place API keys or private source content in client bundles.
- Preserve an attempt if evaluation fails or the browser closes.
- Add storage-quota warnings, especially for EO audio.
- Provide a policy for pruning audio while retaining transcript/evaluation metadata.

## 21. Accessibility requirements

- All mode/task tabs and controls are keyboard accessible.
- Timer, recording, paused, finished, warning, and error states use visible text and appropriate live regions.
- Selected options and hint states are conveyed beyond color.
- Audio controls have task-specific accessible names.
- Recorder level meters are supplementary and not required to complete a task.
- Feedback highlights link to textual explanations.
- Focus moves predictably when submitting, applying a correction, or starting a drill.
- Motion and auto-advancing coaching respect reduced-motion preferences where applicable.
- Model audio includes transcripts.

## 22. Success measures

Because this is initially a local-first personal product, metrics may be computed on-device and shown to the learner without telemetry.

### Leading indicators

- completed EE/EO attempts per week;
- percentage of sessions reaching submission;
- percentage of attempts followed by one targeted drill;
- percentage of priority feedback items retried;
- use of related prompts rather than only exact retries;
- review completion rate;
- proportion of vocabulary items later used in production.

### Learning indicators

- increased task-requirement completion;
- reduced out-of-range EE responses;
- reduced repeated errors per 100 words;
- broader EO Task 2 category coverage;
- increased unassisted response duration toward task expectations;
- fewer long silences where measurement is reliable;
- improvement between linked attempts;
- movement from guided to unassisted practice.

### Guardrail indicators

- evaluation failure rate;
- percentage of feedback without valid evidence;
- transcription edit rate, used as a warning about recognition quality rather than learner ability;
- content records blocked by review validation;
- local storage quota failures;
- number of learner-facing unreviewed content items, which must remain zero.

## 23. Phased delivery plan

### Phase 0 — Correctness and foundations

**Outcome:** Existing EO behavior no longer teaches the wrong exam sequence.

- Correct EO timing and preparation state.
- Update task descriptions and total duration.
- Separate guided training assistance from exam conditions.
- Fix home/TCF route availability inconsistency.
- Add stable IDs and versions to existing prompts.
- Prevent draft/recording association from changing silently when prompts change.
- Document official facts with source and last-reviewed date.

### Phase 1 — Reviewed content expansion

**Outcome:** Learners can practice varied, trustworthy prompts.

- Implement canonical content schema and validation.
- Add source manifest and editorial workflow.
- Curate at least 80 EO Task 2 scenarios.
- Curate at least 60 EO Task 3 prompts across six themes.
- Create reviewed connector and collocation banks.
- Add filters/random selection by task, theme, objective, and unseen status.
- Author a balanced initial EE expansion using resource themes without copying source text.

### Phase 2 — Task-aware coaching and micro-drills

**Outcome:** Resource knowledge appears where it improves preparation, not as static reference pages.

- Add Learn / Guided / Exam assistance rules.
- Add EO Task 2 category and question-form drills.
- Add EO Task 3 argument-development drills.
- Add EE task checklist and task-specific micro-drills.
- Add progressive hints with usage tracking.
- Replace questionable CEFR synonym ladders with reviewed nuance/collocation records.

### Phase 3 — Attempts and task-aware evaluation

**Outcome:** Each production becomes durable evidence with actionable feedback.

- Add immutable EE/EO attempt history using IndexedDB patterns.
- Preserve multiple EO takes by prompt/attempt.
- Add self-assessment.
- Introduce task-aware evaluation schemas.
- Separate oral transcript language feedback from delivery proxies.
- Add linked retry/related-prompt flow.

### Phase 4 — Shared review and cross-platform practice

**Outcome:** Corrections and comprehension content generate practice throughout the app.

- Activate shared vocabulary/review module.
- Save vocabulary from EE, EO, CE, CO, and correction output.
- Connect correction categories to conjugation/grammar drills.
- Add CE/CO → EE/EO transfer activities.
- Surface due reviews and recommendations on Home and TCF landing.
- Add rule-based, explainable next-practice recommendations.

### Phase 5 — Richer oral and calibrated content

**Outcome:** EO better approximates interaction and supports model-based comparison.

- Add bounded EO Task 2 examiner simulation.
- Add server transcription fallback only with privacy controls.
- Add reviewed model writing and model recordings.
- Add turn-level interaction review and time-anchored audio feedback.
- Explore human rating/calibration before any numeric readiness estimate.

## 24. Dependencies

- Fluent French editorial reviewer.
- Current official task documentation and periodic re-verification.
- Decision on whether derived source content can be distributed.
- IndexedDB migration/version strategy.
- Deployable API plan if AI features are expected outside local Vite preview.
- Evaluation prompt/schema test corpus.
- Browser support policy for recording and transcription.
- Audio storage/quota policy.

## 25. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Wrong EO format is reinforced | High | Phase 0 blocker; source and version official facts |
| Unlicensed content is redistributed | High | Do not ship PDFs; rewrite; retain provenance; verify rights |
| Incorrect source French reaches learners | High | Review states, automated checks, manual linguistic review |
| LLM feedback appears authoritative | High | Evidence requirements, non-official labels, no official score |
| Browser transcript errors become “learner errors” | High | Separate transcript and audio evidence; allow edits; no pronunciation claims |
| Hints create memorized scripts | Medium | Progressive reveal, post-attempt models, assistance tracking, variants |
| Prompt quantity creates duplication | Medium | Canonical topics, semantic clustering, variant relationships |
| Local audio fills storage | Medium | Quota warning, per-attempt deletion, audio pruning/export policy |
| Fragmented storage becomes unmaintainable | Medium | Shared attempt/content IDs and explicit IndexedDB migrations |
| AI unavailable in static deployment | High | Offline core flow, deployable API decision, graceful failure |
| Progress compares guided and exam attempts | Medium | Mode and assistance recorded; separate comparisons |
| “Advanced vocabulary” becomes unnatural | Medium | Collocations/nuance over synonym ladders; spoken/written register tags |

## 26. Testing and validation strategy

### 26.1 Content tests

- schema validation for every reviewed record;
- unique and stable IDs;
- correct task timing and word bounds;
- duplicate normalized prompt detection;
- source/review metadata required;
- valid roles for EO Task 2;
- two distinct viewpoints for EE Task 3;
- no unreviewed record in production content exports.

### 26.2 Unit tests

- word count and boundary statuses;
- task timer transitions, especially EO preparation changes;
- prompt/attempt association;
- attempt serialization and migration;
- correction/evaluation normalization;
- recommendation rules;
- vocabulary deduplication and source retention;
- connector/construction drill scoring.

### 26.3 Component tests

- Learn / Guided / Exam hint visibility;
- EO state machine for all three tasks;
- submission and self-check flow;
- evaluation partial failure;
- saving/deleting multiple audio attempts;
- keyboard and accessible-name behavior;
- 360 px layouts for primary flows.

### 26.4 End-to-end scenarios

1. Complete a three-task EE mock in 60-minute format and retain all submitted responses.
2. Complete EO Task 2 with 2-minute preparation and a total 5:30 task window.
3. Complete EO Task 3 without preparation in Exam mode.
4. Open hints in Guided mode and verify assistance is visible in history.
5. Submit while AI is unavailable and later evaluate the saved attempt.
6. Save a correction term, review it, and use it in a related production attempt.
7. Turn a CE/CO item into a production exercise and retain source links.
8. Reload after recording and recover the correct prompt-specific attempt.

### 26.5 Evaluation quality checks

Create a fixed internal corpus containing:

- on-topic and off-topic responses;
- missing task requirements;
- under/over word responses;
- strong and weak reformulations;
- EO Task 2 lists of questions with varied coverage/register;
- EO Task 3 responses with unsupported claims or weak organization;
- transcripts with natural spoken disfluencies;
- repeated source phrases and adversarial prompt text.

For each evaluator version, verify:

- required issues are found;
- evidence exists in the response or task instruction;
- no official score is claimed;
- oral language is not over-corrected into formal prose;
- results remain structurally valid across providers.

## 27. Release acceptance criteria

### Phase 0

- EO displays and enforces 2:00 Task 1, 5:30 Task 2 including 2:00 preparation, and 4:30 Task 3 without preparation in Exam mode.
- Total official simulation duration is 12:00.
- Non-official preparation aids are visibly labeled and absent from Exam mode.
- Existing drafts and audio cannot be silently attached to another prompt.
- EO is no longer shown as disabled on the home shortcut.

### Content release

- Every learner-facing imported/derived record has a stable ID, version, tags, source status, and two completed review states.
- At least 80 reviewed EO Task 2 scenarios cover all eight source domains.
- At least 60 reviewed EO Task 3 prompts cover all six source themes.
- No known incorrect connector example or unsupported CEFR synonym ladder is exposed.
- Duplicate topic variants are linked rather than represented as unrelated content.

### Training loop release

- Learner can complete Learn, Guided, and Exam practice with appropriate assistance rules.
- Submitted EE/EO attempts are immutable and visible in history.
- Multiple EO takes persist by prompt and attempt.
- Feedback includes task fulfillment, evidence, language correction, and no more than three priorities.
- At least one priority can launch a targeted drill or related retry.
- AI failure does not lose learner work.

### Cross-platform release

- Learner can save vocabulary from at least EE, EO, CE, and CO with source metadata.
- Review includes active production, not recognition alone.
- Repeated correction categories can recommend a relevant drill.
- Home or TCF landing exposes one explainable next action and due-review count.
- Guided and unassisted attempts are distinguishable in progress summaries.

## 28. Open decisions

1. **Distribution rights:** Can any rewritten derivative of the private PDFs be distributed, or must all source-inspired content remain personal/local?
2. **Editorial ownership:** Who performs linguistic and exam-format review?
3. **EE corpus:** Which source will supply dedicated EE prompts, models, and annotated responses?
4. **Models:** Should initial model responses be human-authored, AI-drafted then reviewed, or both?
5. **Production deployment:** Is the target local Vite preview, a private hosted app, or a multi-user service?
6. **Audio retention:** Keep all EO takes, cap by age/count, or ask the learner?
7. **Transcription:** Is browser-only transcription acceptable, or is consent-based server transcription required?
8. **Review algorithm:** Start with a simple box/Leitner schedule or implement a more advanced scheduler after enough usage data?
9. **Human calibration:** Is trained-rater review available to validate task-aware evaluations?
10. **Language of UI feedback:** French only, or French feedback with optional English explanation?

## 29. Recommended immediate backlog

1. Fix official EO task timing/preparation and update all affected descriptions and structures.
2. Add stable prompt IDs and prompt-version-aware draft/audio keys.
3. Create the source manifest for the four PDFs, including hashes and distribution restrictions.
4. Define and validate the canonical prompt/content schema.
5. Curate a 20-scenario EO Task 2 pilot spanning all eight domains.
6. Curate a 12-topic EO Task 3 pilot spanning all six themes.
7. Correct and model the connector bank by function/register/construction.
8. Replace adjective ladders with a small reviewed place/atmosphere/person collocation pilot.
9. Implement one task-aware evaluation pilot for EO Task 2 and one for EE Task 3.
10. Add immutable attempt persistence before building progress UI.
11. Add one correction-to-drill path using the existing conjugation quiz.
12. Validate the complete loop with real learner attempts before expanding to the full source corpus.

## 30. Definition of success

This initiative succeeds when the platform no longer merely offers more prompts. It should reliably move a learner through:

- varied, correctly formatted practice;
- appropriately limited support;
- preserved evidence of performance;
- task-aware and evidence-based feedback;
- focused repair of recurring weaknesses;
- active reuse of vocabulary and structures;
- a related unassisted attempt;
- visible improvement over time.

The four supplied PDFs are sufficient to seed a strong EO Task 2/3 and shared-language content system. They are not sufficient by themselves for comprehensive EE/EO training. The product value comes from combining their reviewed insights with accurate exam modeling, task-specific evaluation, deliberate practice, and cross-platform review.
