// Tiny IndexedDB wrapper to persist one audio Blob per TCF EO task.
// We persist the audio across reloads as requested by the user.

const DB_NAME = 'tcf-eo'
const DB_VERSION = 1
const STORE = 'audio'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB indisponible dans ce navigateur.'))
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE) // keyed manually by taskId
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const out = fn(store)
    tx.oncomplete = () => resolve(out?.result ?? out)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function saveAudio(taskId, blob, transcript = '', durationMs = 0) {
  return withStore('readwrite', (store) => {
    store.put({ blob, transcript, durationMs, savedAt: Date.now() }, String(taskId))
  })
}

export async function loadAudio(taskId) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(String(taskId))
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteAudio(taskId) {
  return withStore('readwrite', (store) => {
    store.delete(String(taskId))
  })
}
