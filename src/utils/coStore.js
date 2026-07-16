const DB = 'apprendre-francais-co'
const VERSION = 1

// Vue refs make nested metadata reactive. IndexedDB can clone plain records and
// Blobs, but not Vue Proxy objects, so normalize JSON-only records at the
// persistence boundary. Binary assets are written separately and stay as Blobs.
const plainRecord = value => JSON.parse(JSON.stringify(value))

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state')
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets')
      if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const requestPromise = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

export async function loadCoState() {
  const db = await open(); const tx = db.transaction(['state', 'history'], 'readonly')
  const [set, attempt, history] = await Promise.all([requestPromise(tx.objectStore('state').get('set')), requestPromise(tx.objectStore('state').get('attempt')), requestPromise(tx.objectStore('history').getAll())])
  return { set, attempt, history: history.sort((a, b) => b.submittedAt - a.submittedAt) }
}

export async function loadAsset(id) { const db = await open(); return requestPromise(db.transaction('assets').objectStore('assets').get(id)) }

export async function replaceCoSet(set, assets) {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['state', 'assets', 'history'], 'readwrite')
    tx.objectStore('state').clear(); tx.objectStore('assets').clear(); tx.objectStore('history').clear()
    tx.objectStore('state').put(plainRecord(set), 'set')
    assets.forEach(({ id, blob }) => tx.objectStore('assets').put(blob, id))
    tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error)
  })
}

export async function saveAttempt(attempt) { const db = await open(); return requestPromise(db.transaction('state', 'readwrite').objectStore('state').put(plainRecord(attempt), 'attempt')) }
export async function saveHistory(record) { const db = await open(); return requestPromise(db.transaction('history', 'readwrite').objectStore('history').put(plainRecord(record))) }
export async function clearCoData() { const db = await open(); const tx = db.transaction(['state', 'assets', 'history'], 'readwrite'); tx.objectStore('state').clear(); tx.objectStore('assets').clear(); tx.objectStore('history').clear(); return new Promise((r, j) => { tx.oncomplete = r; tx.onerror = () => j(tx.error) }) }
