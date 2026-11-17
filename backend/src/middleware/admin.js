/**
 * Panneau admin : réservé aux utilisateurs avec is_admin = TRUE (session requise).
 */

export function isAdminUser(user) {
  return Boolean(user?.is_admin) && !user?.is_guest;
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié.', isAdmin: false });
  }

  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: 'Accès admin requis.', isAdmin: false });
  }

  next();
}
