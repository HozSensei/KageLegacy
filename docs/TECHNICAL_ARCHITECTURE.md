# Architecture technique

Cette page décrit l'organisation actuellement présente dans le dépôt. Pour les scripts et chemins de configuration, voir aussi [`AGENTS.md`](../AGENTS.md). Les fonctionnalités legacy peuvent encore subsister dans certains fichiers; leur présence ne signifie pas qu'elles sont exposées comme partie du TCG.

## Stack vérifiée

- Backend : Node.js (ES modules), Express, MySQL via `mysql2`, validation avec Zod.
- Frontend : Vue 3, Vite, Pinia, Vue Router et vue-i18n.
- Déploiement/local : Docker Compose, MySQL 8; les workflows sont dans `.github/workflows/`.

## Backend

- `backend/src/index.js` démarre le serveur; `backend/src/app.js` configure middleware et routes.
- `backend/src/routes/` contient les endpoints. `app.js` monte actuellement les routes health, auth, clock, player, cards, collection, decks, talents, combat, missions, battle-pass, achievements, shop, PvP, factions et leaderboard.
- `backend/src/services/` contient les services métier. Les domaines combat deck, missions, cartes, économie, progression, PvP et narratif y sont organisés, avec quelques fichiers hérités.
- `backend/src/models/`, `validators/`, `config/` et `db/` contiennent respectivement modèles, validation, configuration et accès à la base.
- `backend/schema.sql` est le schéma initial complet. `npm run db:migrate` l'installe une seule fois sur une base vide ; les mises à niveau incrémentales ne sont pas prises en charge.

## Frontend

- Bootstrap Vue dans `frontend/src/main.js` et `App.vue`; navigation dans `src/router/`.
- Écrans dans `src/views/`, composants réutilisables dans `src/components/`, état et appels API dans `src/stores/`.
- Textes FR/EN dans `src/locales/`; règles affichées à l'écran dans `src/content/rules.fr.md` et `rules.en.md`.

## Source de vérité pour les règles et l'équilibrage

Les effets de cartes, caractéristiques des ninjas et règles de combat évoluent avec l'implémentation. Vérifier les catalogues, seeds, services et tests réellement utilisés avant de modifier ou reprendre des valeurs documentées. Les seuils de tests de balance sont dans `backend/src/config/combatBalanceConfig.js`; les constantes économiques sont dans `backend/src/config/economyConfig.js`; le loadout initial est dans `backend/src/config/starterLoadout.js`.

## Commandes

Les scripts disponibles et leur définition exacte sont les manifestes `package.json` à la racine, dans `backend/` et dans `frontend/`. Les commandes de développement usuelles et la préparation DB sont résumées dans [`QUICK_START.md`](./QUICK_START.md).
