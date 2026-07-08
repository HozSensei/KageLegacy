import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readApiError } from '../utils/http.js'

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
  const academy = ref(null)
  const dailySeal = ref(null)
  const heritage = ref(null)
  let fetchPromise = null

  function applyPayload(data) {
    is_bot.value = data.is_bot
    sensei.value = data.sensei
    activeSquad.value = data.activeSquad
    bench.value = data.bench
    gameClock.value = data.gameClock
    notifications.value = data.notifications || []
    dispensaryCandidates.value = data.dispensaryCandidates || []
    cycleBudget.value = data.cycleBudget || null
    academy.value = data.academy || null
    dailySeal.value = data.dailySeal || null
    heritage.value = data.heritage || null
  }

  /** Mise à jour partielle après mutation — préserve notifs/académie si absentes */
  function applySquadMutation(data) {
    if (!data) return
    if (data.is_bot != null) is_bot.value = data.is_bot
    if (data.sensei) sensei.value = data.sensei
    if (data.activeSquad) activeSquad.value = data.activeSquad
    if (data.bench) bench.value = data.bench
    if (data.gameClock) gameClock.value = data.gameClock
    if (data.cycleBudget !== undefined) cycleBudget.value = data.cycleBudget
    if (data.dispensaryCandidates) dispensaryCandidates.value = data.dispensaryCandidates
    if (data.academy !== undefined) academy.value = data.academy
    if (data.dailySeal !== undefined) dailySeal.value = data.dailySeal
    if (data.heritage !== undefined) heritage.value = data.heritage
    if (data.notifications) notifications.value = data.notifications
  }

  async function fetchSquad() {
    if (fetchPromise) return fetchPromise
    const isInitial = !sensei.value
    fetchPromise = (async () => {
      if (isInitial) {
        loading.value = true
        error.value = null
      }
      try {
        const res = await fetch(`${API_BASE}/api/squad`)
        if (!res.ok) throw new Error(await readApiError(res))
        applyPayload(await res.json())
      } catch (e) {
        error.value = e.message
      } finally {
        if (isInitial) loading.value = false
      }
    })()
    try {
      await fetchPromise
    } finally {
      fetchPromise = null
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
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
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
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function recruitFromAcademy(drawId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/academy/recruit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    applySquadMutation(data)
    if (data.academy) academy.value = data.academy
    return data
  }

  async function saveTrainingPlans(plans) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/training-plans`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plans }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function saveTrainingFocus(trainingFocus) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/training-focus`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trainingFocus }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function requestChuninExam(ninjaId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/chunin-exam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function requestBirdFlight(ninjaId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/bird-flight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function dismissNotification(notificationId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/notifications/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function treatAtDispensary(ninjaId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/dispensary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
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
    academy,
    dailySeal,
    heritage,
    fetchSquad,
    saveComposition,
    saveStrategies,
    saveTrainingPlans,
    recruitFromAcademy,
    saveTrainingFocus,
    requestChuninExam,
    requestBirdFlight,
    dismissNotification,
    treatAtDispensary,
    tacticsLocked,
    setLanguage,
    applySquadMutation,
  }
})
