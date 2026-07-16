# PRD — Compréhension orale (CO), TCF Canada

**Status:** Approved for local implementation  
**Owner:** TBD  
**Target release:** Local feature complete; deployment is out of scope  
**Last updated:** 2026-07-14

## 1. Summary

Build the **Compréhension orale (CO)** section of the app as a local-first TCF Canada practice environment. It should reuse the useful concepts from **Compréhension écrite (CE)**—question bank, exam mode, timer, submission, score, correction, reasoning, vocabulary, and persistence—while adding folder upload, drag-and-drop import, question images, and one audio player per question.

The learner imports a folder containing:

- one Markdown (`.md`) file with `# Les questions` and `# Le corrigé` sections;
- one audio file per question; and
- optionally, images referenced by or embedded in the Markdown.

After import, the complete test is available in question order. During practice, the learner sees one question at a time in a computer-based TCF-style view, with clearly visible answer choices and one active audio player. Starting the attempt automatically plays question 1; after each recording and a configurable answer interval, the experience advances and plays the next question until the last question or until the learner pauses. After submission, the learner sees an estimated practice score on a 0–699 scale, raw score, correct answer, their answer, transcript/correction content, explanation, and vocabulary for every question.

## 2. Context and evidence

### Existing application

- Vue 3 + Vite, with a small hash router and no external state-management or routing dependency.
- `/tcf/co` currently renders a “Coming soon” page.
- CE already provides three relevant states: question-bank editing, exam, and results.
- CE persists question content and in-progress answers in `localStorage`.
- The TCF landing page currently labels CO as “39 questions QCM, 25 min”. This conflicts with current TCF Canada references describing **39 questions in 35 minutes** and must be corrected before launch.

### Supplied fixture: `/Users/matingh/Desktop/example-CO`

The sample folder contains:

- 20 MP3 files named `38 (1).mp3` through `38 (20).mp3`;
- one Markdown file, approximately 1.45 MB because four images are embedded as base64 data URLs;
- duplicate `# Les questions` and `# Le corrigé` headings;
- 20 question blocks and 20 matching correction blocks;
- image-only context for questions 1–4;
- placeholder choices in the question section for questions 1–10, with the actual transcript/options supplied in the correction section;
- visible prompts and choices in the question section for questions 11–20;
- corrected blocks containing transcripts, correct answers, reasoning, and inline vocabulary annotations;
- exactly one audio file for each question, with durations ranging from about 13 to 72 seconds.

The importer must therefore merge the public question block and private correction block by question number rather than treating them as separate questions.

A second supplied fixture, `/Users/matingh/Desktop/example2-CO`, confirms the same 20-question, duplicated-heading, placeholder-option, four-embedded-image structure. In that fixture the Markdown is at the selected folder root while all MP3 files are nested under `CO-39/`. Recursive asset discovery is therefore required.

### Confirmed TCF behavior used as design guidance

- TCF Canada CO is 39 questions in 35 minutes.
- Questions become progressively more difficult.
- In the official listening experience, each question has a fixed time and progression to the next question is automatic.
- The recording and spoken question are heard once in official conditions.
- The question is spoken after the listening material and is not written; answer options are visible.
- The exact universal number of seconds between questions is not published in the authoritative material reviewed. Third-party reports vary, so v1 must call its interval a **practice answer interval**, not an official TCF interval.

This product intentionally relaxes official restrictions because v1 is **Mode entraînement**: pause, replay, seeking, and backward navigation are allowed.

## 3. Goals

1. Let a learner import a complete CO practice set by selecting or dropping one folder.
2. Parse the supplied Markdown structure without requiring the learner to edit it first.
3. Reliably map each numbered question to its correction, image, and audio file.
4. Present one question at a time in a clear computer-based TCF-style sequence, with navigation to any available question.
5. Automatically sequence question audio while providing accessible play/pause, replay, seeking, duration, and listening-count feedback.
6. Keep correction data hidden until submission.
7. On submission, show score, correct/incorrect/unanswered status, explanation, transcript, and vocabulary.
8. Preserve the imported set, in-progress answers, and previous attempt history across refreshes on the same device.
9. Work responsively in current desktop and mobile browsers supported by the app.

