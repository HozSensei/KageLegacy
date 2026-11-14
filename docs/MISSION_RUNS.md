# Parcours de mission (Mission Runs)

Boucle session riche : une mission n’est plus un combat unique, mais un **parcours** type roguelike léger.

## Flux joueur

```
1. Missions → choisir une mission (Rang D→A)
2. POST /api/missions/:id/start → crée un mission_run
3. Écran parcours (liste de nœuds)
4. « Entrer dans l’étape »
   ├─ Combat → arène existante (combatEngine)
   │    Victoire d’étape → PV persistants, retour parcours
   │    Mort / abandon combat → échec du run
   └─ Événement → choix (repos / cache / marchand / carrefour)
5. Dernier combat (boss sur rangs B+) vaincu → récompenses de fin de run
6. VictoryRewards (XP, Ryos, carte, bonus ×run)
```

**Duels rapides** (hors parcours) restent des combats one-shot avec loot immédiat.

## Nœuds MVP

| Type | Nom FR | Effet |
|------|--------|--------|
| `combat` | Embuscade / Boss | Fight via `combatEngineService` |
| `rest` | Sanctuaire de Mousse | +30 % PV max |
| `cache` | Cache d’Éclaireur | +12 % PV + 2 ferraille |
| `merchant` | Colporteur d’Ombre | Bandage / tonique contre ferraille |
| `crossroads` | Carrefour du Voile | Soin **ou** ferraille |

## État persisté (`mission_runs`)

- `nodes_json` — parcours généré (combats issus de `encounters_json` + événements intercalés)
- `player_run_state_json` — `{ hp, maxHp, scrap, combatsWon }`
- `current_combat_id` — combat lié (récompenses différées via `combat_sessions.mission_run_id`)
- `rewards_json` — résumé fin de run (`grantRunRewards`, multiplicateur `runBonusMult`)

## API

| Méthode | Route | Rôle |
|---------|-------|------|
| POST | `/api/missions/:id/start` | Démarre un run |
| GET | `/api/missions/runs/active` | Run en cours |
| GET | `/api/missions/runs/:runId` | Détail |
| POST | `/api/missions/runs/:runId/enter` | Entre dans le nœud disponible |
| POST | `/api/missions/runs/:runId/resolve-event` | Résout un événement `{ choiceId }` |
| POST | `/api/missions/runs/:runId/abandon` | Abandonne le parcours |

## Frontend

- `MissionsCombatView` — lancement / reprise
- `MissionRunView` — carte linéaire des nœuds + événements
- `CombatView` / `VictoryRewards` — étape franchie (loot différé) ou loot de fin de run

## Règles design (alignées PROJECT_VISION / COMBAT_SYSTEM)

- PV **ne régénèrent pas** entre combats (sauf événements)
- Mort = échec de mission
- Récompenses de fin de run **meilleures** qu’un single fight (`runBonusMult` × bonus combats)
