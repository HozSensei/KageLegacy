const errorKeys = {
  'Carte de collection introuvable.': 'cardNotFound',
  'Cette carte ne peut pas être améliorée.': 'upgradeUnavailable',
  'Carte déjà au niveau maximum (++).': 'upgradeMaxLevel',
  'Les cartes mythiques ne montent qu’au niveau +.': 'upgradeMythicMax',
  'Ryos insuffisants.': 'insufficientRyos',
  'Poussière de carte insuffisante.': 'insufficientDust',
  'Essence insuffisante.': 'insufficientEssence',
  'Quantité insuffisante.': 'insufficientQuantity',
  'Impossible de désenchanter : exemplaires utilisés dans un deck.': 'cardInDeck',
  'Deck introuvable.': 'deckNotFound',
  'Nom du deck requis.': 'deckNameRequired',
  'Nom du deck invalide.': 'deckNameRequired',
  'Pas assez d’exemplaires dans la collection.': 'insufficientQuantity',
  'Carte absente du deck.': 'cardNotInDeck',
};

function localeCode(locale) {
  if (typeof locale === 'string') return locale;
  if (locale && typeof locale === 'object' && 'value' in locale) return String(locale.value || '');
  return String(locale || '');
}

export function cardActionError(message, locale, t) {
  if (!message) return t('cards.requestFailed');
  const lang = localeCode(locale);
  const key = errorKeys[message];
  if (key) return t(`cards.${key}`);
  const bilingual = message.split(' / ');
  if (bilingual.length === 2) return lang.startsWith('en') ? bilingual[1] : bilingual[0];
  return lang.startsWith('fr') ? message : t('cards.requestFailed');
}
