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
- API : `http://localhost:3000`.

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

`backend/schema.sql` est le schéma initial et doit être appliqué sur une base vide avec `npm run db:migrate`. Il n'existe pas de système général de migrations incrémentales. Au redémarrage, le migrateur complète toutefois idempotemment les quelques colonnes de compatibilité attendues par les catalogues courants (`held_effect_json`, `stat_type = common` et rangs d'arbres de talents), afin qu'une base déjà marquée comme initialisée puisse continuer à recevoir les seeds.

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

## Base de test dédiée

Certains tests backend (personnage, talents, Battle Pass, Stripe) s’appuient sur `npm run e2e:prepare` : base dédiée `*_e2e`, schéma, seeds cartes/talents/Battle Pass. Les garde-fous sont dans `backend/scripts/e2ePreflight.js`. Ne pas exécuter cette commande contre une base de production. Il n’y a plus de suite Cypress : le gameplay évolue trop vite pour la maintenir.

## Développement séparé

```sh
npm run dev:api
npm run dev:web
```

En développement, Vite proxifie `/api` vers l'API.

## Secrets

Ne jamais committer de valeur réelle. Copier les fichiers `.env.example` et `.env.prod.example` puis conserver les fichiers locaux ignorés. Voir [Exploitation](OPERATIONS.md).
