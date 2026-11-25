/**
 * Catégories d’affichage des notifications (libellé + ton design system).
 * Les gains (`kind: gain`) se différencient par type de grant, pas seulement
 * par source (mission / combat / …), pour éviter un unique « Mission terminée ».
 */

const CURRENCY_TYPES = new Set(['xp', 'ryos', 'dust', 'essence', 'kage_coins']);
const ITEM_TYPES = new Set(['inventory_item', 'booster', 'card']);

export function grantTypes(grants) {
  return [
    ...new Set(
      (Array.isArray(grants) ? grants : [])
        .filter(g => g && !g.skipped && g.type)
        .map(g => String(g.type)),
    ),
  ];
}

/**
 * Clé i18n `notifications.*` pour un gain, d’après les grants.
 * Retourne null si aucun grant exploitable (fallback source côté copy).
 */
export function gainTitleKeyFromGrants(grants) {
  const types = grantTypes(grants);
  if (!types.length) return null;

  const only = type => types.length === 1 && types[0] === type;
  if (only('inventory_item')) return 'notifications.gainItemTitle';
  if (only('xp')) return 'notifications.gainXpTitle';
  if (only('ryos')) return 'notifications.gainRyosTitle';
  if (only('dust')) return 'notifications.gainDustTitle';
  if (only('essence')) return 'notifications.gainEssenceTitle';
  if (only('kage_coins')) return 'notifications.gainKageCoinsTitle';
  if (only('card')) return 'notifications.gainCardTitle';
  if (only('booster')) return 'notifications.gainBoosterTitle';
  if (only('nickname')) return 'notifications.gainNicknameTitle';
  if (only('frame')) return 'notifications.gainFrameTitle';

  if (types.length === 2 && types.includes('xp') && types.includes('ryos')) {
    return 'notifications.gainXpRyosTitle';
  }

  if (types.every(type => CURRENCY_TYPES.has(type))) {
    return 'notifications.gainCurrencyTitle';
  }

  if (types.every(type => ITEM_TYPES.has(type))) {
    return 'notifications.gainLootTitle';
  }

  return 'notifications.gainTitle';
}

/**
 * Ton sémantique pour le libellé (tokens CSS existants).
 * @returns {'item'|'xp'|'ryos'|'currency'|'loot'|'quest'|'social'|'alert'|'reward'|'default'}
 */
export function notificationCategory(note) {
  if (!note) return 'default';
  switch (note.kind) {
    case 'quest_ready':
      return 'quest';
    case 'achievement_ready':
    case 'onboarding_ready':
      return 'quest';
    case 'friend_request':
      return 'social';
    case 'bug_report_new':
      return 'alert';
    case 'bug_report_reward':
    case 'village_reward':
    case 'village_ready':
      return 'reward';
    case 'gain': {
      const source = note.payload?.source;
      if (
        source === 'onboarding' ||
        source === 'battle_pass' ||
        source === 'quest' ||
        source === 'achievement'
      ) {
        return 'reward';
      }
      const types = grantTypes(note.payload?.grants);
      if (!types.length) return 'reward';
      if (types.length === 1 && types[0] === 'inventory_item') return 'item';
      if (types.length === 1 && types[0] === 'xp') return 'xp';
      if (types.length === 1 && types[0] === 'ryos') return 'ryos';
      if (types.length === 1 && (types[0] === 'booster' || types[0] === 'card')) return 'loot';
      if (types.every(type => CURRENCY_TYPES.has(type))) return 'currency';
      if (types.every(type => ITEM_TYPES.has(type))) return 'loot';
      return 'reward';
    }
    default:
      return 'default';
  }
}
