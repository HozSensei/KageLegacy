# 🧰 Catalogue objets utilitaires (pivot M4)

**Statut :** proposition de design — à valider avant refonte migrations / moteur.

**Décision :** abandonner armes et armures « +stats offensives permanentes » au profit d’**outils de cycle** : fumigènes, parchemins, leurres, tempo, boosts situationnels légers.

---

## 🎯 Intention joueur

| Ce qu’on veut | Ce qu’on évite |
| :--- | :--- |
| Préparer un **plan de match** (ouverture rapide, tenir le centre, brouiller le ciblage) | « J’achète +2 Ninjutsu et j’oublie la tactique » |
| Effets **lisibles** en chronique M6 (« X déploie un fumigène », « leurre activé ») | Bonus plats invisibles |
| Impact modeste seul (~**3–8 pts** win rate avec bon usage) | Power creep ou obligation d’acheter pour être compétitif |
| Synergie **consigne + objet** | Objet qui compense une mauvaise compo |

---

## 📦 Structure des emplacements (inchangée)

- **1 slot outil** (`gear`) — objet réutilisable, **2–3 activations / match**
- **1 slot consommable** — **1 usage / match**, détruit après

Les catégories BDD `weapon` / `armor` deviennent conceptuellement **`tool`** (migration future : étendre l’ENUM ou mapper `tool` → slot `gear`).

---

## 🧪 Plafonds proposés (vs armes actuelles)

| Levier | Plafond actuel | Cible utilitaire |
| :--- | :--- | :--- |
| Bonus attaque situationnel | +2 | **+1** pur, ou **+1 atk +1 def** combiné |
| Bonus défense situationnel | +2 | **+1** à **+2** |
| Vitesse tour 1 (initiative) | +2 | **+2** fumigène standard ; **+3** premium rare |
| Vitesse tours 2–4 (tempo) | — | **+1** par tour, max **+3** cumulé |
| PV match (outil) | +20 | **+8 à +12** (secondaire) |
| Leurre / diversion | — | **1 activation / match**, −15 à −25 pts % ciblage Tank |

Règle : **un objet = une idée tactique**, pas un mini-build.

---

## 📜 Consommables (usage unique)

| Slug | Nom FR | Effet | Consigne / condition | Prix indicatif |
| :--- | :--- | :--- | :--- | :--- |
| `parchemin-fumee` | Parchemin de fumée | **+2 Vitesse** au calcul d’initiative **tour 1** | Inefficace en **Tank** | 450 |
| `fumigene-dense` | Fumigène dense | **+1 Vitesse** tours **1 à 3** (tempo d’ouverture) | Aucune ; léger malus narratif possible | 650 |
| `parchemin-eclair` | Parchemin d’éclair | **+3 Vitesse** tour 1 | **Offensive** ou **Normal** uniquement | 700 |
| `parchemin-garde-legere` | Parchemin de garde | **+1 défense** (toutes techniques) sur **1** interception | **Protect** ou **Tank** | 500 |
| `parchemin-equilibre` | Parchemin d’équilibre | **+1 attaque ET +1 défense** sur **1** duel | **Normal** ; moins fort qu’un +2 atk pur | 600 |
| `parchemin-leurre` | Parchemin de leurre | **1×** : si ce ninja est ciblé, **35 %** de chance de rediriger vers un autre allié actif | Pas **Tank** ; inutile si seul debout | 550 |
| `herbes-apaisantes` | Herbes apaisantes | **+15 PV** si santé **< 20 %** | Auto (survie) | 500 |
| `cachet-chakra` | Cachet de chakra | **+12 Chakra** si réserve **< 15 %** | Auto (survie) | 550 |

**Notes design :**
- Fumée / éclair = **initiative** (déjà partiellement dans le moteur via `firstTourSpeedBonus`).
- Garde légère / équilibre = modificateurs `defense` / `attack` **à plafond +1** chacun, 1 use.
- Leurre = **nouveau trigger** `on_targeted` dans `equipment.js` + hook dans `pickDefender`.

---

## 🛠️ Outils réutilisables (slot gear)

