const DB_NAME = 'tcf-production'
const DB_VERSION = 2
const ATTEMPTS_STORE = 'attempts'
const AUDIO_STORE = 'audio'
const EVALUATIONS_STORE = 'evaluations'

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible dans ce navigateur.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ATTEMPTS_STORE)) {
        const attempts = db.createObjectStore(ATTEMPTS_STORE, { keyPath: 'id' })
        attempts.createIndex('skill', 'skill')
        attempts.createIndex('submittedAt', 'submittedAt')
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE)
      }
      if (!db.objectStoreNames.contains(EVALUATIONS_STORE)) {
        const evaluations = db.createObjectStore(EVALUATIONS_STORE, { keyPath: 'id' })
        evaluations.createIndex('attemptId', 'attemptId')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function createAttemptId(skill) {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${skill}-${suffix}`
}

export async function saveProductionAttempt(attempt, audioBlob = null) {
  const db = await openDb()
  const stores = audioBlob ? [ATTEMPTS_STORE, AUDIO_STORE] : [ATTEMPTS_STORE]
  const transaction = db.transaction(stores, 'readwrite')
  transaction.objectStore(ATTEMPTS_STORE).add(structuredClone(attempt))
  if (audioBlob) transaction.objectStore(AUDIO_STORE).put(audioBlob, attempt.id)
  await transactionDone(transaction)
  return attempt
}

export async function listProductionAttempts(skill) {
  const db = await openDb()
  const transaction = db.transaction([ATTEMPTS_STORE, EVALUATIONS_STORE], 'readonly')
  const request = transaction.objectStore(ATTEMPTS_STORE).index('skill').getAll(skill)
  const evaluationsRequest = transaction.objectStore(EVALUATIONS_STORE).getAll()
  const [attempts, evaluations] = await Promise.all([requestResult(request), requestResult(evaluationsRequest)])
  const latestEvaluation = new Map()
  for (const record of evaluations.sort((a, b) => a.createdAt - b.createdAt)) latestEvaluation.set(record.attemptId, record.evaluation)
  return attempts.map(attempt => ({ ...attempt, evaluation: latestEvaluation.get(attempt.id) || attempt.evaluation || null })).sort((a, b) => b.submittedAt - a.submittedAt)
}

export async function saveProductionEvaluation(attemptId, evaluation) {
  const db = await openDb()
  const record = { id: createAttemptId('evaluation'), attemptId, createdAt: Date.now(), evaluation: structuredClone(evaluation) }
  await requestResult(db.transaction(EVALUATIONS_STORE, 'readwrite').objectStore(EVALUATIONS_STORE).add(record))
  return record
}

export async function deleteProductionAttempt(attempt) {
  const db = await openDb()
  const transaction = db.transaction([ATTEMPTS_STORE, AUDIO_STORE, EVALUATIONS_STORE], 'readwrite')
  transaction.objectStore(ATTEMPTS_STORE).delete(attempt.id)
  if (attempt.audioRef) transaction.objectStore(AUDIO_STORE).delete(attempt.audioRef)
  const evaluations = transaction.objectStore(EVALUATIONS_STORE)
  const evaluationRequest = evaluations.index('attemptId').getAllKeys(attempt.id)
  evaluationRequest.onsuccess = () => evaluationRequest.result.forEach(key => evaluations.delete(key))
  await transactionDone(transaction)
}

export async function loadProductionAudio(audioRef) {
  const db = await openDb()
  return requestResult(db.transaction(AUDIO_STORE, 'readonly').objectStore(AUDIO_STORE).get(audioRef))
}
