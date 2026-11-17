/**
 * Sessions Host PvP — signaling / relay léger (WebSocket).
 *
 * Le serveur :
 *  - authentifie, rattache au match, connaît host vs guest
 *  - relaie actions Guest → Host
 *  - relaie state_sync Host → Guest
 *  - NOTIFIE déconnexions
 *
 * Le serveur NE FAIT PAS :
 *  - recalculer chaque carte comme le moteur PvE
 *  - être la source de vérité continue du duel
 */
import { getMatch } from './matchmakingService.js';

/** @type {Map<string, { matchId: string, host: any, guest: any, lastState: object|null }>} */
const sessions = new Map();

/** @type {Map<any, { userId: number, matchId: string|null, role: string|null }>} */
const sockets = new Map();

function send(ws, payload) {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function getOrCreateSession(matchId) {
  let session = sessions.get(matchId);
  if (!session) {
    session = { matchId, host: null, guest: null, lastState: null };
    sessions.set(matchId, session);
  }
  return session;
}

export function getPvpSession(matchId) {
  return sessions.get(matchId) || null;
}

export function attachPvpSocket(ws, user) {
  sockets.set(ws, { userId: user.id, matchId: null, role: null });
  send(ws, {
    type: 'welcome',
    userId: user.id,
    message: 'PvP signaling prêt. Envoyez { type: "subscribe", matchId }.',
  });
}

export function detachPvpSocket(ws) {
  const meta = sockets.get(ws);
  sockets.delete(ws);
  if (!meta?.matchId) return;

  const session = sessions.get(meta.matchId);
  if (!session) return;

  if (meta.role === 'host' && session.host === ws) session.host = null;
  if (meta.role === 'guest' && session.guest === ws) session.guest = null;

  const peer = meta.role === 'host' ? session.guest : session.host;
  send(peer, {
    type: 'peer_disconnected',
    matchId: meta.matchId,
    role: meta.role,
  });

  if (!session.host && !session.guest) {
    sessions.delete(meta.matchId);
  }
}

/**
 * Traite un message JSON client.
 * @param {import('ws').WebSocket} ws
 * @param {object} msg
 */
export async function handlePvpMessage(ws, msg) {
  const meta = sockets.get(ws);
  if (!meta) {
    send(ws, { type: 'error', message: 'Socket non enregistrée.' });
    return;
  }

  const type = msg?.type;
  if (!type) {
    send(ws, { type: 'error', message: 'type requis.' });
    return;
  }

  switch (type) {
    case 'ping':
      send(ws, { type: 'pong', t: Date.now() });
      return;

    case 'subscribe':
      await subscribe(ws, meta, msg.matchId);
      return;

    case 'action':
      // Guest (ou Host) → relay vers Host uniquement si guest ; host ignore self-relay
      relayAction(ws, meta, msg);
      return;

    case 'state_sync':
      // Host → Guest
      relayStateSync(ws, meta, msg);
      return;

    case 'match_end':
      relayMatchEnd(ws, meta, msg);
      return;

    default:
      send(ws, { type: 'error', message: `Type inconnu : ${type}` });
  }
}

async function subscribe(ws, meta, matchId) {
  if (!matchId) {
    send(ws, { type: 'error', message: 'matchId requis.' });
    return;
  }

  let info;
  try {
    info = await getMatch(matchId, meta.userId);
  } catch (err) {
    send(ws, { type: 'error', message: err.message || 'Match inaccessible.' });
    return;
  }

  // Détacher d'un éventuel match précédent
  if (meta.matchId && meta.matchId !== matchId) {
    detachFromSession(ws, meta);
  }

  meta.matchId = matchId;
  meta.role = info.role;

  const session = getOrCreateSession(matchId);
  if (info.role === 'host') session.host = ws;
  else session.guest = ws;

  send(ws, {
    type: 'subscribed',
    matchId,
    role: info.role,
    match: info.match,
    peerOnline: info.role === 'host' ? Boolean(session.guest) : Boolean(session.host),
    lastState: info.role === 'guest' ? session.lastState : null,
  });

  const peer = info.role === 'host' ? session.guest : session.host;
  send(peer, {
    type: 'peer_joined',
    matchId,
    role: info.role,
  });
}

function detachFromSession(ws, meta) {
  const session = sessions.get(meta.matchId);
  if (!session) return;
  if (meta.role === 'host' && session.host === ws) session.host = null;
  if (meta.role === 'guest' && session.guest === ws) session.guest = null;
}

function relayAction(ws, meta, msg) {
  if (!meta.matchId || !meta.role) {
    send(ws, { type: 'error', message: 'Non abonné à un match.' });
    return;
  }
  const session = sessions.get(meta.matchId);
  if (!session?.host) {
    send(ws, { type: 'error', message: 'Host hors ligne — action non relayée.' });
    return;
  }

  // Toute intention joueur est destinée au Host (autorité simu)
  if (ws === session.host) {
    // Host n'a pas besoin de se relayer à lui-même ; ack optionnel
    send(ws, { type: 'action_ack', local: true, action: msg.action });
    return;
  }

  send(session.host, {
    type: 'peer_action',
    matchId: meta.matchId,
    fromUserId: meta.userId,
    fromRole: meta.role,
    action: msg.action,
  });
  send(ws, { type: 'action_ack', relayed: true });
}

function relayStateSync(ws, meta, msg) {
  if (!meta.matchId || meta.role !== 'host') {
    send(ws, { type: 'error', message: 'Seul le Host peut synchroniser l’état.' });
    return;
  }
  const session = sessions.get(meta.matchId);
  if (!session) return;

  session.lastState = msg.state || null;
  send(session.guest, {
    type: 'state',
    matchId: meta.matchId,
    state: msg.state,
    checksum: msg.checksum || null,
    turn: msg.turn || null,
  });
}

function relayMatchEnd(ws, meta, msg) {
  if (!meta.matchId) {
    send(ws, { type: 'error', message: 'Non abonné.' });
    return;
  }
  const session = sessions.get(meta.matchId);
  if (!session) return;

  const payload = {
    type: 'match_ended',
    matchId: meta.matchId,
    result: msg.result || null,
    checksum: msg.checksum || null,
    fromRole: meta.role,
    confirmationRequired: true,
    confirmationEndpoint: `/api/pvp/matches/${meta.matchId}/report`,
  };
  send(session.host, payload);
  send(session.guest, payload);
}

export function listActiveSessionCount() {
  return sessions.size;
}
