/**
 * Stub Pinia store — remplace l'ancien stores/squad.js (archivé en Phase 0).
 * Conserve une API minimale pour AppLayout / notifications / cycle bar
 * jusqu'à ce que ces écrans soient migrés vers V2.
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSquadStore = defineStore('squad', () => {
  const sensei = ref(null)
  const gameClock = ref(null)
  const notifications = ref([])
  const notificationHistory = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchSquad() {
    loading.value = true
    error.value = null
    try {
      const API_BASE = import.meta.env.VITE_API_URL || ''
      const clockRes = await fetch(`${API_BASE}/api/clock`, { credentials: 'include' })
      if (clockRes.ok) {
        const data = await clockRes.json()
        gameClock.value = data.gameClock ?? data.clock ?? data
      }
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  function clearSquad() {
    sensei.value = null
    gameClock.value = null
    notifications.value = []
    notificationHistory.value = []
  }

  async function dismissNotification() {
    /* no-op V2 */
  }

  async function markNotificationsRead() {
    /* no-op V2 */
  }

  return {
    sensei,
    gameClock,
    notifications,
    notificationHistory,
    loading,
    error,
    fetchSquad,
    clearSquad,
    dismissNotification,
    markNotificationsRead,
  }
})
