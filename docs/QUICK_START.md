# Démarrage local

## Prérequis

- Node.js 22 recommandé ;
- npm ;
- Docker avec Docker Compose ;
- MySQL local fourni par `docker-compose.yml`.

## Première installation

```sh
cp .env.example .env
npm run setup
npm run dev
```

`setup` installe les dépendances, démarre MySQL, applique le schéma initial puis exécute les seeds.

Adresses par défaut :

- frontend : `http://localhost:5173` ;
- API : `http://localhost:3000` ;
- WebSocket PvP : `ws://localhost:3000/ws/pvp`.

## Installation manuelle

```sh
npm install
npm install --prefix backend
npm install --prefix frontend
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

## Base de données

Le schéma est initial uniquement : `backend/schema.sql` doit être appliqué sur une base vide avec `npm run db:migrate`. Il n'existe pas de système de migrations incrémentales.

Pour repartir de zéro :

```sh
npm run db:down
docker volume rm kagelegacy_mysql_data
npm run db:up
npm run db:migrate
npm run db:seed
```

Le nom exact du volume Docker peut varier selon le nom du projet Compose. Vérifier avec `docker volume ls` avant toute suppression.

## Commandes utiles

```sh
npm run dev
npm run lint
npm run test:unit
npm run test:combat-engine
npm run test:combat-balance
npm run test:type-advantage
npm run audit:card-balance --prefix backend
npm run test:held-effects --prefix backend
```

## Tests E2E

Les tests E2E exigent une base dédiée et les garde-fous décrits dans `backend/scripts/e2ePreflight.js`.

```sh
npm run e2e:prepare
npm run test:e2e
```

`e2e:prepare` vérifie d'abord l'environnement, applique le schéma, seed les cartes/talents et prépare les données TCG dédiées. Ne pas exécuter cette commande contre une base de production.

## Développement séparé

```sh
npm run dev:api
npm run dev:web
```

En développement, Vite proxifie `/api` vers l'API, mais pas `/ws`. Pour le PvP local, `VITE_API_URL` doit pointer vers l'origine de l'API afin que le client construise aussi l'URL WebSocket correcte.

## Secrets

Ne jamais committer de valeur réelle. Copier les fichiers `.env.example` et `.env.prod.example` puis conserver les fichiers locaux ignorés. Voir [Exploitation](OPERATIONS.md).
