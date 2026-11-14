import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { parseApiResponse, readApiError } from '../utils/http.js'
import { connectPvpWs } from '../lib/pvpWs.js'
import {
  applyDuelAction,
  createDuelFromBootstrap,
  publicDuelState,
} from '@shared/pvp/duelEngine.js'
import { duelChecksum } from '@shared/pvp/checksum.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const usePvpStore = defineStore('pvp', () => {
  const config = ref(null)
  const queueStatus = ref('idle')
  const queue = ref(null)
  const match = ref(null)
  const role = ref(null)
  const duel = ref(null)
  const publicState = ref(null)
  const recentLogs = ref([])
  const loading = ref(false)
  const actionLoading = ref(false)
  const error = ref(null)
  const selectedInstanceId = ref(null)
  const peerOnline = ref(false)
  const wsConnected = ref(false)

  let wsClient = null

  const isHost = computed(() => role.value === 'host')
  const isGuest = computed(() => role.value === 'guest')
  const isOver = computed(() =>
    ['completed', 'forfeited', 'cancelled'].includes(duel.value?.status) ||
    ['completed', 'forfeited', 'cancelled'].includes(match.value?.status)
  )
  const mySeat = computed(() => role.value)
  const isMyTurn = computed(() => {
    if (!duel.value || isOver.value) return false
    return duel.value.activeSeat === role.value
  })

  async function fetchConfig() {
    const res = await fetch(`${API_BASE}/api/pvp/config`, { credentials: 'include' })
    const { ok, body } = await parseApiResponse(res)
    if (!ok) throw new Error(await readApiError(res, body))
    config.value = body
    return body
  }

  async function refreshQueue() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/pvp/queue`, { credentials: 'include' })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      applyQueueResult(body)
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function joinQueue({ deckId = null, levelWindow = null } = {}) {
    loading.value = true
    error.value = null
    try {
      const payload = {}
      if (deckId != null) payload.deckId = deckId
      if (levelWindow != null) payload.levelWindow = levelWindow
      const res = await fetch(`${API_BASE}/api/pvp/queue`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      applyQueueResult(body)
      return body
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function leaveQueue() {
    const res = await fetch(`${API_BASE}/api/pvp/queue`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const { ok, body } = await parseApiResponse(res)
    if (!ok) throw new Error(await readApiError(res, body))
    queueStatus.value = 'idle'
    queue.value = null
    return body
  }

  function applyQueueResult(body) {
    queueStatus.value = body.status || 'idle'
    queue.value = body.queue || null
    if (body.match) {
      match.value = body.match
      role.value = body.role
    }
  }

  async function fetchMatch(matchId) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/pvp/matches/${matchId}`, {
        credentials: 'include',
      })
      const { ok, body } = await parseApiResponse(res)
      if (!ok) throw new Error(await readApiError(res, body))
      match.value = body.match
      role.value = body.role
      return body
    } catch (e) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  async function markReady(matchId) {
    const res = await fetch(`${API_BASE}/api/pvp/matches/${matchId}/ready`, {
      method: 'POST',
      credentials: 'include',
    })
    const { ok, body } = await parseApiResponse(res)
    if (!ok) throw new Error(await readApiError(res, body))
    match.value = body.match
    role.value = body.role
    return body
  }

  async function reportResult(matchId, payload) {
    const res = await fetch(`${API_BASE}/api/pvp/matches/${matchId}/report`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const { ok, body } = await parseApiResponse(res)
    if (!ok) throw new Error(await readApiError(res, body))
    match.value = body.match
    return body
  }

  function initDuelFromMatch(m = match.value) {
    if (!m?.bootstrap) {
      error.value = 'Bootstrap duel manquant.'
      return null
    }
    const state = createDuelFromBootstrap(m.bootstrap)
    duel.value = state
    recentLogs.value = [...(state.logs || [])]
    refreshPublicView()
    return state
  }

  function refreshPublicView() {
    if (!duel.value || !role.value) {
      publicState.value = null
      return
    }
    publicState.value = publicDuelState(duel.value, role.value)
  }

  function connectWs(matchId) {
    disconnectWs()
    wsClient = connectPvpWs({
      onOpen() {
        wsConnected.value = true
        wsClient.send({ type: 'subscribe', matchId })
      },
      onClose() {
        wsConnected.value = false
      },
      onMessage(msg) {
        handleWsMessage(msg)
      },
    })
  }

  function disconnectWs() {
    if (wsClient) {
      wsClient.close()
      wsClient = null
    }
    wsConnected.value = false
  }

  function handleWsMessage(msg) {
    switch (msg.type) {
      case 'subscribed':
        peerOnline.value = Boolean(msg.peerOnline)
        if (msg.match) {
          match.value = msg.match
          role.value = msg.role
        }
        if (role.value === 'host' && !duel.value && match.value?.bootstrap) {
          initDuelFromMatch(match.value)
          broadcastState()
        }
        if (role.value === 'guest' && msg.lastState) {
          publicState.value = msg.lastState
        }
        break
      case 'peer_joined':
        peerOnline.value = true
        break
      case 'peer_disconnected':
        peerOnline.value = false
        break
      case 'peer_action':
        if (role.value === 'host' && msg.action) {
          applyHostAction(msg.action)
        }
        break
      case 'state':
        if (role.value === 'guest') {
          publicState.value = msg.state
          if (msg.state?.logs?.length) {
            recentLogs.value = [...msg.state.logs].reverse().slice(0, 40)
          }
          if (['completed', 'forfeited'].includes(msg.state?.status)) {
            duel.value = {
              ...(duel.value || {}),
              status: msg.state.status,
              winnerSeat: msg.state.winnerSeat,
            }
          }
        }
        break
      case 'match_ended':
        if (msg.result) {
          match.value = { ...(match.value || {}), ...msg.result }
        }
        break
      case 'error':
        error.value = msg.message
        break
      default:
        break
    }
  }

  function applyHostAction(action) {
    if (role.value !== 'host' || !duel.value) return null
    actionLoading.value = true
    try {
      const result = applyDuelAction(duel.value, action)
      if (result.error) {
        error.value = result.error
        return null
      }
      duel.value = result.state
      if (result.logs?.length) {
        recentLogs.value = [...result.logs, ...recentLogs.value].slice(0, 40)
      }
      refreshPublicView()
      broadcastState()
      maybeReportEnd()
      return result.state
    } finally {
      actionLoading.value = false
    }
  }

  function broadcastState() {
    if (!wsClient || role.value !== 'host' || !duel.value) return
    const view = publicDuelState(duel.value, 'guest')
    const { checksum } = duelChecksum(duel.value)
    wsClient.send({
      type: 'state_sync',
      matchId: duel.value.matchId,
      state: view,
      checksum,
      turn: duel.value.turn,
    })
  }

  async function maybeReportEnd() {
    if (!duel.value || !match.value) return
    if (!['completed', 'forfeited'].includes(duel.value.status)) return
    if (role.value !== 'host') return

    const { checksum, summary } = duelChecksum(duel.value)
    try {
      await reportResult(match.value.id, {
        winnerSeat: duel.value.winnerSeat,
        checksum,
        summary,
        endReason: duel.value.status === 'forfeited' ? 'forfeit' : 'hp',
        forfeit: duel.value.status === 'forfeited',
      })
      wsClient?.send({
        type: 'match_end',
        matchId: match.value.id,
        result: { status: duel.value.status, winnerSeat: duel.value.winnerSeat },
        checksum,
      })
    } catch (e) {
      error.value = e.message
    }
  }

  /** Action locale (Host joue) ou intention relayée (Guest). */
  async function sendAction(kind, instanceId = null) {
    if (!role.value || !match.value) return
    const action = { kind, seat: role.value, instanceId }

    if (role.value === 'host') {
      return applyHostAction(action)
    }

    // Guest → relay vers Host
    actionLoading.value = true
    error.value = null
    try {
      if (!wsClient) throw new Error('WebSocket non connecté.')
      wsClient.send({ type: 'action', matchId: match.value.id, action })
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      actionLoading.value = false
    }
  }

  function clear() {
    disconnectWs()
    queueStatus.value = 'idle'
    queue.value = null
    match.value = null
    role.value = null
    duel.value = null
    publicState.value = null
    recentLogs.value = []
    selectedInstanceId.value = null
    peerOnline.value = false
    error.value = null
  }

  return {
    config,
    queueStatus,
    queue,
    match,
    role,
    duel,
    publicState,
    recentLogs,
    loading,
    actionLoading,
    error,
    selectedInstanceId,
    peerOnline,
    wsConnected,
    isHost,
    isGuest,
    isOver,
    mySeat,
    isMyTurn,
    fetchConfig,
    refreshQueue,
    joinQueue,
    leaveQueue,
    fetchMatch,
    markReady,
    reportResult,
    initDuelFromMatch,
    connectWs,
    disconnectWs,
    sendAction,
    clear,
  }
})
