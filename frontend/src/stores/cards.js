import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { readApiError, parseApiResponse } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useCardsStore = defineStore('cards', () => {
  const catalog = ref([])
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({
    type: '',
    rarity: '',
    search: '',
  })

  const filteredCatalog = computed(() => {
    let list = catalog.value
    if (filters.value.type) list = list.filter((c) => c.type === filters.value.type)
    if (filters.value.rarity) list = list.filter((c) => c.rarity === filters.value.rarity)
    if (filters.value.search) {
      const q = filters.value.search.toLowerCase()
      list = list.filter(
        (c) =>
          c.nameFr?.toLowerCase().includes(q) ||
          c.nameEn?.toLowerCase().includes(q) ||
          c.slug?.toLowerCase().includes(q)
      )
    }
    return list
  })

  async function fetchCatalog(params = {}) {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.type) query.set('type', params.type)
      if (params.rarity) query.set('rarity', params.rarity)
      if (params.search) query.set('search', params.search)
      const qs = query.toString()
      const res = await fetch(`${API_BASE}/api/cards${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      catalog.value = body.cards || []
      return catalog.value
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  function setFilter(key, value) {
    filters.value = { ...filters.value, [key]: value }
  }

  function getById(id) {
    return catalog.value.find((c) => c.id === Number(id)) || null
  }

  return {
    catalog,
    loading,
    error,
    filters,
    filteredCatalog,
    fetchCatalog,
    setFilter,
    getById,
  }
})
