// Audio recorder composable.
// Combines:
//   - MediaRecorder (raw audio Blob) for playback / persistence.
//   - Web Speech API (SpeechRecognition) for free, browser-side transcription.
//
// Recording controls (start / pause / resume / stop) drive a single shared
// state object so the UI can mirror it (timer sync, button labels…).

import { ref, reactive, onBeforeUnmount } from 'vue'

const hasSpeechRecognition =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition)

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const t of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t
    } catch {
      /* ignore */
    }
  }
  return ''
}

export function useRecorder() {
  // State
  const state = reactive({
    supported: typeof window !== 'undefined' && !!navigator?.mediaDevices?.getUserMedia,
    speechSupported: !!hasSpeechRecognition,
    status: 'idle', // 'idle' | 'recording' | 'paused' | 'stopping' | 'stopped' | 'error'
    error: '',
    durationMs: 0, // active recording time (excludes paused gaps)
    level: 0, // 0..1 RMS for the level meter
  })

  // Live result
  const audioBlob = ref(null)
  const audioUrl = ref('')
  const transcript = ref('') // finalized text
  const interim = ref('') // current partial sentence from Web Speech

  // Internal refs (NOT reactive, so we don't proxy MediaRecorder etc.)
  let stream = null
  let recorder = null
  let generation = 0
  let stopPromise = Promise.resolve(null)
  let recognition = null
  let audioCtx = null
  let analyser = null
  let levelRaf = 0
  let timerInterval = 0
  let startTs = 0 // ms timestamp of current active segment
  let accumulated = 0 // ms accumulated across paused gaps

  function setError(msg) {
    state.error = msg
    state.status = 'error'
  }

  function clearAudioUrl() {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = ''
    }
  }

  function tickTimer() {
    if (state.status !== 'recording') return
    state.durationMs = accumulated + (Date.now() - startTs)
  }

  function startTimer() {
    startTs = Date.now()
    stopTimer()
    timerInterval = setInterval(tickTimer, 100)
  }

  function pauseTimer() {
    accumulated += Date.now() - startTs
    stopTimer()
    state.durationMs = accumulated
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = 0
    }
  }

  function startLevelMeter(mediaStream) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      audioCtx = new AC()
      const src = audioCtx.createMediaStreamSource(mediaStream)
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      const loop = () => {
        if (!analyser) return
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const rms = Math.sqrt(sum / buf.length)
        // map ~[0, 0.3] → [0, 1]
        state.level = Math.min(1, rms * 3.3)
        levelRaf = requestAnimationFrame(loop)
      }
      loop()
    } catch {
      /* ignore meter errors */
    }
  }

  function stopLevelMeter() {
    if (levelRaf) cancelAnimationFrame(levelRaf)
    levelRaf = 0
    analyser = null
    if (audioCtx) {
      audioCtx.close().catch(() => {})
      audioCtx = null
    }
    state.level = 0
  }

  function startRecognition() {
    if (!hasSpeechRecognition) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (ev) => {
      let liveInterim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i]
        const txt = res[0]?.transcript || ''
        if (res.isFinal) {
          // append final segment with a trailing space
          const joiner = transcript.value && !transcript.value.endsWith(' ') ? ' ' : ''
          transcript.value = (transcript.value + joiner + txt.trim()).trim()
        } else {
          liveInterim += txt
        }
      }
      interim.value = liveInterim
    }
    recognition.onerror = (e) => {
      // 'no-speech' / 'aborted' are common and benign; surface only real ones
      if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        // eslint-disable-next-line no-console
        console.warn('[SpeechRecognition]', e.error)
      }
    }
    recognition.onend = () => {
      // Auto-restart while still recording (some browsers stop after silence)
      if (state.status === 'recording') {
        try { recognition.start() } catch { /* ignore */ }
      }
    }
    try {
      recognition.start()
    } catch {
      /* ignore double-start */
    }
  }

  function stopRecognition() {
    if (!recognition) return
    try {
      recognition.onend = null
      recognition.stop()
    } catch {
      /* ignore */
    }
    recognition = null
    interim.value = ''
  }

  async function start() {
    if (!state.supported) {
      setError("L'enregistrement audio n'est pas disponible dans ce navigateur.")
      return
    }
    if (state.status === 'recording' || state.status === 'paused') return

    // Reset previous take
    clearAudioUrl()
    audioBlob.value = null
    transcript.value = ''
    interim.value = ''
    accumulated = 0
    state.durationMs = 0
    state.error = ''
    const takeGeneration = ++generation
    const takeChunks = []
    let resolveTakeStop
    stopPromise = new Promise(resolve => { resolveTakeStop = resolve })

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      setError("Accès au micro refusé ou indisponible : " + (e?.message || e))
      return
    }
    const mimeType = pickMimeType()
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch (e) {
      setError("Impossible de créer l'enregistreur : " + (e?.message || e))
      return
    }
    const takeRecorder = recorder
    const takeStream = stream
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) takeChunks.push(ev.data)
    }
    recorder.onstop = () => {
      const type = takeRecorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(takeChunks, { type })
      if (takeGeneration === generation) {
        audioBlob.value = blob
        clearAudioUrl()
        audioUrl.value = URL.createObjectURL(blob)
        state.status = 'stopped'
      }
      stopLevelMeter()
      takeStream.getTracks().forEach((t) => t.stop())
      if (stream === takeStream) {
        stream = null
      }
      resolveTakeStop(takeGeneration === generation ? blob : null)
    }
    recorder.start(250)
    startLevelMeter(stream)
    state.status = 'recording'
    startTimer()
    startRecognition()
  }

  function pause() {
    if (state.status !== 'recording') return
    try { recorder?.pause() } catch { /* ignore */ }
    pauseTimer()
    stopRecognition()
    state.status = 'paused'
  }

  function resume() {
    if (state.status !== 'paused') return
    try { recorder?.resume() } catch { /* ignore */ }
    startTimer()
    startRecognition()
    state.status = 'recording'
  }

  function stop() {
    if (state.status === 'stopping') return stopPromise
    if (state.status !== 'recording' && state.status !== 'paused') return Promise.resolve(audioBlob.value)
    if (state.status === 'recording') {
      pauseTimer()
    }
    try { recorder?.stop() } catch { /* ignore */ }
    stopRecognition()
    state.status = 'stopping'
    return stopPromise
  }

  function clear() {
    generation += 1
    if (state.status === 'recording' || state.status === 'paused') {
      try { recorder?.stop() } catch { /* ignore */ }
    }
    stopRecognition()
    stopLevelMeter()
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
    }
    clearAudioUrl()
    audioBlob.value = null
    transcript.value = ''
    interim.value = ''
    accumulated = 0
    state.durationMs = 0
    state.error = ''
    state.status = 'idle'
  }

  // Allow caller to seed a previously persisted recording (from IndexedDB)
  function loadFromBlob(blob, savedTranscript = '', durationMs = 0) {
    clearAudioUrl()
    audioBlob.value = blob
    audioUrl.value = URL.createObjectURL(blob)
    transcript.value = savedTranscript
    state.status = 'stopped'
    state.durationMs = durationMs || 0
    accumulated = durationMs || 0
    state.error = ''
  }

  onBeforeUnmount(() => {
    clear()
  })

  return {
    state,
    audioBlob,
    audioUrl,
    transcript,
    interim,
    start,
    pause,
    resume,
    stop,
    clear,
    loadFromBlob,
  }
}
