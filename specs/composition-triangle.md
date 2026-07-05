# 🔺 Cercle des compositions (Assaut · Mur · Flux)

**Objectif :** aucune compo ne domine tout le meta. Chaque posture bat **une** autre (~**60 %** win, +20 pts vs 50/50) et perd contre une troisième.

---

## Les trois archétypes

| Composition | Consignes | Identité |
| :--- | :--- | :--- |
| **Assaut** | 2+ Offensive | Burst, pression directe |
| **Mur** | 2+ Tank | Absorption, ciblage tank |
| **Flux** | 2+ Protect | Genjutsu, soins, usure |

**Escouade équilibrée** (Off + Tank + Protect) : **hors du cercle** — ~50 % vs les comps pures (benchmark : Mur/Assaut/Flux vs Équilibre dans les deux sens).

---

## Cercle (aligné moteur)

```text
        ASSAUT
       ↗     ↘
   bat Mur   perd vs Flux
    MUR ←——→ FLUX
     bat Flux   bat Assaut
```

| Matchup | Qui gagne | Pourquoi |
| :--- | :--- | :--- |
| **Assaut > Mur** | Le burst perce les tanks | |
| **Mur > Flux** | Le mur use les soins / chip | |
| **Flux > Assaut** | Contrôle mental casse l'offensive | |

---

## Implémentation

- `compositionMeta.js` — détection, passifs, cercle
- `combatEngine.js` — dégâts, ciblage tank, biais genjutsu Flux
- Bonus matchup : ~**+8 %** atk / **−5 %** dégâts reçus (cible ~60 % win)

---

## Validation

```bash
npm run combat:benchmark
```

Section « Cercle des compositions » — chaque flèche du cercle doit afficher **✓** (~54–68 % win).
