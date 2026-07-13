# Combat par plis — spec v1

## Deck

- **9 plis** par match (deck mélangé au début), pour 3 ninjas actifs.
- Par ninja actif :
  - **1 carte technique inventaire** (`technique_slots_json` → `user_tactic_cards`, bonus %, effets, charges)
  - **2 cartes stat / domaine** (`techniques_json` → primaire + secondaire : taijutsu, ninjutsu, genjutsu, médecine)
- Si le deck est incomplet (technique non assignée ou domaines non enregistrés), des **cartes relais** comblent les emplacements manquants — le match joue jusqu'à **9 plis**.
- **Reconduction** : à chaque nouvelle journée de ligue (cycle N+1), le deck est recopié depuis le cycle précédent — domaines des ninjas encore actifs ; carte inventaire uniquement si elle a encore des **charges** (> 0).
- **Objets match** : retirés du combat et du magasin (bureau + cycle conservés).

## Résolution

- Comparaison carte vs carte (domaine vs domaine).
- Bonus type +20 % (Tai > Gen > Nin > Tai).
- PV max = note globale × 10.
- Victoire : PV totaux → plis gagnés si égalité.
- Cartes relais si propriétaire K.O. **ou** emplacement non configuré.
- Chakra / interception Sensei : supprimés v1.

## Fichiers clés

- `backend/src/services/combat/pli/pliCombatEngine.js`
- `backend/src/services/operationDeckService.js`
- `backend/migrations/050_pli_deck_combat.sql`

## Tests CI

- `npm run test:pli-combat --prefix backend`
- `npm run combat:pli-deck --prefix backend`
- `npm run combat:benchmark --prefix backend`
