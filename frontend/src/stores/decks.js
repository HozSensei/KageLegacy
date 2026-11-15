import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { readApiError, parseApiResponse } from '../utils/http.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useDecksStore = defineStore('decks', () => {
  const decks = ref([])
  const activeDeck = ref(null)
  const editingDeck = ref(null)
  const passiveBonuses = ref(null)
  const constraints = ref({
    min: 20,
    max: 30,
    maxCopies: 3,
    maxClan: 1,
    maxLegendaryOrMythic: 3,
  })
  const loading = ref(false)
  const error = ref(null)
  const actionLoading = ref(false)

  const deckSize = computed(() => editingDeck.value?.size ?? 0)

  async function fetchDecks() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/decks`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      decks.value = body.decks || []
      if (body.constraints) constraints.value = body.constraints
      activeDeck.value = decks.value.find((d) => d.isActive) || null
      return decks.value
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchPassiveBonuses() {
    try {
      const res = await fetch(`${API_BASE}/api/decks/passive-bonuses`, {
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      passiveBonuses.value = body.bonuses || null
      return passiveBonuses.value
    } catch (e) {
      error.value = e.message
      return null
    }
  }

  async function createDeck(name, archetype = 'midrange') {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/decks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, archetype }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      await fetchDecks()
      editingDeck.value = body.deck
      return body.deck
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      actionLoading.value = false
    }
  }

  async function selectDeck(deckId) {
    const res = await fetch(`${API_BASE}/api/decks/${deckId}`, { credentials: 'include' })
    const { ok, body } = await parseApiResponse(res)
    if (!ok) throw new Error(await readApiError(res, body))
    editingDeck.value = body.deck
    return body.deck
  }

  async function activateDeck(deckId) {
    actionLoading.value = true
    try {
      const res = await fetch(`${API_BASE}/api/decks/${deckId}/activate`, {
        method: 'POST',
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      await fetchDecks()
      await fetchPassiveBonuses()
      return body.deck
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      actionLoading.value = false
    }
  }

  async function addCard(deckId, collectionId, quantity = 1) {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/decks/${deckId}/cards`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, quantity }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      editingDeck.value = body.deck
      await fetchDecks()
      return body.deck
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      actionLoading.value = false
    }
  }

  async function removeCard(deckId, collectionId, quantity = 1) {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(
        `${API_BASE}/api/decks/${deckId}/cards/${collectionId}?quantity=${quantity}`,
        { method: 'DELETE', credentials: 'include' }
      )
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      editingDeck.value = body.deck
      await fetchDecks()
      return body.deck
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      actionLoading.value = false
    }
  }

  return {
    decks,
    activeDeck,
    editingDeck,
    passiveBonuses,
    constraints,
    loading,
    error,
    actionLoading,
    deckSize,
    fetchDecks,
    fetchPassiveBonuses,
    createDeck,
    selectDeck,
    activateDeck,
    addCard,
    removeCard,
  }
})
