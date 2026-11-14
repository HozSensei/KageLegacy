import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { parseApiResponse, readApiError } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const usePlayerStore = defineStore('player', () => {
  const character = ref(null)
  const stats = ref(null)
  const clans = ref([])
  const loading = ref(false)
  const error = ref(null)
  const checked = ref(false)
  const lastLevelUp = ref(null)

  const hasCharacter = computed(() => Boolean(character.value))
  const talentPoints = computed(() => character.value?.talentPointsAvailable ?? 0)
  const canSpecialize = computed(
    () =>
      Boolean(character.value) &&
      character.value.level >= 10 &&
      !character.value.specialization
  )

  async function fetchPlayer() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/player`, { credentials: 'include' })
      if (res.status === 404) {
        character.value = null
        stats.value = null
        return null
      }
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      character.value = body.character
      stats.value = body.character?.stats ?? null
      return character.value
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
      checked.value = true
    }
  }

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/player/stats`, { credentials: 'include' })
      if (res.status === 404) {
        stats.value = null
        return null
      }
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      stats.value = body.stats
      return stats.value
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchClans() {
    try {
      const res = await fetch(`${API_BASE}/api/player/clans`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      clans.value = body.clans || []
      return clans.value
    } catch (e) {
      error.value = e.message
      clans.value = []
      return []
    }
  }

  async function createCharacter({ name, clanTraitId, elementAffinity, avatarUrl }) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/player/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          clanTraitId: clanTraitId || null,
          elementAffinity,
          avatarUrl: avatarUrl || null,
        }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      character.value = body.character
      stats.value = body.character?.stats ?? null
      checked.value = true
      return character.value
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function addXp(amount) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/player/xp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      character.value = body.character
      stats.value = body.character?.stats ?? null
      if (body.leveledUp) {
        lastLevelUp.value = {
          levelsGained: body.levelsGained,
          talentPointsGained: body.talentPointsGained,
          level: body.character?.level,
        }
      }
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function chooseSpecialization(specialization) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/player/specialization`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialization }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      character.value = body.character
      stats.value = body.character?.stats ?? null
      return character.value
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  function clearLevelUp() {
    lastLevelUp.value = null
  }

  function reset() {
    character.value = null
    stats.value = null
    clans.value = []
    error.value = null
    checked.value = false
    lastLevelUp.value = null
  }

  return {
    character,
    stats,
    clans,
    loading,
    error,
    checked,
    lastLevelUp,
    hasCharacter,
    talentPoints,
    canSpecialize,
    fetchPlayer,
    fetchStats,
    fetchClans,
    createCharacter,
    addXp,
    chooseSpecialization,
    clearLevelUp,
    reset,
  }
})
