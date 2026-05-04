import { ref, onMounted, onBeforeUnmount } from 'vue'

// Petit routeur basé sur le hash de l'URL.
// Pas de dépendance externe ; supporte le bouton « précédent » du navigateur.

const _route = ref(parseHash(typeof window !== 'undefined' ? window.location.hash : ''))

function parseHash(hash) {
  // Format attendu : "#/segment/segment2"
  const clean = (hash || '').replace(/^#\/?/, '').replace(/\/+$/, '')
  if (!clean) return { path: '/', segments: [] }
  const segments = clean.split('/').filter(Boolean)
  return { path: '/' + segments.join('/'), segments }
}

function onHashChange() {
  _route.value = parseHash(window.location.hash)
}

let installed = false
function install() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('hashchange', onHashChange)
}

export function navigate(path) {
  // path commence toujours par "/"
  if (typeof window === 'undefined') return
  const target = '#' + (path.startsWith('/') ? path : '/' + path)
  if (window.location.hash === target) return
  window.location.hash = target
}

export function useRouter() {
  onMounted(install)
  onBeforeUnmount(() => {
    // L'écouteur reste : il sert à toute l'application
  })
  return { route: _route, navigate }
}