## 4. Non-goals for v1

- User accounts or cross-device synchronization.
- Server-side storage of copyrighted audio or test content.
- Automatic speech transcription.
- AI-generated explanations or vocabulary.
- Claiming that the estimated 0–699 practice score is an official TCF result. Official scoring depends on calibrated item difficulty, which imported practice sets do not provide.
- DRM or prevention of browser-level audio extraction.
- A strict exam mode that disables pause, replay, seeking, or backward navigation.
- Authoring a CO set entirely from scratch in the UI.
- Supporting archives (`.zip`, `.rar`) unless explicitly added to scope.

## 5. User stories

### Import

- As a learner, I can drag a folder onto the CO page or choose it using a folder picker.
- As a learner, I see which Markdown, audio, and image files were detected before beginning.
- As a learner, I receive actionable errors for missing, duplicate, or unmatched files.
- As a learner, I can review the parsed question count and audio mapping before replacing my current set.

### Practice/exam

- As a learner, I see questions in numerical order with A–D choices.
- As a learner, I can play, pause, and resume the audio attached to each question.
- As a learner, starting a practice attempt automatically plays the first question and continues through the set.
- As a learner, pausing the current audio pauses the complete attempt and autoplay sequence.
- As a learner, I can select or change one answer per question before submission.
- As a learner, I can navigate backward or forward and change previous answers.
- As a learner, I can see progress, elapsed time, the proportional TCF practice benchmark, and unanswered questions.
- As a learner, I can refresh or leave and later resume my attempt.

### Results

- As a learner, I submit once and immediately see my raw score, percentage, and clearly labeled estimated 0–699 practice score.
- As a learner, I see my choice and the expected choice for every question.
- As a learner, I see the hidden transcript/correction, reasoning, and vocabulary only after submission.
- As a learner, I can replay audio while reviewing corrections.
- As a learner, I can restart the same imported test without re-uploading the folder.

## 6. Proposed experience

### 6.1 Empty/import state

The CO route opens on an import screen when no set is available.

1. Display a large drop zone: **“Déposez le dossier du test ici”**.
2. Provide a secondary **“Choisir un dossier”** button using a folder input (`webkitdirectory`) where supported.
3. Also accept dragged folders through the browser directory-entry API where supported.
4. Explain the expected contents: one `.md` manifest plus numbered MP3 files.
5. Keep files local to the browser; state this beside the drop zone.
6. Discover files recursively beneath the selected folder.
7. After reading the folder, show an import review:
   - set title inferred from the Markdown filename;
   - number of questions and corrections;
   - number of audio files;
   - number of images;
   - mapping status per question;
   - warnings and blocking errors.
8. Enable **“Importer le test”** when at least one valid question has four options, one correction, one correct answer, and one mapped playable MP3. Questions without audio are reported and skipped after explicit user confirmation.

Drag-and-drop and folder picker are two entry points into the same import pipeline.

### 6.2 Imported-set overview

Once imported, show:

- test title;
- question count;
- total audio duration;
- validation warnings;
- **“Commencer / Reprendre”**;
- **“Remplacer le dossier”**;
- **“Supprimer ce test”** with confirmation.
- previous attempts with date, raw score, estimated practice score, question count, and elapsed time.

For a 20-question set such as the supplied fixture, label it **“Série d’entraînement — 20 questions”**, not a complete 39-question mock exam.

### 6.3 Exam/practice layout

V1 uses one question per screen, following the computer-based TCF listening pattern while retaining practice controls. A compact numbered question navigator allows free backward/forward movement and highlights answered, unanswered, and current questions.

Sticky status bar:

