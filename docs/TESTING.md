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
npm run test:pvp-matchmaking
npm run test:factions-leaderboard
```

Le moteur PvP partagé dispose aussi de :

```sh
node --test shared/pvp/duelEngine.test.js
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

Limites :

- le bot n'est pas un joueur humain ;
- les boss ne font pas partie du filet combat isolé (ils apparaissent dans les runs B+) ;
- la simulation n'évalue pas automatiquement la totalité des interactions de talents ;
- un résultat cible dépassé signale un écart mais ne donne pas seul la cause ;
- la sim combat isolé reste en chakra 3 / main non persistante (référence relative), distincte du live mission.

## E2E

```sh
npm run e2e:prepare
npm run test:e2e
```

Les E2E exigent une base dédiée. Le preflight empêche une exécution accidentelle hors garde-fous. Voir [Démarrage local](QUICK_START.md).

## Validation recommandée après un changement

### Carte ou effet

1. tests système cartes ;
2. tests combos/effets tenus ;
3. tests moteur combat ;
4. simulation d'équilibrage ;
5. lint backend et frontend.

### PvP

1. tests du moteur partagé ;
2. tests matchmaking ;
3. vérification du transport WebSocket ;
4. test E2E à deux clients si l'infrastructure le permet.

### Schéma ou seed

1. reconstruire une base vide ;
2. appliquer le schéma ;
3. exécuter les seeds ;
4. lancer les tests de catalogue et progression ;
5. vérifier que les anciennes données ont été remplacées explicitement.
