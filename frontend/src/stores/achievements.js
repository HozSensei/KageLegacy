import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { parseApiResponse, readApiError } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useAchievementsStore = defineStore('achievements', () => {
  const achievements = ref([])
  const meta = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref(null)
  const lastClaim = ref(null)
  const claimableCount = computed(() => meta.value?.claimable ?? 0)
  const unlockedCount = computed(() => meta.value?.unlocked ?? 0)
  const totalCount = computed(() => meta.value?.total ?? achievements.value.length)

  async function fetchRegistry() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/achievements`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      achievements.value = body.achievements || []
      meta.value = body.meta || null
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function claimTier(achievementKey, tier) {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/achievements/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementKey, tier }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      lastClaim.value = body
      const idx = achievements.value.findIndex((a) => a.key === achievementKey)
      if (idx >= 0 && body.achievement) achievements.value[idx] = body.achievement
      if (meta.value) {
        meta.value = {
          ...meta.value,
          claimable: achievements.value.reduce((s, a) => s + (a.claimableCount || 0), 0),
          unlocked: achievements.value.filter((a) => a.unlocked).length,
        }
      }
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      actionLoading.value = false
    }
  }

  return { achievements, meta, loading, actionLoading, error, lastClaim, claimableCount, unlockedCount, totalCount, fetchRegistry, claimTier }
})
