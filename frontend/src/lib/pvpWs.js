/**
 * Client WebSocket PvP — signaling / relay Host↔Guest.
 */
const API_BASE = import.meta.env.VITE_API_URL || ''

function wsUrl(path = '/ws/pvp') {
  if (API_BASE) {
    const base = API_BASE.replace(/^http/, 'ws').replace(/\/$/, '')
    return `${base}${path}`
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}${path}`
}

export function connectPvpWs({ onMessage, onClose, onOpen } = {}) {
  const socket = new WebSocket(wsUrl('/ws/pvp'))

  socket.addEventListener('open', () => {
    if (onOpen) onOpen(socket)
  })

  socket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data)
      if (onMessage) onMessage(data)
    } catch {
      /* ignore */
    }
  })

  socket.addEventListener('close', () => {
    if (onClose) onClose()
  })

  return {
    socket,
    send(payload) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload))
      }
    },
    close() {
      try {
        socket.close()
      } catch {
        /* ignore */
      }
    },
  }
}
