import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { readApiError, parseApiResponse } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useShopStore = defineStore('shop', () => {
  const boosters = ref([])
  const balances = ref({ ryos: 0, dust: 0, essence: 0, kageCoins: 0 })
  const elements = ref([])
  const loading = ref(false)
  const opening = ref(false)
  const error = ref(null)
  const lastResult = ref(null)
  const selectedElement = ref(null)

  const canAfford = computed(() => (booster) => {
    if (!booster?.cost) return false
    const ryos = balances.value.ryos || 0
    const coins = balances.value.kageCoins || 0
    return ryos >= (booster.cost.ryos || 0) && coins >= (booster.cost.kageCoins || 0)
  })

  async function fetchBoosters() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/shop/boosters`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      boosters.value = body.boosters || []
      balances.value = body.balances || balances.value
      elements.value = body.elements || []
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function openBooster(type, { element = null } = {}) {
    opening.value = true
    error.value = null
    lastResult.value = null
    try {
      const payload = {}
      if (element) payload.element = element
      const res = await fetch(`${API_BASE}/api/shop/boosters/${encodeURIComponent(type)}/open`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      lastResult.value = body
      if (body.balances) balances.value = body.balances
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      opening.value = false
    }
  }

  function clearResult() {
    lastResult.value = null
  }

  function setSelectedElement(el) {
    selectedElement.value = el
  }

  return {
    boosters,
    balances,
    elements,
    loading,
    opening,
    error,
    lastResult,
    selectedElement,
    canAfford,
    fetchBoosters,
    openBooster,
    clearResult,
    setSelectedElement,
  }
})
