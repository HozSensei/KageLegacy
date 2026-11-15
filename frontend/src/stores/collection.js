import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { readApiError, parseApiResponse } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useCollectionStore = defineStore('collection', () => {
  const entries = ref([])
  const loading = ref(false)
  const error = ref(null)
  const actionLoading = ref(false)

  const byType = computed(() => {
    const map = {}
    for (const entry of entries.value) {
      const type = entry.card?.type || 'other'
      if (!map[type]) map[type] = []
      map[type].push(entry)
    }
    return map
  })

  const totalCards = computed(() =>
    entries.value.reduce((sum, e) => sum + (e.quantity || 0), 0)
  )

  async function fetchCollection(params = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.type) query.set('type', params.type)
      if (params.rarity) query.set('rarity', params.rarity)
      const qs = query.toString()
      const res = await fetch(`${API_BASE}/api/collection${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      entries.value = body.collection || []
      return entries.value
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function upgrade(collectionId) {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/collection/${collectionId}/upgrade`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      await fetchCollection()
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      actionLoading.value = false
    }
  }

  async function disenchant(collectionId, quantity = 1) {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/collection/${collectionId}/disenchant`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      await fetchCollection()
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      actionLoading.value = false
    }
  }

  function findByCollectionId(id) {
    return entries.value.find((e) => e.collectionId === Number(id)) || null
  }

  return {
    entries,
    loading,
    error,
    actionLoading,
    byType,
    totalCards,
    fetchCollection,
    upgrade,
    disenchant,
    findByCollectionId,
  }
})
