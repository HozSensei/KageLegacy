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

  async function fetchSquad() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/squad`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erreur ${res.status}`)
      }
      const data = await res.json()
      is_bot.value = data.is_bot
      sensei.value = data.sensei
      activeSquad.value = data.activeSquad
      bench.value = data.bench
      gameClock.value = data.gameClock
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

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
    setLanguage,
  }
})
