import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parseApiResponse, readApiError } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useLeaderboardStore = defineStore('leaderboard', () => {
  const factions = ref([])
  const board = ref('level')
  const page = ref(1)
  const limit = ref(25)
  const factionFilter = ref(null)
  const entries = ref([])
  const me = ref(null)
  const total = ref(0)
  const totalPages = ref(1)
  const factionStandings = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchFactions() {
    try {
      const res = await fetch(`${API_BASE}/api/factions`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      factions.value = body.factions || []
      return factions.value
    } catch (e) {
      error.value = e.message
      factions.value = []
      return []
    }
  }

  async function fetchBoard({
    nextBoard = board.value,
    nextPage = page.value,
    nextFactionId = factionFilter.value,
  } = {}) {
    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({
        board: nextBoard,
        page: String(nextPage),
        limit: String(limit.value),
      })
      if (nextFactionId) params.set('factionId', nextFactionId)

      const res = await fetch(`${API_BASE}/api/leaderboard?${params}`, {
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))

      board.value = body.board
      page.value = body.page
      factionFilter.value = body.factionId || null
      entries.value = body.entries || []
      me.value = body.me || null
      total.value = body.total || 0
      totalPages.value = body.totalPages || 1
      return body
    } catch (e) {
      error.value = e.message
      entries.value = []
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchFactionStandings(nextBoard = board.value) {
    try {
      const params = new URLSearchParams({ board: nextBoard })
      const res = await fetch(`${API_BASE}/api/leaderboard/factions?${params}`, {
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      factionStandings.value = body.standings || []
      return factionStandings.value
    } catch (e) {
      error.value = e.message
      factionStandings.value = []
      return []
    }
  }

  async function joinFaction(factionId) {
    const res = await fetch(`${API_BASE}/api/factions/join`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factionId }),
    })
    const { ok, body } = await parseApiResponse(res)
    if (!ok) throw new Error(await readApiError(res, body))
    return body
  }

  async function retakeFaction(factionId) {
    const res = await fetch(`${API_BASE}/api/factions/retake`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ factionId }),
    })
    const { ok, body } = await parseApiResponse(res)
    if (!ok) throw new Error(await readApiError(res, body))
    return body
  }

  return {
    factions,
    board,
    page,
    limit,
    factionFilter,
    entries,
    me,
    total,
    totalPages,
    factionStandings,
    loading,
    error,
    fetchFactions,
    fetchBoard,
    fetchFactionStandings,
    joinFaction,
    retakeFaction,
  }
})
