# Documentation Kage Legacy

Cette documentation décrit le produit actuellement implémenté. Elle remplace les anciens audits, spécifications V2/V3 et rapports ponctuels.

Kage Legacy est un TCG shinobi jouable dans le navigateur, centré sur la collection, les améliorations, la construction de decks, les combats PvE, les missions, les duels asynchrones et la progression.

## Index

- [Démarrage local](QUICK_START.md) : installation, base de données, développement, E2E.
- [Architecture](ARCHITECTURE.md) : structure du dépôt, API, données et frontières frontend/backend.
- [Règles du jeu](GAME_RULES.md) : règles joueur et progression.
- [Cartes et combat](CARDS_AND_COMBAT.md) : voies, effets, combos, héritages, tours et simulation.
- [Économie et progression](PROGRESSION.md) : collection, decks, talents, monnaies, boutique, Battle Pass et récompenses.
- [Duel de decks asynchrone](ASYNC_DUELS.md) : défense hors ligne, IA, récompenses et déploiement.
- [Tests et équilibrage](TESTING.md) : validations disponibles et commande d'audit du catalogue.
- [Exploitation](OPERATIONS.md) : variables d'environnement, Docker, production, Stripe et scheduler.
- [Décisions de conception](DESIGN.md) : choix de la refonte des voies, raretés, combos et héritages.

## Sources de vérité

En cas de divergence, vérifier dans cet ordre :

1. le code monté dans `backend/src/app.js` et exposé par les vues de `frontend/src` ;
2. les données des 250 cartes dans `backend/scripts/seedCards.js`, `backend/scripts/data/` et `backend/schema.sql` ;
3. les tests ciblés de `backend/scripts/` ;
4. cette documentation ;
5. le contenu historique de `specs/`, qui n'est pas une garantie de livraison.

Les règles affichées aux joueurs sont conservées dans `frontend/src/content/rules.fr.md` et `rules.en.md`. Une modification de règle doit mettre à jour ces fichiers et la documentation concernée.

## Périmètre actuel

Actifs et exposés : collection, decks, talents, combats PvE, missions à nœuds, boutique, Battle Pass, succès, factions cosmétiques, classement, duels asynchrones et administration. Lore intervillage : [LORE.md](LORE.md).

Non actifs : gestion d'escouade, cycle asynchrone de 72 h, tactiques de cycle ou toute fonctionnalité ancienne uniquement retrouvée dans `specs/` ou dans des chaînes mortes.
