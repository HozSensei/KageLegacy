# Tests et équilibrage

## Principes

Les tests visent des moteurs sans DB lorsque possible. Les scripts de catalogue et de combat sont déterministes ou utilisent des seeds contrôlées.

Ne pas modifier des seuils de test pour masquer un résultat. Un seuil doit changer seulement avec une décision de design documentée.

## Tests ciblés

Depuis la racine :

```sh
npm run test:unit
npm run test:combat-engine
npm run test:combat-balance
npm run test:combat-balance:report
npm run sim:real-mission-balance -- --deck backend/scripts/data/samplePlayerDeck.taijutsu.json
npm run test:type-advantage
```

Depuis le backend :

```sh
npm run test:card-system
npm run test:card-combos
npm run test:held-effects
npm run test:boss-phases
npm run test:starter-loadout
npm run test:boosters
npm run test:shop
npm run test:shop-stripe
npm run test:economy
npm run test:mission-run
npm run test:battle-pass
npm run test:achievements
npm run test:talent-tree
npm run test:factions-leaderboard
```

## Audit cartes

```sh
npm run audit:card-balance --prefix backend
npm run audit:card-balance --prefix backend -- --summary
```

L'audit contrôle notamment :

- les 250 cartes du seed actuel ;
- la voie de chaque type ;
- `common` pour objets, invocations et héritages ;
- l'absence de dégâts offensifs en Médecine ;
- la présence d'un `heldEffect` sur les héritages ;
- les budgets passifs aux niveaux 0, 1 et 2 ;
- les rôles actifs agrégés par voie.

C'est un outil de diagnostic, pas une preuve d'équilibrage du gameplay.

## Simulation d'équilibrage

`backend/src/services/deckCombat/combatBalanceSim.js` rejoue une boucle de combat sans DB. `backend/src/config/combatBalanceConfig.js` définit profils, rencontres, politique et seuils.

Le profil standard utilise huit rencontres D à A, 24 combats par cellule en mode test, trois profils practice et un profil starter séparé. La politique greedy choisit la carte payable au score le plus élevé.

Le même harness couvre aussi la **clearance de mission** (`aggregateMissionRuns` / mode rapport) : parcours aléatoire avec PV persistants, nœuds « ? » (soin, colporteur / argent de contrebande, butin, rien, embuscade) et seuils `MISSION_CLEARANCE_THRESHOLDS` (mode normal). Le mode difficile opt-in est mesuré en rapport seulement.

### Decks joueurs réels (export admin + sim missions)

1. **Admin UI** : onglet **Simulation / équilibrage** — choisir joueur, deck (actif par défaut), voie (auto depuis dominante du deck ou override), force, rangs ; lancer ; **Copier le résultat (chat IA)**.

2. **Export JSON** : panneau Admin → joueur → « Exporter le deck actif (JSON) », ou `GET /api/admin/players/:id/active-deck-export`. Format `kage-deck-export` v1.

3. **API** : `GET /api/admin/players/:id/decks`, `GET /api/admin/balance/profiles`, `POST /api/admin/balance/mission-sim`.

4. **CLI** (sans DB, catalogue seed) :

```sh
npm run sim:real-mission-balance --prefix backend -- --deck ./mon-deck.json
npm run sim:real-mission-balance --prefix backend -- --deck ./mon-deck.json --branch ninjutsu --profile moyen --rank D,C --report
```

Profils : voie × force (`realMissionBalanceProfiles.js`). Fixture : `backend/scripts/data/samplePlayerDeck.taijutsu.json`.

Pistes design documentées (non live) : +5 cartes max deck par rang gagné ; +PV à chaque montée de niveau.

Limites :

- le bot n'est pas un joueur humain ;
- les boss ne font pas partie du filet combat isolé (ils apparaissent dans les runs B+) ;
- la simulation n'évalue pas automatiquement la totalité des interactions de talents ;
- un résultat cible dépassé signale un écart mais ne donne pas seul la cause ;
- la sim combat isolé reste en chakra 3 / main non persistante (référence relative), distincte du live mission.

## Base dédiée (anciennement E2E)

```sh
npm run e2e:prepare
```

Prépare une base `*_e2e` pour certains tests backend. Le preflight empêche une exécution accidentelle hors garde-fous. Voir [Démarrage local](QUICK_START.md). La suite Cypress a été retirée : trop de churn gameplay pour la justifier.

## Validation recommandée après un changement

### Carte ou effet

1. tests système cartes ;
2. tests combos/effets tenus ;
3. tests moteur combat ;
4. simulation d'équilibrage ;
5. lint backend et frontend.

### Schéma ou seed

1. reconstruire une base vide ;
2. appliquer le schéma ;
3. exécuter les seeds ;
4. lancer les tests de catalogue et progression ;
5. vérifier que les anciennes données ont été remplacées explicitement.
