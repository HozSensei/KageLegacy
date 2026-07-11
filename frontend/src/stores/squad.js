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
  const clan = ref(null)
  const clanBoard = ref(null)
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
    clan.value = data.clan || null
    clanBoard.value = data.clanBoard || null
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
    if (data.clan !== undefined) clan.value = data.clan
    if (data.clanBoard !== undefined) clanBoard.value = data.clanBoard
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

  async function releaseNinja(ninjaId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/squad/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ninjaId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function recommendToClan(drawId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/clan/board/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drawId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    applySquadMutation(data)
    return data
  }

  async function createClan(name) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/clan/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function joinClan(inviteCode) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/clan/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function leaveClan() {
    error.value = null
    const res = await fetch(`${API_BASE}/api/clan/leave`, { method: 'POST' })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  async function recruitFromClanBoard(postId) {
    error.value = null
    const res = await fetch(`${API_BASE}/api/clan/board/recruit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    applySquadMutation(await res.json())
  }

  const tacticsLocked = () => Boolean(gameClock.value?.tacticsLocked)
  const compositionLocked = () => Boolean(gameClock.value?.compositionLocked)

  function canChangeComposition() {
    return !compositionLocked() && !tacticsLocked()
  }

  function setLanguage(lang) {
    if (sensei.value) sensei.value.language = lang
  }

  function clearSquad() {
    loading.value = false
    error.value = null
    is_bot.value = false
    sensei.value = null
    activeSquad.value = []
    bench.value = []
    gameClock.value = null
    notifications.value = []
    dispensaryCandidates.value = []
    cycleBudget.value = null
    academy.value = null
    dailySeal.value = null
    heritage.value = null
    clan.value = null
    clanBoard.value = null
    fetchPromise = null
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
    clan,
    clanBoard,
    fetchSquad,
    saveComposition,
    saveStrategies,
    saveTrainingPlans,
    recruitFromAcademy,
    recommendToClan,
    createClan,
    joinClan,
    leaveClan,
    recruitFromClanBoard,
    saveTrainingFocus,
    requestChuninExam,
    requestBirdFlight,
    dismissNotification,
    treatAtDispensary,
    releaseNinja,
    tacticsLocked,
    compositionLocked,
    canChangeComposition,
    setLanguage,
    applySquadMutation,
    clearSquad,
  }
})
