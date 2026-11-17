# Kage Legacy

TCG shinobi jouable dans le navigateur, centré sur la collection, l'amélioration et la construction de decks de cartes. Le jeu propose notamment des combats PvE à cartes, des missions, une progression de personnage, des talents, un Battle Pass et du PvP.

> Les systèmes de gestion d'escouade et de cycle asynchrone de 72 h appartiennent à l'ancien jeu. Le code ou les documents qui les mentionnent encore sont hérités et ne décrivent pas le produit actuel.

## Documentation

- [`AGENTS.md`](./AGENTS.md) : cartographie du dépôt, configuration et commandes courantes.
- [`docs/`](./docs/) : documentation fonctionnelle et technique; vérifier les implémentations avant de s'appuyer sur des valeurs de gameplay.
- [`specs/`](./specs/) : spécifications et jalons de conception, qui ne garantissent pas que chaque élément soit livré.
- Règles du jeu affichées dans l'application : [`frontend/src/content/rules.fr.md`](./frontend/src/content/rules.fr.md) et [`frontend/src/content/rules.en.md`](./frontend/src/content/rules.en.md).

## Stack

- Backend : Node.js, Express, MySQL.
- Frontend : Vue 3, Vite, Pinia, Vue Router et vue-i18n.
- Infrastructure locale : Docker Compose et MySQL 8.

## Développement

Prérequis : Node.js et Docker avec Docker Compose.

```sh
cp .env.example .env
npm run setup
npm run dev
```

Le frontend est servi sur `http://localhost:5173` et l'API sur `http://localhost:3000`.

Commandes usuelles (voir les manifestes `package.json` pour la liste complète) :

- `npm run lint` : lint backend et frontend.
- `npm run db:up` / `npm run db:down` : démarrer/arrêter MySQL.
- `npm run db:migrate` : appliquer les migrations.
- `npm run db:seed-v2` : données cartes, talents et Battle Pass. `npm run db:seed` et `npm run setup` utilisent encore un seed legacy qui réinitialise les ninjas du compte démo : ne pas les lancer en production.
- `npm run test:combat-engine`, `npm run test:combat-balance`, `npm run test:e2e` : tests ciblés. Les tests E2E exigent une base dédiée : voir [Démarrage rapide](docs/QUICK_START.md#tests-e2e).

Ne jamais committer de secrets. Utiliser les fichiers `.env*.example` comme modèles et conserver les valeurs réelles dans des fichiers locaux ignorés.
