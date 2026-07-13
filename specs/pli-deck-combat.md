# Combat par plis — spec v1

## Deck

- **9 cartes techniques** : par ninja actif, 1× technique principale + 2× secondaire (auto ou choix dans `operation_decks.techniques_json`).
- **5 éléments de deck** : cartes tactiques (`user_tactic_cards`) choisies au niveau escouade.
- **Total** : 14 plis par match (deck mélangé au début).
- **Objets match** : retirés du combat et du magasin (bureau + cycle conservés).

## Résolution

- Comparaison carte vs carte (domaine vs domaine).
- Bonus type +20 % (Tai > Gen > Nin > Tai).
- PV max = note globale × 10.
- Victoire : PV totaux → plis gagnés si égalité.
- Cartes relais (option 3) si propriétaire K.O.
- Chakra / interception Sensei : supprimés v1.

## Fichiers clés

- `backend/src/services/combat/pli/pliCombatEngine.js`
- `backend/src/services/operationDeckService.js`
- `backend/migrations/050_pli_deck_combat.sql`

## Tests CI

- `npm run test:pli-combat --prefix backend`
- `npm run combat:pli-deck --prefix backend`
- `npm run combat:benchmark --prefix backend`
