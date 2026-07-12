/**
 * Panneau admin : activé via ENABLE_ADMIN_PANEL=true et protégé par ADMIN_SECRET.
 */

export function isAdminPanelEnabled() {
  return process.env.ENABLE_ADMIN_PANEL === 'true';
}

export function requireAdminSecret(req, res, next) {
  if (!isAdminPanelEnabled()) {
    return res.status(403).json({ error: 'Panneau admin désactivé.' });
  }

  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return res.status(503).json({ error: 'ADMIN_SECRET non configuré côté serveur.' });
  }

  const provided = req.headers['x-admin-secret'];
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Secret admin invalide.' });
  }

  next();
}