- **Compréhension orale** and set name;
- question progress (`12 / 20 répondues`);
- elapsed count-up timer;
- proportional practice benchmark and over-time warning;
- pause/resume for the attempt and current audio;
- submit button.

Each question card contains:

1. `Question N sur M` and answer-state indicator.
2. Optional embedded image, preserving aspect ratio; click-to-enlarge is not required.
3. A question-specific audio player:
   - play/pause toggle, where pausing also pauses the attempt;
   - replay control;
   - current time and duration;
   - progress bar;
   - loading/error status;
   - accessible label (`Lire l’audio de la question N`);
   - source filename and total duration;
   - listening/play count;
   - only one question audio plays at a time.
4. The public prompt is not displayed during the attempt because the TCF listening question is spoken in the recording. It remains available after submission. Image-based material is displayed when present.
5. Four large radio options labeled A, B, C, and D.
6. Previous/next navigation and direct numbered navigation.

Correction-only content must never be rendered or exposed through obvious UI state before submission. In the supplied fixture:

- questions 1–4 use an image plus answer options obtained from the correction block;
- questions 5–10 use the response choices from the correction block;
- questions 11–20 use the public prompt/options while the transcript remains hidden.

The importer should choose meaningful corrected options over placeholders such as `Proposition A`.

### 6.4 Playback sequence and pause behavior

1. The learner clicks **“Commencer”**. Browser autoplay policy is satisfied by this user gesture.
2. The count-up timer starts and question 1 audio plays automatically.
3. When the recording finishes, show a visible answer countdown using a default **10-second practice answer interval**.
4. At the end of the interval, advance to the next question and start its audio automatically.
5. Repeat through the last valid question.
6. After the last interval, remain on the last question and let the elapsed timer continue until manual submission.
7. If the learner pauses audio, pause the complete attempt: timer, current audio, and answer countdown all stop.
8. Resume continues from the exact audio/countdown position.
9. Navigating manually cancels the pending auto-advance, pauses the previous audio, and makes the selected question current. The learner starts or resumes that question explicitly; autoplay sequencing then continues from it.
10. Seeking and replay are allowed and increment listening/play counters as appropriate.

The 10-second interval is configurable in code and explicitly labeled as a practice setting. It must not be described as an official TCF timing because no authoritative universal inter-question value was found.

### 6.5 Practice timing benchmark

The timer counts upward and never auto-submits.

- Full benchmark: `35:00` for 39 questions.
- Imported-set benchmark: `questionCount × (35 minutes / 39)`, rounded to the nearest second.
- Example: 20 questions produce a benchmark of approximately `17:57`.
- When elapsed time first exceeds the benchmark, show a non-blocking visual and accessible alert. Continue timing in an overtime state.
- Paused time is excluded.
- Skipped questions without audio are excluded from `questionCount`.

### 6.6 Submission and results

On **“Terminer et corriger”**:

1. If questions are unanswered, show a confirmation with the count.
2. Stop the timer and all audio.
3. Lock the submitted attempt.
4. Show summary:
   - correct / total;
   - percentage;
   - estimated practice score from 0–699;
   - explicit disclaimer: `Estimation d’entraînement — ce résultat n’est pas un score officiel du TCF`;
   - answered / unanswered;
   - elapsed time.
5. For every question, show:
   - correct, incorrect, or unanswered badge;
   - image and prompt;
   - all choices;
   - the learner’s choice;
   - the correct choice;
   - replayable audio;
   - **Transcription / corrigé**;
   - **Explication** from `Raisonnement`;
   - **Vocabulaire à retenir** with word, definition, and lemma(s).
6. Provide **“Refaire le test”** and **“Importer une autre série”**.
7. Save the submitted attempt to local attempt history.

### 6.7 Estimated 0–699 practice score

Official TCF comprehension scores are based on calibrated questions and cannot be reconstructed exactly from an arbitrary imported subset. V1 therefore provides a transparent linear estimate:

```text
estimatedPracticeScore = round((correctAnswers / scorableQuestions) × 699)
```

