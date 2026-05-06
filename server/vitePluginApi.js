// Vite plugin that exposes a small set of API endpoints during
// `vite dev` and `vite preview`. The endpoints are only available when
// running through Vite – the production build itself remains static.
//
// Endpoints
// ---------
// POST /api/correct  body: { text: string }
//   Returns: { original, errors: [{ original, corrected, explanation, type }], fullyCorrected }

import { correctFrenchText } from './claudeCorrect.js'

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (e) {
        reject(new Error('Body JSON invalide'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function attach(server) {
  server.middlewares.use('/api/correct', async (req, res, next) => {
    if (req.method !== 'POST') return next()
    try {
      const body = await readJsonBody(req)
      const text = typeof body?.text === 'string' ? body.text : ''
      const result = await correctFrenchText(text)
      sendJson(res, 200, result)
    } catch (err) {
      const msg = err?.message || 'Erreur inattendue'
      // eslint-disable-next-line no-console
      console.error('[/api/correct]', msg)
      sendJson(res, 500, { error: msg })
    }
  })
}

export default function apiPlugin() {
  return {
    name: 'apprendre-francais-api',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}
