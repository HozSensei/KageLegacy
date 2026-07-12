# Missions idle — rangs D/C/B/A et probabilités

**Statut :** implémenté (migration 049, PR #100).

---

## Intention

1. **Remplacer les seuils de stats binaires** par des probabilités basées sur la **note globale** du ninja (même calcul que l'examen Chunin : somme des 6 stats / 6, arrondi).
2. **Permettre toute mission dès le cycle 1** — avec un faible % de réussite si sous-qualifié — au lieu d'attendre ~15 cycles d'entraînement banc.
3. **Compléter l'entraînement** avec des **gains de stat à la réussite**, bonus pour les remplaçants au banc.
4. **Libellés uniformes** : « Mission — rang D/C/B/A » (pas de noms fantaisistes).

---

## Règles générales

| Règle | Détail |
| :--- | :--- |
| **Qui** | Ninjas au **banc** uniquement (`squad_position IS NULL`) |
| **Combien** | **1 mission par rang par cycle** (max 4 : D, C, B, A) |
| **Fenêtre** | Assignation H0–H70 ; résolution **H72** |
| **Coût** | Gratuit (`send_cost = 0`) |
| **Collecte** | Manuelle après résolution |

Garde-fous inchangés : pas en mission si examen Chunin / Vol d'Oiseau, objet cycle équipé, en vente P2P.

---

## Les 4 rangs

| Rang | Note cible (50 % réussite) | Ryos (succès) | Blessure base (échec) | Mort base (échec) | Gain stat (succès) | Bonus banc |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **D** | 4 | 300–500 | 0 % | 0 % | +0,25 | ×1,5 |
| **C** | 6 | 600–800 | 25 % légère | 0 % | +0,5 | ×1,5 |
| **B** | 8 | 1 000 | 40 % grave | 5 % | +0,75 | ×1,25 |
| **A** | 10 | 1 500–2 000 | 50 % grave | 10 % | +1,0 | ×1,0 |

Alignement examen Chunin : note globale **≥ 8** = rang B à 50 % de réussite.

---

## Formules de probabilité

```text
delta = noteNinja − noteCible

réussite  = clamp(50 + delta × 12,  5, 95)   // %
blessure  = clamp(baseBlessure − delta × 8,  0, 80)   // si échec
mort      = clamp(baseMort      − delta × 3,  0, 25)   // si échec
```

### Résolution H72

1. **Jet de réussite** (`rollPercent() ≤ successChance`).
2. **Si succès** : Ryos + loot + gain de stat (stat non plafonnée, aléatoire).
3. **Si échec** : 0 Ryos, pas de loot ; tirage mort puis blessure selon les % affichés.
4. **Mort** : ninja supprimé, mission `failed`. Sinon mission `completed` (même à 0 Ryos).

Les blessures ne s'appliquent **pas** en cas de succès.

---

## Gains de stat (complément entraînement)

À chaque **réussite**, une stat non plafonnée reçoit un gain fractionnel :

```text
gain = arrondi(statGainOnSuccess × bonusBanc, 2 décimales)
```

| Profil | Intérêt |
| :--- | :--- |
| **Remplaçant banc** | Bonus ×1,5 (D/C) ou ×1,25 (B) — compense l'entraînement global seul (coef 0,2) |
| **Titulaire** (rare en mission) | Pas de bonus banc |

Exemple : 3 missions D réussies par un Genin banc ≈ **+1,1 stat** cumulé — accélérateur en parallèle de l'entraînement.

Le parchemin légendaire (loot rang B/A) reste un bonus **en plus** du gain de mission.

---

## Loot (inchangé par rang, mapping interne)

| Rang | Table loot |
| :--- | :--- |
| D | Routine (pansement 10 %, carte 4 %) |
| C | Infiltration (kits, fumigène, bonus INT+VIT) |
| B, A | Cyclone (double kit, prodige ~3 %, parchemin) |

Loot tiré **uniquement sur succès**.

---

## UI

- Libellé : `Mission — rang D` (FR) / `Mission — rank D` (EN).
- Tableau : Ryos, gain stat, % réussite / blessure / mort selon le ninja sélectionné.
- Rang **recommandé** : réussite ≥ 50 %.
- Tous les rangs restent **envoyables** (avertissement si < 50 %).

---

## API

`GET /api/missions` — par ninja banc :

```json
{
  "overallRating": 5,
  "oddsByTier": {
    "D": { "successChance": 62, "injuryChance": 0, "deathChance": 0, "targetRating": 4 },
    "C": { "successChance": 38, "injuryChance": 17, "deathChance": 0, "targetRating": 6 }
  },
  "recommendedTiers": ["D"]
}
```

---

## Migration legacy

| Ancien `mission_tier` | Nouveau |
| :--- | :--- |
| `routine` | `D` |
| `infiltration` | `C` |
| `cyclone` | `B` |
| — | `A` (nouveau) |

Alias acceptés à l'assignation : `routine` → `D`, etc.

---

## Fichiers

| Fichier | Rôle |
| :--- | :--- |
| `backend/src/services/missionRules.js` | Rangs, formules, `computeMissionOdds` |
| `backend/src/services/missionLootService.js` | Jet réussite, blessures, gains stat |
| `backend/src/services/missionService.js` | API, mapping ninjas |
| `backend/migrations/049_mission_rank_system.sql` | ENUM D/C/B/A |
| `frontend/src/components/bureau/IdleMissionPanel.vue` | UI probabilités |
| `specs/training-system.md` | Entraînement (complément) |

---

## Tests

```bash
node backend/scripts/testMissionRules.js
node backend/scripts/testMissionLoot.js
npm run playtest:missions --prefix backend   # H0→H72 + notifications
npm run test:e2e                             # Cypress missions + assign + collect
```
