import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readApiError } from '../utils/http.js'
import { useSquadStore } from './squad'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useAdminStore = defineStore('admin', () => {
  const status = ref(null)
  const clock = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const lastResult = ref(null)

  async function adminFetch(path, options = {}) {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) throw new Error(await readApiError(res))
    return res.json()
  }

  async function fetchStatus() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/admin/status`, { credentials: 'include' })
      if (res.status === 401) {
        status.value = { isAdmin: false, authenticated: false }
        return status.value
      }
      if (!res.ok) throw new Error(await readApiError(res))
      status.value = { ...(await res.json()), authenticated: true }
      return status.value
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
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

  async function refreshGameClock() {
    const squad = useSquadStore()
    if (squad.sensei) {
      await squad.fetchSquad()
    }
  }

  async function advanceHour() {
    loading.value = true
    error.value = null
    try {
      const data = await adminFetch('/clock/advance-hour', { method: 'POST' })
      clock.value = data.clock
      lastResult.value = data
      await refreshGameClock()
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
      await refreshGameClock()
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
      await refreshGameClock()
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
      await refreshGameClock()
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
      if (!data.dryRun) await refreshGameClock()
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
    status,
    clock,
    loading,
    error,
    lastResult,
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
