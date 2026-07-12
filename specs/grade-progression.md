# 🎓 Progression des grades, plafonds & Ryos

**Statut :** règles validées en discussion — implémenté côté entraînement / H72 ; Vol d'Oiseau (M7) livré.

---

## 🎯 Intention

1. **Les Ryos pèsent sur le passage de grade** — frais d'examen indexés sur le niveau du candidat.
2. **Un Genin (puis un Chunin) ne progresse pas indéfiniment** — plafonds de stats par grade ; l'entraînement s'arrête au plafond.
3. **Ne pas faire évoluer coûte cher** — forme et moral se dégradent chaque cycle si le ninja est **prêt** à monter mais reste bloqué.

---

## 📊 Plafonds de stats par grade

| Grade | Stats combat (tai / nin / gen / med) | Vitesse / Intelligence |
| :--- | :--- | :--- |
| **Genin** | 12 | 10 |
| **Chunin** | 18 | 16 |
| **Jonin** | 20 | 20 |

- L'entraînement **n'ajoute plus de points** sur une stat déjà au plafond du grade.
- Pour dépasser le plafond : **passer l'examen** (Genin → Chunin) ou **Vol d'Oiseau** (Chunin → départ, M7).

---

## 🧠 Stat « intelligence »

Dans le jeu, c'est la colonne `intelligence` (affichée **Intelligence** dans l'UI — pas un QI abstrait).

- **Génération** : tirage à la création + bonus de clan (ex. Nara +4).
- **Entraînement** : progresse à H72 **uniquement** si le focus Sensei du cycle est `Intelligence` (comme les autres stats via leur focus). Sinon elle reste figée sauf effets futurs (objets cycle, etc.).
- **Plafonds** : Genin 10, Chunin 16, Jonin 20.

---

## 💰 Coût Ryos — Examen Chunin (H0–H36)

Frais d'inscription **dynamiques** (prélevés à l'inscription) :

$$\text{Coût} = 300 + \max(0, \text{combat} - 10) \times 40 + \max(0, \text{intelligence} - 8) \times 30$$

| Profil | Exemple | Coût |
| :--- | :--- | :--- |
| Minimum (10 / 8) | Débutant prêt | **300** Ryos |
| Solide (12 / 10) | Genin mûr | **440** Ryos |
| Plafond (12 / 10) | Avant examen | **440** Ryos |

*Vol d'Oiseau (M7) : **inscription gratuite** — aucun coût Ryos. La prime est versée à H72 (`3000 + Σstats × 150` Ryos, +10 réputation).*

| Profil | Exemple | Prime Ryos (indicative) |
| :--- | :--- | :--- |
| Minimum (16 / 14) | Chunin prêt | selon profil |
| Plafond (18 / 16) | Départ complet | **3000 + 80×150 = 15 000** |

---

## ⚠️ Stagnation (pénalité H72)

À chaque **H72**, avant l'entraînement du nouveau cycle :

### Cycle de grâce

Le **premier cycle** où un ninja remplit les conditions de stagnation **sans être inscrit** ne subit **aucune pénalité** (`stagnant_cycles` passe à 1). À partir du **deuxième cycle** consécutif dans cet état : pénalité forme + moral.

### Genin stagnant

Conditions **toutes** vraies :
- Grade `Genin`
- Prérequis examen atteints (combat ≥ 10, **intelligence** ≥ 8)
- **Pas** inscrit à l'examen ce cycle (`chunin_exam_requested = FALSE` à H72)

**Pénalité :**
- `weekly_forme` : descend d'un palier (Divin → Excellent → Passable → Lamentable)
- `moral` : **−3**

### Chunin stagnant

Conditions **toutes** vraies :
- Grade `Chunin`
- Prérequis Vol d'Oiseau atteints (combat ≥ 16, **intelligence** ≥ 14)
- **Pas** inscrit à la cérémonie ce cycle (`bird_flight_requested = FALSE` à H72)

**Pénalité :** identique (forme −1 palier, moral −3).

### Pas de pénalité si

- Encore en montée (stats sous les seuils)
- Inscrit à l'examen Chunin (même en attente de H36)
- Bot (`is_bot`)

---

## 🔄 Boucle joueur

```text
Genin s'entraîne → plafond 12 → doit payer l'examen Chunin
  → refuse / pas de Ryos → forme & moral chutent chaque cycle
  → paie + réussit H36 → Chunin, plafonds relevés

Chunin s'entraîne → plafond 18/16 → inscrire au Vol d'Oiseau (gratuit, combat ≥ 16, intelligence ≥ 14)
  → reste trop longtemps sans s'inscrire → stagnation
  → inscription H72 → départ Jonin, prime Ryos, relève Genin
```

---

## 🛠️ Fichiers moteur

| Fichier | Rôle |
| :--- | :--- |
| `gradeProgression.js` | Plafonds, coût examen, détection stagnation |
| `training.js` | Respect des plafonds à l'entraînement |
| `stagnation.js` | Application pénalités H72 |
| `chuninExam.js` / `squadTactics.js` | Coût dynamique à l'inscription |
| `cycleJobs.js` | Appel stagnation avant entraînement H72 |

---

## 📋 Backlog

- [x] Examen Jonin / inscription Vol d'Oiseau avec coût Ryos (M7) — `bird_flight_requested`, `POST /api/squad/bird-flight`
- [x] UI Bureau : alerte stagnation Genin + Chunin (`StagnationAlert`, `ChuninStagnationPanel`)
- [x] UI cartes ninja : voie, potentiel, lignée (`NinjaProfileBadges`)
- [x] Chronique / notification : « X s'impatiente — forme en baisse » (`kind: stagnation` à H72)
