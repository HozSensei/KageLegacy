# Dossier d'opération — Phase 2

**Statut :** implémenté (posture + espionnage enrichi + conseils).

---

## Objectif

Remplacer la lecture opaque du « cercle de composition » par une **préparation lisible** :

1. **Posture d'opération** choisie par le joueur (équilibrée / offensive / tank / protect)
2. **Espionnage H36+** avec profils adverses **flous** (voie + potentiel estimé), sans slots ni stats exactes
3. **Synthèse** de l'escouade propre (consignes, cartes, vitesse)
4. **Conseils** contextuels avant verrouillage H71

---

## API

| Route | Description |
|-------|-------------|
| `GET /api/operation/dossier` | Payload complet du dossier |
| `PATCH /api/operation/dossier` | `{ operationPosture }` — avant H71 |

Table `operation_dossiers` (migration 040) : une posture par `(user, pool, cycle)`.

---

## Espionnage enrichi

`scouting.js` dérive les profils via `describeNinjaProfile` :

- Labels voie (« Spécialiste Genjutsu », etc.)
- Potentiel flou : modéré / élevé / très élevé
- Agrégats : répartition des voies, consignes repérées, vitesse, élément dominant
- **Pas de noms** ni positions de slots adverses dans le rapport public

---

## Bots

`alignPoolBotsToPoolAverage(poolId)` : calibre les bots sur la **moyenne des humains** de la ligue (±25 % clamp), déclenché à la provision starter et après changement de composition.

---

## UI

- `OperationDossierPanel.vue` intégré dans **Escouade**
- Profils espionnage aussi visibles en **Ligue** (H36+)
