import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readApiError } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''
const SECRET_KEY = 'kage_admin_secret'

function adminHeaders(secret) {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Secret': secret,
  }
}

export const useAdminStore = defineStore('admin', () => {
  const secret = ref(sessionStorage.getItem(SECRET_KEY) || '')
  const status = ref(null)
  const clock = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const lastResult = ref(null)

  function setSecret(value) {
    secret.value = value.trim()
    if (secret.value) {
      sessionStorage.setItem(SECRET_KEY, secret.value)
    } else {
      sessionStorage.removeItem(SECRET_KEY)
    }
  }

  function clearSecret() {
    setSecret('')
    clock.value = null
    lastResult.value = null
  }

  async function fetchStatus() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/admin/status`)
      if (!res.ok) throw new Error(await readApiError(res))
      status.value = await res.json()
      return status.value
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function adminFetch(path, options = {}) {
    if (!secret.value) throw new Error('Secret admin requis.')

    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...adminHeaders(secret.value),
        ...options.headers,
      },
    })

    if (!res.ok) throw new Error(await readApiError(res))
    return res.json()
  }

  async function fetchClock() {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/clock')
      clock.value = data.clock
      return data.clock
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function advanceHour() {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/clock/advance-hour', { method: 'POST' })
      clock.value = data.clock
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function setHour(hour) {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/clock/set-hour', {
        method: 'POST',
        body: JSON.stringify({ hour }),
      })
      clock.value = data.clock
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function setCycleStart(at) {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/clock/set-start', {
        method: 'POST',
        body: JSON.stringify({ at }),
      })
      clock.value = data.clock
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function runTick() {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/clock/tick', { method: 'POST' })
      clock.value = data.clock
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function hardReset({ seasonNumber, cycleStartAt, dryRun, confirm }) {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/season/hard-reset', {
        method: 'POST',
        body: JSON.stringify({ seasonNumber, cycleStartAt, dryRun, confirm }),
      })
      if (data.clock) clock.value = data.clock
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function purgeGuests() {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/guest/purge', { method: 'POST' })
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function repairPools({ all, poolId, includePlayed }) {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/pools/repair-schedules', {
        method: 'POST',
        body: JSON.stringify({ all, poolId, includePlayed }),
      })
      lastResult.value = data
      return data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    secret,
    status,
    clock,
    loading,
    error,
    lastResult,
    setSecret,
    clearSecret,
    fetchStatus,
    fetchClock,
    advanceHour,
    setHour,
    setCycleStart,
    runTick,
    hardReset,
    purgeGuests,
    repairPools,
  }
})
