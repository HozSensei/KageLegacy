import { defineStore } from 'pinia'
import { ref } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useSquadStore = defineStore('squad', () => {
  const loading = ref(false)
  const error = ref(null)
  const is_bot = ref(false)
  const sensei = ref(null)
  const activeSquad = ref([])
  const bench = ref([])
  const gameClock = ref(null)

  function applyPayload(data) {
    is_bot.value = data.is_bot
    sensei.value = data.sensei
    activeSquad.value = data.activeSquad
    bench.value = data.bench
    gameClock.value = data.gameClock
  }

  async function fetchSquad() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/squad`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erreur ${res.status}`)
      }
      applyPayload(await res.json())
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function saveStrategies(strategies) {
    error.value = null
    const payload = {
      strategies: Object.entries(strategies).map(([ninjaId, strategy]) => ({
        ninjaId: Number(ninjaId),
        strategy,
      })),
    }
    const res = await fetch(`${API_BASE}/api/squad/strategies`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${res.status}`)
    }
    applyPayload(await res.json())
  }

  async function saveTrainingFocus(trainingFocus) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/training-focus`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainingFocus }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${res.status}`)
    }
    applyPayload(await res.json())
  }

  async function requestChuninExam(ninjaId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/chunin-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${res.status}`)
    }
    applyPayload(await res.json())
  }

  const tacticsLocked = () => Boolean(gameClock.value?.tacticsLocked)

  function setLanguage(lang) {
    if (sensei.value) sensei.value.language = lang
  }

  return {
    loading,
    error,
    is_bot,
    sensei,
    activeSquad,
    bench,
    gameClock,
    fetchSquad,
    saveStrategies,
    saveTrainingFocus,
    requestChuninExam,
    tacticsLocked,
    setLanguage,
  }
})