- The denominator is the number of imported, playable, scorable questions—not 39.
- Incorrect and unanswered questions both contribute zero.
- A result can range from 0 to 699 as requested.
- Always show the raw result beside the estimate (for example, `14/20 · 70% · estimation 489/699`).
- Never label the estimate as an official score or use it as immigration guidance.
- Do not assign CEFR/NCLC bands from the estimate in v1 because the practice set lacks calibrated item difficulty.

## 7. Import contract

### 7.1 Folder acceptance

Required:

- exactly one `.md` file anywhere inside the selected folder tree;
- at least one `.mp3` file that maps to a valid question;
- at least one complete, scorable question after validation.

All files are discovered recursively. V1 supports MP3 only. If WAV, M4A, OGG, or another audio type is found, show an unsupported-format error naming the file; do not attempt to import it.

Ignore harmless OS files such as `.DS_Store`.

Block import when:

- no Markdown file exists;
- multiple Markdown files exist and selection is ambiguous;
- no question section or correction section can be found;
- no valid question remains after skipping invalid items;
- the browser cannot decode any mapped audio file.

Warn, but allow import when:

- question numbering has gaps;
- duplicate top-level headings exist;
- reasoning or vocabulary is absent;
- question count is not 39;
- an optional image is missing or malformed.
- a question lacks audio and will be skipped;
- duplicate audio candidates exist and one was selected deterministically;
- extra or unsupported audio files are ignored.

### 7.2 Markdown parsing

Normalize CRLF/LF line endings and parse headings case-insensitively while tolerating Markdown emphasis:

- `# Les questions`
- `# Le corrigé`
- `## Question 1`
- `## **Question 1**`

Duplicate section headings, as in the fixture, should be collapsed rather than producing empty sections.

Question identity is the integer in `Question N`. Merge public and correction blocks by this identity, never only by array position.

Recognize options in these forms:

- `A. texte`
- `A) texte`
- `A: texte`

Recognize answer keys such as:

- `Réponse Correcte : B`
- `Réponse Correcte : B)`
- `Réponse : B`

Recognize explanations introduced by `Raisonnement:` or `Explication:`.

For each correction block:

1. Extract the correct answer.
2. Extract reasoning separately.
3. Treat content before the final prompt/options as the hidden transcript.
4. Extract inline vocabulary annotations in the existing CE convention: `mot (définition ; lemme, autre lemme)`.
5. Remove annotation markup from learner-facing prompt/options/transcript while preserving it as structured vocabulary.
6. Remove basic Markdown emphasis and escaped punctuation from plain-text fields.

### 7.3 Public option resolution

For each question, determine visible options in this order:

1. Use non-placeholder options from `Les questions`.
2. Otherwise use options parsed from the matching `Le corrigé` block.
3. Fail validation if neither source yields all four A–D options.

Prompt resolution:

1. Prefer the prompt from `Les questions`.
2. Otherwise use the final question-like line before correction options.
3. A prompt may be intentionally empty for image/listen-and-respond question types.

### 7.4 Images

Support the fixture’s Markdown reference syntax and embedded data URL definitions:

```md
![][image1]
[image1]: <data:image/png;base64,...>
```

Do not copy embedded image data into `localStorage`. Store binary assets in IndexedDB.

External and relative-file images are out of scope for v1; imported question images must be embedded data URLs.

### 7.5 Audio mapping

For the fixture, `38 (N).mp3` maps to `Question N` using the integer in the final parentheses.

Recommended accepted filename patterns:

- `38 (12).mp3`
- `Question 12.mp3`
- `question-12.mp3`
- `q12.mp3`
- `12.mp3`

Mapping rules:

