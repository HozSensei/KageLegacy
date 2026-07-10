import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readApiError } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useEliteStore = defineStore('elite', () => {
  const loading = ref(false)
  const error = ref(null)
  const subscription = ref(null)
  const seasonPass = ref(null)
  const catalog = ref(null)
  const identity = ref(null)
  const equipped = ref(null)
  const tools = ref(null)
  const toolsLoading = ref(false)
  const matchReport = ref(null)
  const reportLoading = ref(false)
  const reportError = ref(null)
  const lastMatchup = ref(null)
  const checkoutNotice = ref(null)
  const checkoutError = ref(null)

  function clearCheckoutNotice() {
    checkoutNotice.value = null
    checkoutError.value = null
  }

  async function handleCheckoutReturn(route, router) {
    const sessionId = typeof route.query.session_id === 'string' ? route.query.session_id : null
    const eliteStatus = route.query.elite

    clearCheckoutNotice()

    if (sessionId) {
      checkoutNotice.value = 'confirming'
      try {
        await confirmCheckout(sessionId)
        checkoutNotice.value = 'success'
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (e) {
        checkoutError.value = e.message
        checkoutNotice.value = 'error'
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else if (eliteStatus === 'canceled') {
      checkoutNotice.value = 'canceled'
      await fetchElite()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      await fetchElite()
    }

    if (sessionId || eliteStatus) {
      const nextQuery = { ...route.query }
      delete nextQuery.session_id
      delete nextQuery.elite
      router.replace({ path: route.path, query: nextQuery })
    }
  }

  function applyPayload(data) {
    subscription.value = data.subscription ?? null
    seasonPass.value = data.seasonPass ?? null
    catalog.value = data.catalog ?? null
    identity.value = data.identity ?? null
    equipped.value = data.equipped ?? null
  }

  async function fetchElite() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/elite/me`)
      if (!res.ok) throw new Error(await readApiError(res))
      applyPayload(await res.json())
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function saveCosmetics(payload) {
    if (!subscription.value?.isActive) {
      throw new Error('Pack Élite requis.');
    }
    const res = await fetch(`${API_BASE}/api/elite/cosmetics`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    identity.value = data.identity
    equipped.value = {
      titleSlug: data.equipped?.title_slug ?? data.equipped?.titleSlug,
      bannerSlug: data.equipped?.banner_slug ?? data.equipped?.bannerSlug,
      nameColor: data.equipped?.name_color ?? data.equipped?.nameColor,
    }
    return data
  }

  async function activateDevPack() {
    const res = await fetch(`${API_BASE}/api/dev/grant-elite`, { method: 'POST' })
    if (!res.ok) throw new Error(await readApiError(res))
    await fetchElite()
  }

  async function startCheckout() {
    clearCheckoutNotice()
    const res = await fetch(`${API_BASE}/api/elite/checkout`, { method: 'POST' })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    if (data.mode === 'dev_grant') {
      await fetchElite()
      checkoutNotice.value = 'success'
      return data
    }
    if (data.url) {
      window.location.href = data.url
    }
    return data
  }

  async function confirmCheckout(sessionId) {
    const res = await fetch(
      `${API_BASE}/api/elite/checkout/confirm?session_id=${encodeURIComponent(sessionId)}`
    )
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    await fetchElite()
    if (data.subscription?.isActive) {
      await fetchTools()
    }
    return data
  }

  async function fetchTools() {
    if (!subscription.value?.isActive) return
    toolsLoading.value = true
    try {
      const res = await fetch(`${API_BASE}/api/elite/tools`)
      if (!res.ok) throw new Error(await readApiError(res))
      tools.value = await res.json()
    } finally {
      toolsLoading.value = false
    }
  }

  async function fetchMatchReport(matchId) {
    if (!subscription.value?.isActive) return
    reportLoading.value = true
    reportError.value = null
    try {
      const res = await fetch(`${API_BASE}/api/matches/${matchId}/elite-report`)
      if (!res.ok) throw new Error(await readApiError(res))
      matchReport.value = await res.json()
    } catch (e) {
      reportError.value = e.message
      matchReport.value = null
    } finally {
      reportLoading.value = false
    }
  }

  async function simulateMatchup(opponentComposition, runs = 100) {
    if (!subscription.value?.isActive) {
      throw new Error('Pack Élite requis.')
    }
    const res = await fetch(`${API_BASE}/api/elite/tools/matchup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentComposition, runs }),
    })
    if (!res.ok) throw new Error(await readApiError(res))
    lastMatchup.value = await res.json()
    return lastMatchup.value
  }

  return {
    loading,
    error,
    subscription,
    seasonPass,
    catalog,
    identity,
    equipped,
    fetchElite,
    saveCosmetics,
    activateDevPack,
    startCheckout,
    confirmCheckout,
    fetchTools,
    fetchMatchReport,
    simulateMatchup,
    tools,
    toolsLoading,
    matchReport,
    reportLoading,
    reportError,
    lastMatchup,
    checkoutNotice,
    checkoutError,
    clearCheckoutNotice,
    handleCheckoutReturn,
  }
})
