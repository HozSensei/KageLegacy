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
  const notifications = ref([])
  const dispensaryCandidates = ref([])
  const cycleBudget = ref(null)

  function applyPayload(data) {
    is_bot.value = data.is_bot
    sensei.value = data.sensei
    activeSquad.value = data.activeSquad
    bench.value = data.bench
    gameClock.value = data.gameClock
    notifications.value = data.notifications || []
    dispensaryCandidates.value = data.dispensaryCandidates || []
    cycleBudget.value = data.cycleBudget || null
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

  async function saveComposition(activeOrdered) {
    error.value = null
    const payload = {
      slots: activeOrdered.map((ninja, index) => ({
        position: index + 1,
        ninjaId: ninja.id,
      })),
    }
    const res = await fetch(`${API_BASE}/api/squad/composition`, {
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

  async function saveStrategies(strategyMap, protectTargetMap = {}) {
    error.value = null
    const payload = {
      strategies: Object.entries(strategyMap).map(([ninjaId, strategy]) => ({
        ninjaId: Number(ninjaId),
        strategy,
        protectTargetNinjaId:
          strategy === 'Protect' ? Number(protectTargetMap[ninjaId]) || null : null,
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

  async function saveTrainingPlans(plans) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/training-plans`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plans }),
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

  async function requestBirdFlight(ninjaId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/bird-flight`, {
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

  async function dismissNotification(notificationId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/notifications/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Erreur ${res.status}`)
    }
    applyPayload(await res.json())
  }

  async function treatAtDispensary(ninjaId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/dispensary`, {
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
    notifications,
    dispensaryCandidates,
    cycleBudget,
    fetchSquad,
    saveComposition,
    saveStrategies,
    saveTrainingPlans,
    saveTrainingFocus,
    requestChuninExam,
    requestBirdFlight,
    dismissNotification,
    treatAtDispensary,
    tacticsLocked,
    setLanguage,
  }
})
