# Guide agent — Kage Legacy

## État du projet

TCG shinobi jouable dans le navigateur, centré sur la collection, l'amélioration et la construction de decks de cartes, avec combats PvE, missions, progression et fonctionnalités associées. La gestion d'escouade et les cycles asynchrones de 72 h appartiennent à l'ancien jeu (legacy), pas au produit actuel. Le dépôt peut encore contenir du code ou des documents hérités : ne présenter une fonctionnalité comme active qu'après vérification de son implémentation et de son exposition dans l'application.

## Cartographie

### Backend (`backend/`)

- `src/index.js`, `src/app.js` : démarrage serveur, middleware et montage API.
- `src/routes/` : endpoints HTTP. Les routes du combat PvE à cartes, collection, decks, talents, missions, Battle Pass et shop sont montées dans `app.js`. Certaines routes et services de gestion d'escouade/cycle peuvent subsister du legacy : leur présence seule ne signifie pas qu'ils appartiennent au produit actuel.
- `src/services/` : logique métier. `deckCombat/`, `combatEngineService.js`, `missionRunService.js`, `collectionService.js`, `deckService.js` et les services Battle Pass/shop portent les domaines TCG. `combat/`, `tacticCards/` et `narrative/` peuvent contenir des systèmes hérités.
- `src/models/` : modèles d'accès aux données; certains modèles shinobi/escouade sont hérités.
- `src/validators/` : validation des entrées.
- `src/config/` : paramètres transversaux, notamment `combatBalanceConfig.js`, `economyConfig.js`, `starterLoadout.js` et `database.js`.
- `schema.sql` : schéma initial complet ; `npm run db:migrate` l'applique une seule fois sur une base vide. Les évolutions incrémentales ne sont pas prises en charge.
- `scripts/` : seeds, tâches opérationnelles, tests/scripts de simulation et audits.

### Frontend (`frontend/`)

- `src/main.js`, `src/App.vue` : bootstrap Vue.
- `src/router/` : routes et navigation.
- `src/views/` : écrans du TCG, dont hub, profil/création personnage, collection, deck builder, combat, missions, talents, boutique et Battle Pass.
- `src/components/` : composants partagés, regroupés par domaines (cards, combat, talents, shop, joueur, etc.).
- `src/stores/` : état Pinia et appels API par domaine.
- `src/locales/`, `src/i18n.js` : textes d'interface FR/EN.
- `src/content/rules.fr.md` et `rules.en.md` : règles affichées dans l'application.
- `src/constants/`, `src/composables/`, `src/lib/`, `src/utils/` : constantes, composables et utilitaires.

### Configuration et documentation

- Racine : `package.json` (commandes agrégées), `.env.example` et `.env.prod.example` (gabarits d'environnement), `docker-compose*.yml`, `Dockerfile`.
- `backend/package.json`, `frontend/package.json` : scripts et dépendances propres à chaque application.
- `.github/workflows/` : CI et publication d'image.
- `docs/` : documentation fonctionnelle et technique; `specs/` : spécifications et jalons de conception (pas nécessairement état livré).
- `shared/` : ressources partagées; `docker/` : ressources Docker; `scripts/` : utilitaires racine.

## Configuration importante

- Ne jamais committer de secrets. Utiliser les fichiers `.env*.example` comme modèles et garder les valeurs réelles dans les fichiers locaux ignorés.
- Connexion DB via `backend/src/config/database.js` et variables d'environnement; schéma initial via `backend/schema.sql`.
- Économie et coûts : `backend/src/config/economyConfig.js`.
- Seuils et profils de tests d'équilibrage combat : `backend/src/config/combatBalanceConfig.js`.
- Ordre de démarrage local et paramètres des conteneurs : `docker-compose.yml`, `Dockerfile`, scripts racine. Le scheduler intégré conserve la purge des invités et le rafraîchissement des quêtes Battle Pass ; l'horloge et le tick de cycle legacy ne sont plus exposés. Des services et scripts historiques restent à retirer.
- Les statistiques et effets de carte sont définis dans le code des services/catalogues et seeds. Vérifier leur implémentation avant de modifier les chiffres ou de documenter leurs règles; ne pas s'appuyer sur les anciennes valeurs d'un document de conception.

## Commandes usuelles

- `npm run dev` : backend et frontend.
- `npm run lint` : lint backend puis frontend.
- `npm run db:up`, `npm run db:migrate`, `npm run db:seed` : installer le schéma initial sur une base vide puis initialiser les données TCG. `db:seed` utilise le catalogue TCG (cartes, talents et Battle Pass).
- `npm run test:combat-engine`, `npm run test:combat-balance`, `npm run test:card-system --prefix backend` : tests ciblés disponibles (voir `backend/package.json`).
- `npm run e2e:prepare` : prépare une base dédiée `*_e2e` pour certains tests backend (pas de suite Cypress ; le gameplay bouge trop vite pour la maintenir).
