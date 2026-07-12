# Entraînement — préparation, global, capital de stat

**Statut :** implémenté (migration 048, PR #98).

---

## Intention

1. **Progression plus rapide et lisible** — types groupés (plus de focus mono-stat sur 20 cycles).
2. **Économie Ryos équilibrée** — préparation payante (actifs), entraînement global **gratuit** (toute l'équipe).
3. **Talent = vitesse** — prodiges montent plus vite (×1,25) mais partent plus tôt (Vol d'Oiseau / stagnation).
4. **Part de chance** — capital de stat avec variance RNG, sans casser la cible moyenne.

---

## Deux leviers

| | **Préparation** | **Entraînement global** |
| :--- | :--- | :--- |
| **Qui** | 3 ninjas actifs (`squad_position` 1–3) | Toute l'équipe (6 ninjas) |
| **Coef par ninja** | **0,4** | **0,2** |
| **Coût Ryos** | Payant (formule existante `computeTrainingCost`) | **Gratuit** |
| **Choix** | `ninjas.preparation_type` par titulaire | `sensei.global_training_type` (1 pour tous) |
| **RNG** | ×0,75 – ×1,25 | ×0,85 – ×1,15 |
| **Focus stat** | 1 stat du groupe ×1,5 (aléatoire parmi non plafonnées) | Répartition fixe par poids |

Les actifs **cumulent** préparation + global si les types sont actifs (alignement recommandé pour max gain).

---

## Types d'entraînement (6)

| Type | Stats touchées | Poids |
| :--- | :--- | :--- |
| **Chakra** | intelligence, ninjutsu, genjutsu | 35 % / 35 % / 30 % |
| **Physique** | taijutsu, vitesse | 55 % / 45 % |
| **Medical** | medecine, intelligence | 55 % / 45 % |
| **Genjutsu** | genjutsu, intelligence | 55 % / 45 % |
| **Ninjutsu** | ninjutsu, intelligence | 55 % / 45 % |
| **Equilibre** | les 6 stats | 1/6 chacune |

---

## Formule — capital de stat

Pour chaque ninja et chaque session (prep ou global) :

```text
part = coef × RNG × mult_potentiel × coef_âge × mult_équipement_cycle
```

| Potentiel | Mult |
| :--- | :--- |
| Ordinaire | ×1,0 |
| Prometteur | ×1,1 |
| Prodige | ×1,25 |

> Le potentiel n'est pas stocké en BDD : il est **inféré** via `inferPotential()` (`ninjaProfile.js`) à partir des stats et du grade.

| Âge | Mult |
| :--- | :--- |
| 15 | ×1,5 |
| 16 | ×1,0 |
| 17 | ×0,7 |
| 18 | ×0,4 |

La `part` est répartie sur les stats du type (poids normalisés si certaines sont au plafond grade).

**Résidus** : `ninjas.stat_residuals` (JSON par stat) — les points entiers s'appliquent quand résidu ≥ 1.

---

## Rythme cible (ordinaire, prep + global alignés Chakra)

| Profil | Cycles → Chunin (indicatif) |
| :--- | :--- |
| Ordinaire | ~5 |
| Prometteur | ~3–4 |
| Prodige | ~2–3 |

---

## Facturation H72

Ordre dans `cycleJobs.js` :

1. Salaires (actifs)
2. Vol d'Oiseau
3. Stagnation
4. **Entraînement global** (gratuit, tous)
5. **Préparation** (facturée, actifs avec plan ; skip si Ryos insuffisants)
6. Intérêts dette

---

## Stagnation — cycle de grâce

1er cycle éligible sans inscription : **aucune pénalité** (`stagnant_cycles` passe à 1).  
À partir du 2ᵉ cycle : forme −1 palier, moral −3.

Inscription examen Chunin ou Vol d'Oiseau → `stagnant_cycles = 0`.

---

## Fichiers

| Fichier | Rôle |
| :--- | :--- |
| `backend/src/services/training.js` | Types, pot, RNG, application gains |
| `backend/src/services/trainingBilling.js` | Budget preview, facturation prep |
| `backend/migrations/048_training_system_revamp.sql` | Schéma |
| `frontend/src/components/bureau/TrainingPlansPanel.vue` | UI |
| `frontend/src/utils/trainingPreview.js` | Preview fourchette min/max |

---

## Migration depuis l'ancien système

| Ancien `training_focus` | Nouveau `preparation_type` |
| :--- | :--- |
| Taijutsu, Vitesse | Physique |
| Ninjutsu | Ninjutsu |
| Genjutsu | Genjutsu |
| Medecine | Medical |
| Intelligence | Chakra |

Seuls les **actifs** conservent une préparation après migration.
