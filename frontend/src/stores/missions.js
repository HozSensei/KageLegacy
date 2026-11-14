import { defineStore } from 'pinia'
import { ref } from 'vue'
import { parseApiResponse, readApiError } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useMissionsStore = defineStore('missions', () => {
  const missions = ref([])
  const enemies = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchMissions() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/missions`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      missions.value = body.missions || []
      enemies.value = body.enemies || []
      return missions.value
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  return { missions, enemies, loading, error, fetchMissions }
})
