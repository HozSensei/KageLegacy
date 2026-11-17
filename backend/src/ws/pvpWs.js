/**
 * Endpoint WebSocket PvP — signaling + relay Host-authoritative.
 * Path : /ws/pvp
 */
import { WebSocketServer } from 'ws';
import { isDemoFallbackEnabled, parseCookies } from '../middleware/auth.js';
import { getUserBySessionToken } from '../services/authService.js';
import { findDemoUser } from '../models/sensei.js';
import { PVP_WS_PATH } from '../services/pvp/config.js';
import {
  attachPvpSocket,
  detachPvpSocket,
  handlePvpMessage,
} from '../services/pvp/pvpHostSession.js';

const SESSION_COOKIE = 'kage_session';

async function resolveUserFromUpgrade(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE] || null;
  if (token) {
    const user = await getUserBySessionToken(token);
    if (user) return user;
  }
  if (isDemoFallbackEnabled()) {
    return findDemoUser();
  }
  return null;
}

/**
 * Attache le serveur WS au HTTP server Express.
 * @param {import('http').Server} server
 */
export function attachPvpWebSocket(server) {
  const wss = new WebSocketServer({ server, path: PVP_WS_PATH });

  wss.on('connection', async (ws, req) => {
    let user = null;
    try {
      user = await resolveUserFromUpgrade(req);
    } catch (err) {
      console.error('[pvp-ws] auth error', err);
    }

    if (!user) {
      ws.close(4401, 'Non authentifié');
      return;
    }

    attachPvpSocket(ws, user);

    ws.on('message', async raw => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'JSON invalide.' }));
        return;
      }
      try {
        await handlePvpMessage(ws, msg);
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: err.message || 'Erreur signaling.',
          }),
        );
      }
    });

    ws.on('close', () => detachPvpSocket(ws));
    ws.on('error', () => detachPvpSocket(ws));
  });

  console.log(`⚔️  PvP WebSocket — ${PVP_WS_PATH}`);
  return wss;
}
