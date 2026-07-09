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
    const res = await fetch(`${API_BASE}/api/elite/checkout`, { method: 'POST' })
    if (!res.ok) throw new Error(await readApiError(res))
    const data = await res.json()
    if (data.mode === 'dev_grant') {
      await fetchElite()
      return data
    }
    if (data.url) {
      window.location.href = data.url
    }
    return data
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
  }
})
