# Démarrage rapide

Kage Legacy est un TCG shinobi dans le navigateur. Ce guide décrit les commandes présentes dans les scripts du dépôt; les systèmes d'escouade/cycles mentionnés dans d'anciens documents ne font pas partie du jeu actuel.

## Prérequis

- Node.js compatible avec les versions précisées dans les manifestes `package.json`.
- Docker et Docker Compose pour MySQL local.

## Installation et lancement

À la racine du dépôt :

```sh
cp .env.example .env
npm run setup
npm run dev
```

Le frontend est accessible à `http://localhost:5173`, l'API à `http://localhost:3000`. Consultez les scripts de `package.json` à la racine et dans `backend/` pour leur comportement exact.

## Commandes courantes

```sh
npm run lint
npm run db:up
npm run db:migrate
npm run db:seed
npm run test:combat-engine
npm run test:combat-balance
npm run test:e2e
```

`npm run db:migrate` installe le schéma initial complet et exige une base vide ; il ne met pas à niveau une base existante. En cas d'échec au milieu de l'installation, recréez la base avant de réessayer. `db:seed` initialise les données TCG (cartes, talents et Battle Pass).

### Tests E2E

Créer d'abord une base MySQL **vide et dédiée** dont le nom se termine par `_e2e`, et donner à l'utilisateur configuré les droits nécessaires. `e2e:prepare` refuse une base préexistante non marquée, un nom différent, la production ou l'absence de consentement explicite. Exemple pour un shell POSIX, avec `DB_HOST`, `DB_PORT`, `DB_USER` et `DB_PASSWORD` configurés pour cette base :

```sh
export DB_NAME=kage_legacy_e2e
export E2E_ALLOW_SEED=true
export ENABLE_SCHEDULER=false
npm run e2e:prepare
npm run test:e2e
```

Sous PowerShell, utiliser `$env:DB_NAME = 'kage_legacy_e2e'`, `$env:E2E_ALLOW_SEED = 'true'` et `$env:ENABLE_SCHEDULER = 'false'` à la place des `export`. Conserver ces variables pour lancer les serveurs et Cypress : ils doivent utiliser la même base. La préparation ajoute les cartes, talents, une saison de test et un compte `demo_sensei` / `demo`, uniquement pour cette base dédiée. Si la saison ou sa quête hebdomadaire expire, recréer une base E2E vide avant de relancer. Ne jamais utiliser ces identifiants en production.

## Repères dans le code

- Cartographie du dépôt et fichiers de configuration : [`../AGENTS.md`](../AGENTS.md).
- Backend : `backend/src/routes/` (API), `backend/src/services/` (métier), `backend/src/config/` (configuration).
- Frontend : `frontend/src/views/`, `frontend/src/components/`, `frontend/src/stores/`.
- Règles visibles en jeu : `frontend/src/content/rules.fr.md` et `rules.en.md`.

Pour les effets de cartes, statistiques des ninjas et coûts, vérifier les catalogues et implémentations utilisés par le backend : les anciennes valeurs de documentation peuvent être dépassées.
