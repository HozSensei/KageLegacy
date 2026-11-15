/**
 * Validation serveur du bootstrap PvP avant insertion match.
 */
import { validateBootstrap } from '../../../../shared/pvp/antiCheat.js';
import { logPvpAnomaly } from './pvpAnomalyLog.js';

function httpError(statusCode, message, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

/**
 * Valide et renvoie le bootstrap, ou throw 400.
 * @param {object} bootstrap
 * @param {{ hostUserId: number, guestUserId: number, hostLevel: number, guestLevel: number }} expected
 */
export function assertValidBootstrap(bootstrap, expected) {
  const result = validateBootstrap(bootstrap, expected);
  if (!result.ok) {
    logPvpAnomaly('bootstrap_rejected', {
      matchId: bootstrap?.matchId || null,
      hostUserId: expected.hostUserId,
      guestUserId: expected.guestUserId,
      errors: result.errors,
      flags: result.flags,
    });
    throw httpError(400, `Bootstrap PvP invalide : ${result.errors[0]}`, {
      flags: result.flags,
      errors: result.errors,
    });
  }
  return result;
}
