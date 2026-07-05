# 🥷 Profils ninja — Spécialisation & potentiel

**Statut :** direction design validée en discussion — génération améliorée, affichage à enrichir.

---

## 🎯 Problème actuel

La génération (`generateBaseStats`) distribue les points **au hasard** sur les 6 stats. Résultat :
- Tous les Genin ont le même « budget » total (~36–48 pts)
- Les clans ajoutent +0 à +3 plats — peu lisible
- Pas de notion de **prometteur** vs **ordinaire**
- Les bots ont déjà des silhouettes (tai / nin / support) ; pas les ninjas joueurs

Le manager ne peut pas vraiment choisir « mon spécialiste genjutsu » vs « mon tank taijutsu ».

---

## 🧬 Trois axes d'identité (complémentaires)

| Axe | Rôle | Exemple |
| :--- | :--- | :--- |
| **Clan** | ADN fixe, bonus plats | Uchiwa → feu/illusion ; Nara → QI |
| **Voie (art principal)** | Spécialisation de combat | Genjutsu, Taijutsu, Ninjutsu, Médecine |
| **Potentiel** | Talent brut + vitesse de progression | Ordinaire / Prometteur / Prodige |

Le **trait de caractère** reste le comportement en match (Égoïste, Fainéant…), pas la spécialisation stats.

---

## 📐 Voies (art principal)

Chaque ninja naît avec une **voie** qui concentre ~60–70 % des points bonus :

| Voie | Stats poussées | Stats reléguées |
| :--- | :--- | :--- |
| **Taijutsu** | taijutsu, vitesse | genjutsu, médecine |
| **Ninjutsu** | ninjutsu, intelligence | médecine |
| **Genjutsu** | genjutsu, intelligence | taijutsu |
| **Médecine** | médecine, intelligence | taijutsu |

Le clan **biaise** le tirage de la voie (ex. Yamanaka → 50 % Genjutsu, Uchiwa → Ninjutsu/Genjutsu).

---

## ⭐ Potentiel (talent)

| Niveau | Fréquence cible | Budget Genin | Entraînement (futur) |
| :--- | :--- | :--- | :--- |
| **Ordinaire** | ~55 % | +6 pts sur la voie | ×1.0 |
| **Prometteur** | ~35 % | +9 pts | ×1.1 |
| **Prodige** | ~10 % | +12 pts | ×1.2 |

À la création, un **Prodige Taijutsu** peut arriver à 9–10 taijutsu avec 3–4 ailleurs ; un **Ordinaire** est plus plat (6–7 partout).

**Noblesse clan** (`is_noble`) : +10 % de chance Prometteur/Prodige.

---

## 👁️ Ce que voit le joueur

Labels dérivés (pas besoin de deviner les chiffres) :

| Donnée | Affichage FR |
| :--- | :--- |
| Voie | « Spécialiste Genjutsu » |
| Potentiel | « Profil prometteur » / « Talent ordinaire » / « Prodige » |
| Élément | « Affinité Katon » (déjà en BDD) |
| Clan | « Clan Nara » (déjà) |

**Rapport d'espionnage (H36)** : peut révéler le potentiel adverse de façon floue (« adversaire : spécialiste ninjutsu, niveau estimé élevé »).

---

## ⚖️ Impact gameplay

- **Compo** : un genjutsu + un taijutsu + un support médecine = identité d'escouade
- **Entraînement** : focus Sensei synergie avec la voie du ninja prometteur
- **Marché** : parchemin rupture sur le spécialiste genjutsu, pas sur le tank
- **Examens** : un prodige atteint les plafonds Genin plus vite → pression Ryos plus tôt (coût examen dynamique)
- **Vol d'Oiseau** : partir un prodige à 20 = grosse prime ; garder un ordinaire = moins de regret économique mais moins de puissance

---

## 🛠️ Implémentation

| Étape | Statut |
| :--- | :--- |
| Génération biaisée voie + potentiel | ✅ `ninjaGenerator.js` |
| Inférence profil (`describeNinjaProfile`) | ✅ `ninjaProfile.js` |
| Payload escouade (`profile` par ninja) | ✅ `sensei.js` |
| Colonnes BDD `primary_art`, `potential` | Backlog — inférence runtime suffit en V1 |
| UI cartes ninja (voie + potentiel) | Backlog |
| Multiplicateur entraînement par potentiel | Backlog |

---

## 💤 Hors scope (pour l'instant)

- Spécialisations M9 postergées (postures Tai/Gen/Nin) — la **voie** suffit en V1
- Respec / changement de voie — non
- Stats visibles exactes chez l'adversaire — non (espionnage flou seulement)