1. Prefer the integer in final parentheses immediately before `.mp3`, regardless of the preceding name or nested path.
2. If that pattern does not exist, attempt known `Question N`, `question-N`, `qN`, or standalone-number patterns.
3. Do not treat unrelated numbers in a filename as question numbers when a more specific pattern exists.
4. Parse a single candidate question number using known patterns.
5. Match it to the Markdown question number.
6. If multiple MP3s map to one question, select the lexicographically first relative path deterministically and warn with all candidate filenames.
7. If no MP3 maps to a question, alert the learner and skip that question after import confirmation.
8. Sort numerically, never lexicographically (`2` before `10`).

## 8. Data model

```js
ListeningSet = {
  id,
  title,
  importedAt,
  sourceMarkdownName,
  questions: ListeningQuestion[],
  validationWarnings: string[]
}

ListeningQuestion = {
  number,
  prompt,
  options: { A, B, C, D },
  imageAssetId: null | string,
  audioAssetId: string,
  audioFileName,
  audioDurationSeconds,
  correctAnswer: 'A' | 'B' | 'C' | 'D',
  transcript,
  reasoning,
  vocabulary: [{ word, definition, lemmas: string[] }]
}

ListeningAttempt = {
  id,
  setId,
  status: 'not-started' | 'in-progress' | 'paused' | 'submitted',
  answers: { [questionNumber]: null | 'A' | 'B' | 'C' | 'D' },
  elapsedSeconds,
  startedAt,
  submittedAt,
  playback: { [questionNumber]: { playCount, lastPositionSeconds } }
}
```

## 9. Persistence and privacy

- Use **IndexedDB** for imported Markdown-derived records, audio blobs, and image blobs. Audio cannot safely fit in `localStorage` quotas.
- Keep only lightweight preferences in `localStorage` if useful.
- Recreate object URLs from IndexedDB blobs when loading the page and revoke them when replaced/unmounted.
- Store data only on the learner’s device in v1; no server upload.
- Explain that clearing browser site data removes imported tests and attempts.
- Retain one active imported set and multiple completed attempts for that set.
- Replacing or clearing the active set removes its assets and attempt history after confirmation.
- Provide an explicit delete action that removes the set, all attempts, audio, and images.
- If browser storage quota is exceeded, preserve the existing set and report that the new import was not saved.

## 10. Accessibility and responsive requirements

- All import and player actions must be keyboard operable.
- Folder drop zone must also have a standard button alternative.
- Radio groups need a question-specific accessible name.
- Play/pause state must be available to assistive technology.
- Do not communicate result state by color alone; include text/icon labels.
- Maintain visible focus styles.
- Use at least 44×44 px touch targets for audio and answer controls on mobile.
- Images must fit the card width and support meaningful alt text when present; otherwise use `Illustration de la question N`.
- Respect `prefers-reduced-motion` for nonessential animation.

## 11. Error and edge-case behavior

- **Wrong item dropped:** explain that a folder is expected; optionally allow selecting all required files as a fallback.
- **Multiple sets in one folder:** block and ask for a single set folder in v1.
- **Duplicate question/correction number:** use the first non-empty block, warn, and list duplicates; fail only if no complete merged question can be formed.
- **Missing audio:** alert, identify, and skip affected questions after confirmation.
- **Duplicate mapped audio:** choose one deterministically and warn.
- **Extra audio:** warn and list ignored files.
- **Corrupt/unsupported audio:** skip affected question(s), name the file, and fail only if none remain.
- **Missing correction/correct answer/options:** skip the affected question and fail only if none remain.
- **No reasoning/vocabulary:** allow with a warning; omit empty result sections.
- **Malformed base64 image:** warn and continue only if the image is not essential to answer; otherwise this needs manual review.
- **Refresh while audio plays:** restore attempt and answers, but do not autoplay.
- **Replacing a set during an attempt:** require confirmation and delete the old attempt only after the new import succeeds.
- **Practice benchmark exceeded:** announce overtime once and continue; never auto-submit.

## 12. Acceptance criteria

### Import

