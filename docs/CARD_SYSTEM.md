# Système de cartes

Le jeu repose sur une collection de cartes utilisée pour construire des decks, combattre et progresser.

## Fonctionnalités actives

- Acquisition de cartes via les boosters, les récompenses de combat et le Battle Pass.
- Construction et activation de decks.
- Désenchantement de copies pour obtenir des ressources.
- Amélioration des cartes de Base vers `+` puis `++`; les mythiques ne montent qu'à `+`.
- Effets, coûts, statistiques et passifs résolus par les services backend.

## Source de vérité

Les effets de cartes et les valeurs de gameplay évoluent avec le code. Vérifier les définitions/catalogues, les seeds, `backend/src/services/` et `backend/src/config/economyConfig.js` avant de modifier ou documenter un chiffre.

Les contraintes de composition et le deck actif sont gérés par `backend/src/services/deckService.js`; les améliorations et le désenchantement par `backend/src/services/collectionService.js`.

## Hors périmètre actuel

Le craft de cartes et les cosmétiques ne font pas partie du produit actif. Les migrations historiques ou anciens documents qui les mentionnent ne constituent pas une fonctionnalité livrée.
