/**
 * Libellés boutique / inventaire de parcours (solo + coop).
 * Priorité : champs catalogue de l’offre API, sinon i18n combat.shopItems* .
 */
import { localizedDescription, localizedName } from './localeContent.js';

function itemId(itemOrId) {
  if (itemOrId == null) return null;
  if (typeof itemOrId === 'string') return itemOrId;
  return itemOrId.id || itemOrId.itemId || null;
}

/**
 * @param {object|string|null} itemOrId — offre shop ou slot inventaire / id
 * @param {{ t: Function, locale: string }} ctx
 */
export function shopItemName(itemOrId, { t, locale }) {
  const id = itemId(itemOrId);
  if (!id) return t('combat.inventoryEmpty');
  if (itemOrId && typeof itemOrId === 'object') {
    const fromApi = localizedName(itemOrId, locale);
    if (fromApi) return fromApi;
  }
  return t(`combat.shopItems.${id}`, id);
}

/**
 * Effet / description de l’objet (soin, boost, parchemin…).
 * @param {object|string|null} itemOrId
 * @param {{ t: Function, locale: string }} ctx
 */
export function shopItemEffect(itemOrId, { t, locale }) {
  const id = itemId(itemOrId);
  if (!id) return '';
  if (itemOrId && typeof itemOrId === 'object') {
    const fromApi = localizedDescription(itemOrId, locale);
    if (fromApi) return fromApi;
  }
  const key = `combat.shopItemEffects.${id}`;
  const label = t(key);
  return label === key ? '' : label;
}
