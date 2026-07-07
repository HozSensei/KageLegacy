/**
 * Lit le corps JSON d'une réponse API.
 * @param {Response} res
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readApiJson(res) {
  return res.json().catch(() => ({}))
}

/**
 * Lit le message d'erreur d'une réponse API (corps JSON ou fallback HTTP).
 * @param {Response} res
 * @param {Record<string, unknown>} [body]
 * @returns {Promise<string>}
 */
export async function readApiError(res, body) {
  const payload = body ?? (await readApiJson(res))
  let message = payload.error || `Erreur ${res.status}`
  if (typeof message === 'string' && message.startsWith('[')) {
    try {
      const parsed = JSON.parse(message)
      if (Array.isArray(parsed) && parsed[0]?.message) {
        message = parsed[0].message
      }
    } catch {
      /* corps non JSON */
    }
  }
  return message
}

/**
 * @param {Response} res
 * @throws {Error}
 * @returns {Promise<Response>}
 */
export async function assertOk(res) {
  if (!res.ok) {
    throw new Error(await readApiError(res))
  }
  return res
}

/**
 * @param {Response} res
 * @returns {Promise<{ ok: boolean, status: number, body: Record<string, unknown> }>}
 */
export async function parseApiResponse(res) {
  const body = await readApiJson(res)
  return { ok: res.ok, status: res.status, body }
}