| Slug | Nom FR | Effet | Activations | Prix |
| :--- | :--- | :--- | :--- | :--- |
| `kit-eclaireur` | Kit d’éclaireur | **+1 Vitesse** au calcul d’initiative, tours **1–3** | Passif sur la fenêtre | 950 |
| `miroir-diversion` | Miroir de diversion | **−20 %** chance d’être pris pour cible (hors rôle Tank) | **2×** / match quand ciblé | 900 |
| `sceau-tempo` | Sceau de tempo | **+1 Vitesse** tours **4–8** (reprendre l’initiative en milieu de match) | Passif fenêtre | 1 050 |
| `bandeau-tactique` | Bandeau tactique | **Protect** : +1 def ; **Offensive** : +1 atk (jamais les deux sur la même action) | **3×** / match | 1 100 |
| `fil-substitution` | Fil de substitution | **1×** / match : annule le ciblage (l’attaquant retarde ou frappe un autre) | **1×** | 1 200 |
| `gourde-terrain` | Gourde de terrain | **Tank** : +10 PV au début ; **Normal** : +8 Chakra au début | **1×** | 850 |
| `parchemin-renfort` | Parchemin de renfort (fixe) | **+1 défense** genjutsu quand l’équipe est en **désavantage d’initiative** (roll perdant) | **2×** / match | 950 |
| `cloche-alerte` | Cloche d’alerte | Si allié tombe **< 25 % PV**, porteur gagne **+1 def** au tour suivant | **2×** / match | 900 |

**Familles tactiques :**
1. **Ouverture** — fumée, éclair, kit éclaireur  
2. **Tempo** — sceau tempo, possession milieu de match  
3. **Leurre / ciblage** — miroir, fil, parchemin leurre  
4. **Posture** — bandeau tactique, garde, équilibre  
5. **Sécurité** — herbes, cachet, gourde  

---

## 🔄 Mapping depuis le catalogue actuel (armes/armures)

| Ancien | Sort | Remplacement suggéré |
| :--- | :--- | :--- |
| Lame de Chakra | ❌ Retirer | Bandeau tactique ou Parchemin d’équilibre |
| Kunai renforcée | ❌ Retirer | Parchemin d’éclair (burst initiative) |
| Masque d’illusion | 🔄 Recyclé | Miroir de diversion (leurre mental) |
| Gilet mailles | 🔄 Allégé | Gourde de terrain (+10 PV Tank) |
| Gants pare-feu | 🔄 Niche | Parchemin de renfort (réaction, pas anti-élément plat) |
| Bandeau de focus | ✅ Proche | Bandeau tactique (version Protect) |
| Pilule / Herbes | ✅ Garder | Cachet chakra / Herbes apaisantes |
| Parchemin fumée | ✅ Garder | Inchangé |

---

## ⚙️ Effets moteur à ajouter (priorité)

| Kind / trigger | Où | Complexité |
| :--- | :--- | :--- |
| `speed_window` | `{ fromTour, toTour, bonus }` sur gear ou consumable | Faible — généraliser `getFirstTourSpeedBonus` |
| `on_targeted` | leurre, miroir, fil | Moyenne — `pickDefender` + log M6 |
| `initiative_lost` | renfort défensif | Faible — flag sur le tour si roll défavorable |
| `combined_atk_def` | parchemin équilibre | Faible — deux modificateurs liés, 1 use |
| `category: tool` | migration ENUM | Faible — cosmétique + UI |

---

## 📖 Chronique M6 (phrases à prévoir)

- `item_smoke_deployed` — « {ninja} déploie un voile de fumée : l’escouade gagne l’avantage d’initiative. »
- `item_decoy_triggered` — « Leurre ! L’assaillant hésite — la pression se reporte sur {ally}. »
- `item_tempo_midmatch` — « Le sceau de tempo accélère le rythme en milieu d’affrontement. »
- `item_guard_scroll` — « {ninja} déroule un parchemin de garde et absorbe le choc. »
- `item_wasted` — débriefing si 0 proc (mauvaise consigne)

---

## 🎲 Cible d’équilibrage (à simuler)

Scénario démo vs bot (+40 % stats), même compo / consignes :

| Scénario | Δ win rate attendu |
| :--- | :--- |
| Mauvais objet ou mauvaise consigne | **0 à +2 pts** |
| Objet cohérent (ex. fumée + compo rapide) | **+4 à +8 pts** |
| Double utilitaire optimisé + tactique | **+8 à +12 pts** plafond |

Le couple **consigne ±30 pts** doit rester dominant.

---

## ✅ Prochaines étapes

1. Valider / ajuster la liste (noms, 8–10 objets pour le marché 3 slots)
2. Migration `009_utility_items_catalog.sql` — remplacer seeds + soft-delete anciens slugs
3. Étendre `equipment.js` (`speed_window`, `on_targeted`)
4. UI marché : catégorie « Outil » + icônes par famille
5. `combat:benchmark` + entrée dans `milestone-9.md`
6. Phrases M6

---

## 💡 Idées en réserve (backlog)

- **Parchemin de silence** — annule 1 genjutsu adverse (contre-meta)
- **Poudre révélatrice** — réduit effet leurre ennemi 1 tour
- **Balise de repli** — bonus def si possession < 40 % à mi-match
- **Sifflet de coordination** — +1 initiative si 2+ alliés Offensive
