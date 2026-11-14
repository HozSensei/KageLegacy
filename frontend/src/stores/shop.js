import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { readApiError, parseApiResponse } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useShopStore = defineStore('shop', () => {
  const activeTab = ref('boosters') // boosters | cosmetics | currency | battlePass

  const boosters = ref([])
  const balances = ref({ ryos: 0, dust: 0, essence: 0, kageCoins: 0 })
  const elements = ref([])
  const coinPacks = ref([])
  const cosmetics = ref([])
  const loadout = ref({ avatarFrameKey: null, cardBackKey: null, titleKey: null })
  const battlePassOffer = ref(null)
  const coinMeta = ref(null)

  const loading = ref(false)
  const opening = ref(false)
  const purchasing = ref(false)
  const error = ref(null)
  const lastResult = ref(null)
  const lastMessage = ref(null)
  const selectedElement = ref(null)

  const canAfford = computed(() => (booster) => {
    if (!booster?.cost) return false
    const ryos = balances.value.ryos || 0
    const coins = balances.value.kageCoins || 0
    return ryos >= (booster.cost.ryos || 0) && coins >= (booster.cost.kageCoins || 0)
  })

  function applyBalances(next) {
    if (next) balances.value = next
  }

  async function fetchBoosters() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/shop/boosters`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      boosters.value = body.boosters || []
      applyBalances(body.balances)
      elements.value = body.elements || []
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchCoinPacks() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/shop/coin-packs`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      coinPacks.value = body.packs || []
      applyBalances(body.balances)
      coinMeta.value = body.meta || null
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchCosmetics() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/shop/cosmetics`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      cosmetics.value = body.items || []
      loadout.value = body.loadout || loadout.value
      applyBalances(body.balances)
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchBattlePassOffer() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/shop/battle-pass`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      battlePassOffer.value = body
      applyBalances(body.balances)
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function loadTab(tab = activeTab.value) {
    activeTab.value = tab
    if (tab === 'boosters') return fetchBoosters()
    if (tab === 'cosmetics') return fetchCosmetics()
    if (tab === 'currency') return fetchCoinPacks()
    if (tab === 'battlePass') return fetchBattlePassOffer()
    return null
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
      applyBalances(body.balances)
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      opening.value = false
    }
  }

  async function purchaseCoinPack(packId, method = 'stub') {
    purchasing.value = true
    error.value = null
    lastMessage.value = null
    try {
      const res = await fetch(
        `${API_BASE}/api/shop/coin-packs/${encodeURIComponent(packId)}/purchase`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method }),
        },
      )
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      applyBalances(body.balances)
      lastMessage.value = body.note || null
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      purchasing.value = false
    }
  }

  async function purchaseCosmetic(key) {
    purchasing.value = true
    error.value = null
    lastMessage.value = null
    try {
      const res = await fetch(
        `${API_BASE}/api/shop/cosmetics/${encodeURIComponent(key)}/purchase`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      cosmetics.value = body.items || cosmetics.value
      loadout.value = body.loadout || loadout.value
      applyBalances(body.balances)
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      purchasing.value = false
    }
  }

  async function equipCosmetic(key) {
    purchasing.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/shop/cosmetics/${encodeURIComponent(key)}/equip`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      cosmetics.value = body.items || cosmetics.value
      loadout.value = body.loadout || loadout.value
      applyBalances(body.balances)
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      purchasing.value = false
    }
  }

  async function unlockBattlePass(method = 'kage_coins') {
    purchasing.value = true
    error.value = null
    lastMessage.value = null
    try {
      const res = await fetch(`${API_BASE}/api/shop/battle-pass/unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      if (body.offer) battlePassOffer.value = body.offer
      applyBalances(body.offer?.balances || body.balances)
      lastMessage.value = body.note || null
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      purchasing.value = false
    }
  }

  function clearResult() {
    lastResult.value = null
  }

  function clearMessage() {
    lastMessage.value = null
  }

  function setSelectedElement(el) {
    selectedElement.value = el
  }

  function setActiveTab(tab) {
    activeTab.value = tab
  }

  return {
    activeTab,
    boosters,
    balances,
    elements,
    coinPacks,
    cosmetics,
    loadout,
    battlePassOffer,
    coinMeta,
    loading,
    opening,
    purchasing,
    error,
    lastResult,
    lastMessage,
    selectedElement,
    canAfford,
    fetchBoosters,
    fetchCoinPacks,
    fetchCosmetics,
    fetchBattlePassOffer,
    loadTab,
    openBooster,
    purchaseCoinPack,
    purchaseCosmetic,
    equipCosmetic,
    unlockBattlePass,
    clearResult,
    clearMessage,
    setSelectedElement,
    setActiveTab,
  }
})