- Both supplied `example-CO` and `example2-CO` folders can be selected and drag-dropped in Chrome.
- It imports exactly 20 ordered questions, 20 corrections, 20 audio files, and four embedded images.
- It recursively discovers the 20 `example2-CO` MP3s nested under `CO-39/`.
- Every imported question has four visible choices and one uniquely mapped audio file.
- Questions 1–10 do not display placeholder `Proposition A/B/C/D` when corrected options exist.
- Duplicate section headings in the fixture do not cause duplicate questions.
- Import validation reports the set as a 20-question training series, not a full mock exam.
- Multiple Markdown files cause import to fail with a clear message.
- Unsupported audio formats are named and rejected; missing-audio questions are named and skipped after confirmation.
- Multi-file drag-and-drop works as a fallback when folder upload is unavailable.

### Exam/practice

- Clicking **Commencer** starts the timer and question 1 audio without a second gesture.
- Each question has working play/pause/resume, replay, and seeking controls.
- Pausing audio pauses the timer and pending answer countdown; resuming restores all three correctly.
- Audio completion starts a visible 10-second practice countdown, then advances and starts the next question.
- Starting one question’s audio pauses any other playing audio.
- Only one question is shown at a time; the learner can navigate to previous/next/numbered questions.
- Audio filename, duration, and play count are visible.
- Selecting an answer updates answered progress and survives refresh.
- Unanswered questions are visibly identified, and submission asks for confirmation when any remain.
- Elapsed time turns to an overtime state and announces an alert after the proportional `35/39` benchmark without auto-submitting.
- Correction data, correct-answer markers, transcripts, reasoning, and vocabulary are not visible before submission.
- The UI remains usable at 360 px width and by keyboard.

### Results

- Submitting produces the correct raw score for the selected answers.
- Submitting shows `round(correct / scorable × 699)` as an explicitly non-official practice estimate.
- Every question shows learner choice, correct answer, and status.
- Expanded transcript, reasoning, and parsed vocabulary appear for every question after submission when present.
- Audio remains playable during review.
- Restart clears answers/time but retains the imported set and assets.
- Multiple completed attempts remain visible until the active set is cleared or replaced.

### Regression

- Existing CE, EE, EO, conjugation, and grammar-correction routes still build and load.
- The TCF landing card and CO coming-soon route are replaced by the live CO experience.
- The production build succeeds without console errors.

## 13. Suggested implementation slices

### Slice 1 — Parser and fixture validation

- Extract a pure CO Markdown parser.
- Add the supplied content as local test fixtures; the user confirmed that the attached questions may be copied into the repository and have no copyright restriction.
- Cover duplicate headings, bold question headings, placeholder replacement, corrections, vocabulary, embedded images, and audio filename matching.

### Slice 2 — Import and persistence

- Add folder picker/drop zone and review screen.
- Add IndexedDB storage for set metadata and binary assets.
- Add transactional replace/delete behavior and quota errors.

### Slice 3 — Practice and results UI

- Add question cards, exclusive audio playback, answers, timer, pause, submission, and corrections.
- Restore in-progress attempts.
- Enable `/tcf/co` and update landing-page duration/availability.

### Slice 4 — Release hardening

- Keyboard/mobile testing.
- Browser testing for directory upload and drag/drop fallbacks.
- Production build and regression smoke test.
- Validate parser against at least two additional independently produced CO folders.

## 14. Testing strategy

The project currently has no automated test runner. This feature’s parser and persistence logic are sufficiently error-prone to justify adding a lightweight test setup (recommended: Vitest with IndexedDB mocked only where necessary).

Minimum automated coverage:

- Markdown section/question/correction parsing;
- option and correct-answer variants;
- placeholder-option replacement;
- vocabulary extraction and annotation stripping;
- embedded data-URL image parsing;
- audio filename mapping and ambiguity detection;
- recursive discovery, duplicate/missing/unsupported audio behavior;
- estimated scoring for partial sets, unanswered state, and restart behavior;
- autoplay, pause/resume, answer countdown, and proportional benchmark timing.

