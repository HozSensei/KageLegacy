# 🔺 Cercle des compositions (Assaut · Mur · Flux)

> **⚠️ Obsolète (juillet 2026)** — Le cercle a été retiré du moteur de combat.  
> Remplacé par les **consignes individuelles** (Offensive / Défensive / Protection) et les **cartes tactiques**.  
> Voir les règles joueur §4 et `specs/tactic-cards.md` (si présent) / migration 039.

Ce document est conservé comme **référence historique** pour les benchmarks `combat:benchmark`.

---

**Objectif (legacy) :** aucune compo ne domine tout le meta. Chaque posture bat **une** autre (~**60 %** win) et perd contre une troisième.

## Les trois archétypes (benchmark uniquement)

| Composition | Consignes | Identité |
| :--- | :--- | :--- |
| **Assaut** | 2+ Offensive | Burst, pression directe |
| **Mur** | 2+ Tank | Absorption, ciblage tank |
| **Flux** | 2+ Protect | Genjutsu, soins, usure |

**Escouade équilibrée** (Off + Tank + Protect) : hors du cercle historique.

## Implémentation actuelle

- `battleRoleMeta.js` — comportements par consigne (Tank provocation, Protect soins)
- `tacticCards/` — effets situationnels en match
- `cycleSimulator.js` — benchmarks legacy Assaut/Mur/Flux (sans bonus moteur)

~~`compositionMeta.js`~~ — supprimé.
