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

export function cardActionError(message, locale, t) {
  if (!message) return t('cards.requestFailed');
  const key = errorKeys[message];
  if (key) return t(`cards.${key}`);
  const bilingual = message.split(' / ');
  if (bilingual.length === 2) return locale === 'en' ? bilingual[1] : bilingual[0];
  return locale === 'fr' ? message : t('cards.requestFailed');
}