Manual browser target for v1:

- latest Chrome on macOS: picker, recursive directory drag/drop, multi-file fallback, persistence, autoplay, and results;
- responsive/mobile viewport and keyboard-only desktop pass in Chrome.

Safari, Firefox, Edge, and iOS Safari are best-effort and not release blockers for v1.

## 15. Release and observability

1. Keep CO disabled until the fixture passes all acceptance criteria.
2. Run a production build and smoke-test all TCF routes.
3. Deliver working code locally. Deployment is not part of the current release scope; no API or environment variable is required for v1.
4. If product analytics are desired, track only non-content events (import success/failure category, start, submit, restart). Never send filenames, Markdown, transcripts, answers, or audio.
5. Monitor import failure categories and browser/storage errors after launch.

## 16. Resolved product decisions

- Product: TCF Canada CO practice, not TCF Tout Public or Québec.
- Format reference: 39 questions in 35 minutes; imported sets may contain any positive number of valid questions.
- Mode: training only; pause, replay, seeking, and free navigation are allowed.
- Presentation: one question at a time, answer options visible, written prompt hidden until results, images visible when required.
- Sequence: question 1 autoplays after Start; subsequent questions autoplay after a 10-second practice answer interval.
- Pause: pausing audio pauses the entire attempt, including timer and pending auto-advance.
- Timing: count upward; proportional `35/39` benchmark; alert and continue when exceeded; never auto-submit.
- Scoring: raw score, percentage, and clearly labeled linear 0–699 practice estimate; no official-score claim or CEFR/NCLC estimate.
- Import: one recursively discovered Markdown file, recursive MP3 discovery, embedded images, one active set, no authoring editor.
- Invalid assets: unsupported formats are reported; missing/invalid-audio questions are reported and skipped; duplicate matches select one deterministically with a warning.
- Results: all questions, expanded transcripts, explanations, vocabulary, and replayable audio.
- Persistence: browser-local, offline, one active set, multiple completed attempts, clear/replace action.
- Export, cloud sync, saved-vocabulary lists, image enlargement, rich Markdown rendering, and strict exam mode are out of scope.
- Browser: Chrome is the required launch target; multi-file drag/drop is the fallback.
- Engineering: Vitest may be added. Work is delivered locally; deployment and analytics are not required.

## 17. Open risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Folder APIs vary by browser | Import unavailable or inconsistent | Chrome target; picker plus directory drag/drop plus multi-file fallback |
| Audio exceeds browser quota | Import fails or data is evicted | IndexedDB, quota handling, explicit local-storage notice |
| Markdown is not a formal schema | Incorrect question/correction merge | Validation, pure parser tests, review screen, additional fixtures |
| Correction block contains learner-visible options | Accidental answer/transcript leakage | Normalize into separate public and private fields before rendering |
| Base64 images make Markdown very large | Slow parsing and storage duplication | Decode once into IndexedDB blob; store references only |
| “Pause/replay” differs from exam fidelity | Misleading simulation | Prominently label Mode entraînement and explain relaxed controls |
| Exact answer interval is not officially published | False fidelity claim | Use and label a configurable 10-second practice interval |
| Linear 0–699 estimate differs from calibrated official scoring | Learner may over-trust estimate | Always pair with raw score and an explicit non-official disclaimer |
| Current 25-minute label is inaccurate for TCF Canada | Learner misinformation | Update to 35 minutes before launch |

## 18. Definition of done

The feature is locally complete when a learner can open `/tcf/co` in Chrome; import either supplied fixture through folder selection, recursive drag/drop, or the multi-file fallback; review a correctly mapped 20-question set; complete the one-question-at-a-time autoplay sequence with reliable pause/replay/seeking/navigation; receive proportional timing alerts; submit and see raw plus estimated practice scoring, expanded corrections, explanations, and vocabulary; review retained attempt history; refresh and work offline; and successfully build the app with the TCF landing page accurately describing and enabling CO.
