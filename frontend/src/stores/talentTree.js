import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { parseApiResponse, readApiError } from '../utils/http.js'
import { usePlayerStore } from './player'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useTalentTreeStore = defineStore('talentTree', () => {
  const nodes = ref([])
  const unlockedNodeIds = ref([])
  const talentPointsAvailable = ref(0)
  const level = ref(1)
  const effects = ref([])
  const bonuses = ref(null)
  const respec = ref(null)
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref(null)
  const selectedNodeId = ref(null)
  const branchFilter = ref('')

  const unlockedSet = computed(() => new Set(unlockedNodeIds.value))

  const selectedNode = computed(
    () => nodes.value.find((n) => n.nodeId === selectedNodeId.value) || null
  )

  const filteredNodes = computed(() => {
    if (!branchFilter.value) return nodes.value
    return nodes.value.filter(
      (n) => n.branch === branchFilter.value || n.branch === 'center'
    )
  })

  const edges = computed(() => {
    const byId = new Map(nodes.value.map((n) => [n.nodeId, n]))
    const list = []
    for (const n of nodes.value) {
      for (const req of n.requires || []) {
        const from = byId.get(req)
        if (from) list.push({ from, to: n })
      }
    }
    return list
  })

  function isUnlocked(nodeId) {
    return unlockedSet.value.has(nodeId)
  }

  function isUnlockable(node) {
    if (!node || isUnlocked(node.nodeId)) return false
    if (talentPointsAvailable.value < 1) return false
    return (node.requires || []).every((req) => unlockedSet.value.has(req))
  }

  async function fetchTree() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/talents/tree`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      nodes.value = body.nodes || []
      return nodes.value
    } catch (e) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/talents/me`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      applyTalentPayload(body.talents, body.bonuses)
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  function applyTalentPayload(talents, nextBonuses) {
    if (!talents) return
    unlockedNodeIds.value = talents.unlockedNodeIds || []
    talentPointsAvailable.value = talents.talentPointsAvailable ?? 0
    level.value = talents.level ?? 1
    effects.value = talents.effects || []
    respec.value = talents.respec || null
    if (nextBonuses) bonuses.value = nextBonuses
  }

  async function loadAll() {
    await Promise.all([fetchTree(), fetchMe()])
  }

  async function unlock(nodeId) {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/talents/unlock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId }),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      applyTalentPayload(body.talents, body.bonuses)
      const player = usePlayerStore()
      await player.fetchPlayer()
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      actionLoading.value = false
    }
  }

  async function respecTree() {
    actionLoading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/talents/respec`, {
        method: 'POST',
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      applyTalentPayload(body.talents, body.bonuses)
      const player = usePlayerStore()
      await player.fetchPlayer()
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      actionLoading.value = false
    }
  }

  function selectNode(nodeId) {
    selectedNodeId.value = nodeId
  }

  function setBranchFilter(branch) {
    branchFilter.value = branch || ''
  }

  function reset() {
    nodes.value = []
    unlockedNodeIds.value = []
    talentPointsAvailable.value = 0
    effects.value = []
    bonuses.value = null
    respec.value = null
    error.value = null
    selectedNodeId.value = null
  }

  return {
    nodes,
    unlockedNodeIds,
    talentPointsAvailable,
    level,
    effects,
    bonuses,
    respec,
    loading,
    actionLoading,
    error,
    selectedNodeId,
    branchFilter,
    unlockedSet,
    selectedNode,
    filteredNodes,
    edges,
    isUnlocked,
    isUnlockable,
    fetchTree,
    fetchMe,
    loadAll,
    unlock,
    respecTree,
    selectNode,
    setBranchFilter,
    reset,
  }
})
