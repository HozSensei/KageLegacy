# 🧰 M4 — Objets utilitaires & économie des Ryos

**Statut :** direction validée — **implémenté** (migration 011, catalogue, hooks match, POST /inventory/use).

**Nom UI (juil. 2026) :** le catalogue serveur s'appelle **Magasin du village** — plus « Marché Noir ».

**Implémenté aujourd'hui :** 3 articles tirés au hasard / cycle (legacy M4).

**Cible PO (juil. 2026) :** **tout le catalogue visible**, stocks **limités**, **réassort complet tous les X cycles**, **promos chaque cycle** — voir § Magasin du village V2 ci-dessous.

**Décision clé :** les Ryos ne doivent pas reposer sur des bonus de stats en combat. Ils financent la **survie du club** ; le **magasin du village** vend des **utilitaires** qui modifient le comportement du simulateur ou la gestion hors-match — pas la puissance brute des ninjas.

---

## 🏛️ Où vont les Ryos (3 piliers)

| Pilier | Rôle | Priorité |
| :--- | :--- | :--- |
| **Infrastructure & survie** | Dispensaire, salaires, examens Chunin/Jonin | Gouffre principal — *obligatoire* pour continuer à jouer |
| **Optimisation du cycle** | Entraînement, objets cycle (poids d'entraînement, livre de stratégie) | Investissement sur l'avenir |
| **Match (filet tactique)** | 1 consommable par ninja max — secours, contre, rupture légère | Impact **ressenti** mais pas décisif seul (~5–10 % win rate ciblé) |

Si les objets de match sont faibles, **ce n'est pas un bug** tant que les Ryos servent avant tout à soigner, payer l'escouade et monter en grade.

---

## 📦 Simplification BDD & UI (vs M4 actuel)

### On supprime

- Catégories `weapon` et `armor`
- Slot `gear` permanent et toute la pile `modifiers` (attack/defense/pv/element_resist)
- Équilibrage « +2 Taijutsu si Offensive + ninjutsu » (usine à gaz pour ~0–2 % d'impact)

### On garde

| Élément | Détail |
| :--- | :--- |
| `item_definitions` | ENUM `category` → **`bureau`**, **`match`**, **`cycle`** |
| `user_items` + inventaire | Inchangé |
| `ninja_equipment` | **1 slot max** : `match` **ou** `cycle` (pas les deux sur le même ninja en V1) |
| Magasin | **V2 :** catalogue complet + stocks limités + promos (§ ci-dessous) · *V1 actuelle :* 3 offres aléatoires / cycle |
| `equipment.js` | Réduit à **handlers d'événements** match (pas de bonus stats permanents) |

### UI inventaire

- **Bureau** : bouton « Utiliser » sur objets `bureau` (pilule de forme, etc.)
- **Escouade** : 1 emplacement « Consommable de match » par ninja actif
- **Effectif** : emplacement « Investissement cycle » (ex. poids d'entraînement) sur remplaçants / ninjas non en mission

---

## 🎒 Catalogue Magasin du village (proposition V1 — ~9 objets)

### A. Consommables Bureau (`category: bureau`)

Usage depuis l'inventaire / Bureau. **Pas de slot combat.**

| Slug | Nom | Effet | Prix |
| :--- | :--- | :--- | :--- |
| `pilule-recuperation` | Pilule de récupération | Remonte la **Forme** d'un ninja d'**un palier** (ex. Lamentable → Passable). Moins cher que le Dispensaire, usage unique. | 400 |
| `livre-strategie` | Livre de stratégie | Prochain entraînement : **+3 Intelligence** pour le jet ; réduit le risque que le trait **Fainéant** annule la session. | 350 |
| `bandage-rapide` | Bandage rapide | Soigne **15 % des PV max** hors match (entre deux cycles, ninja non KO). | 300 |

*API : `POST /api/inventory/use` avec `userItemId` + `ninjaId`.*

### B. Consommables Match (`category: match`)

Équipés sur un ninja actif. **1 usage / match**, détruits après. Effets = **mécaniques**, pas +stats.

| Slug | Nom | Effet | Prix |
| :--- | :--- | :--- | :--- |
| `fumigene-secours` | Fumigène de secours | Si le ninja **Tank** subirait un coup fatal (après interception Sensei) : dégâts **−32 %**, objet détruit. **Hors consigne Tank : aucun effet.** | 550 |
| `parchemin-rupture` | Parchemin de rupture | Si l'adversaire attaque en **Genjutsu** contre ce ninja : **+4** au jet de dissipation (tour de la riposte mentale). 1× / match. | 600 |
| `herbes-apaisantes` | Herbes apaisantes | Si PV **< 20 %** en cours de match : **+12 PV**. Auto. | 500 |
| `cachet-chakra` | Cachet de chakra | Si Chakra **< 15 %** : **+12 Chakra**. Auto. | 500 |
| `parchemin-leurre` | Parchemin de leurre | **1×** : si ciblé, **30 %** de chance de rediriger vers un autre allié. | 550 |

*Moteur : hooks dans `trySenseiSave` / `resolveGenjutsuDuel` / `pickDefender` / `tryConsumables` — logs explicites pour M6.*

### C. Objets Cycle (`category: cycle`)

Assignés pour **tout le cycle** (72 h). Effet principal **hors combat** ; malus/bonus match léger et prévisible.

| Slug | Nom | Effet match | Effet cycle | Prix |
| :--- | :--- | :--- | :--- | :--- |
| `poids-entrainement` | Poids d'entraînement | **−2 Vitesse** en match | **+20 %** gains d'entraînement à la fin du cycle | 900 |
| `ration-combat` | Ration de combat | Aucun | **−10 %** coût salaire de ce ninja au prélèvement H72 | 750 |

*Retiré automatiquement si ninja envoyé en mission idle (ou bloqué à l'envoi — à trancher).*

---

## 🏥 Leviers économiques hors Marché (M4+ / M7 / backlog)

Ces dépenses donnent la **vraie** valeur aux Ryos ; le Marché est un complément.

| Système | Milestone | Effet |
| :--- | :--- | :--- |
| **Dispensaire** | M6/M7 backlog | Soigner Forme / KO entre cycles — coût croissant |
| **Examens Chunin / Jonin** | M4+ | Frais **dynamiques** (base 300 + bonus stats) ; stagnation H72 si pas d'évolution |
| **Dojo — Terrain gravitationnel** | Backlog | Amélioration permanente : +5 % XP entraînement / cycle |
| **Salaires H72** | M4 ✅ | Pression économique récurrente |
| **Missions idle** | M4 ✅ | Entrée / sortie de Ryos |

---

## ⚙️ Moteur combat — surface minimale

```text
match consumables (effects JSON)
├── trigger: lethal_mitigation   → fumigène (−32 % fatals, Tank uniquement)
├── trigger: genjutsu_defense    → parchemin rupture
├── trigger: pv_below_pct        → herbes (existant)
├── trigger: chakra_below_pct    → cachet (existant)
└── trigger: on_targeted         → leurre (nouveau, pickDefender)
```

**Supprimé du moteur :** `getSituationalAttackBonus`, `getSituationalDefenseBonus`, modificateurs PV gear, `firstTourSpeedBonus` lié aux objets (l'initiative redevient 100 % stats + traits).

**Cycle :** malus vitesse du poids appliqué dans `teamTacticalSpeed` ; bonus entraînement dans le job H72 / service entraînement.

---

## 📖 Chronique M6

| Événement log | Phrase type |
| :--- | :--- |
| `item_smoke_save` | « {ninja} lâche un fumigène — le coup fatal se dissipe dans la brume. » |
| `item_rupture_scroll` | « {ninja} brise l'illusion d'un geste du parchemin de rupture. » |
| `item_decoy` | « Leurre ! L'assaillant se trompe de cible. » |
| `item_unused` | Débriefing : objet équipé mais jamais déclenché |

---

## 🎲 Équilibrage cible

| Scénario | Δ win rate |
| :--- | :--- |
| Aucun objet de match | baseline |
| Objet mal choisi / jamais proc | **0 à +2 pts** |
| Fumigène sur Tank fragile ou rupture vs équipe genjutsu | **+5 à +10 pts** |
| Poids d'entraînement | **0 % combat** ; valeur sur **2–3 cycles** (stats réelles) |

Le couple **consignes ±30 pts** reste dominant.

---

## 🔄 Migration depuis l'existant

1. `009_utility_simplify.sql` — nouvel ENUM category, DELETE seeds weapon/armor, INSERT catalogue ci-dessus
2. `ninja_equipment.slot` → `ENUM('match','cycle')` ; migrer `gear`/`consumable` → `match` ou supprimer
3. Réécrire `equipment.js` (~150 lignes → ~80)
4. `InventoryView` : 1 slot match + section cycle + bouton Utiliser (bureau)
5. Retirer `describeUsageLimits` complexe pour armes

---

## ✅ Réponse à la question produit

**Oui — on simplifie vers des utilitaires / consommables uniquement.**

- Pas de slot arme/armure permanent en combat.
- Ryos = club (dispensaire, salaires, examens, dojo) + optimisation cycle.
- Marché = filets tactiques et confort, pas power creep.
- Code plus simple, chronique plus lisible, économie plus saine.

Les idées « tempo / initiative / +1 atk » du catalogue précédent passent en **backlog optionnel** si les 5 consommables match + 3 bureau + 2 cycle suffisent en playtest.

---

---

## 🏪 Magasin du village — V2 (direction PO validée, à implémenter)

**Pourquoi changer :** le tirage de 3 articles au hasard frustre (cape introuvable quand il pleut, pas de plan d'achat). Un vrai magasin de village = **visibilité**, **rareté par le stock**, **rythme par le réassort**, **incitation par les promos**.

### Principes

| Principe | Détail |
| :--- | :--- |
| **Catalogue complet visible** | Tous les `item_definitions` utilitaires listés — le joueur voit ce qui existe |
| **Stock limité par article** | Chaque ligne a un `stock_remaining` ; achat → −1 ; à 0 = « épuisé » jusqu'au prochain réassort |
| **Réassort complet tous les X cycles** | Ex. **X = 3** (≈ 1 semaine jeu) : toutes les quantités reviennent aux valeurs par défaut |
| **Promos chaque cycle** | **2 articles** en promo (−15 % à −25 %) tirés ou rotatifs — change à **chaque H0** |
| **Périmètre stock** | **Par joueur** (chaque Sensei a son étal du village) — pas de guerre d'enchères async entre membres du pool |
| **Pas d'expiration H72** | Le stock **persiste** dans le cycle ; seules les **promos** changent à H0 |

### Stocks par défaut (indicatif)

| Catégorie | Stock / période de réassort | Logique |
| :--- | :--- | :--- |
| `bureau` | 2 | Consommables confort — usage répété possible sur 3 cycles |
| `match` | 1–2 | Filet tactique — pas de spam fumigène ×6 |
| `cycle` | 1 | Cape / poids = choix d'investissement par période |
| Anti-environnement | 1 | Aligné scout H36 — rareté volontaire |

### Promos

- **2 slugs** en promo par cycle (ex. `−20 %`)
- Rotation : éviter 2× le même article deux cycles de suite
- Option : **promo « flash »** liée à l'environnement du match (*pluie* → cape −25 %) — **1 cycle max**, en plus des 2 promos standard — à valider en playtest

### Boucle avec l'environnement (H36)

```
H36 scout : pluie probable
H0–H71 : magasin affiche cape (stock 0 ou 1) + promo éventuelle
→ le joueur **planifie** sans RNG sur la présence de l'article
→ la **rareté** vient du stock, pas de l'absence du catalogue
```

### Schéma BDD (ébauche)

Remplacer ou compléter `market_offers` (3 slots) par :

```sql
village_shop_stock (
  user_id, period_start_at,   -- début de période de réassort (cycle 1, 4, 7…)
  item_definition_id,
  stock_initial, stock_remaining,
  UNIQUE (user_id, period_start_at, item_definition_id)
)

village_shop_promos (
  user_id, cycle_start_at,
  item_definition_id,
  discount_pct,               -- ex. 20
  UNIQUE (user_id, cycle_start_at, item_definition_id)
)
```

`item_definitions` : ajouter `default_stock TINYINT`, `promo_eligible BOOLEAN DEFAULT TRUE`.

### Jobs horloge

| Moment | Action |
| :--- | :--- |
| **H0** | Nouvelles promos (2 articles) |
| **H0 si `cycle % X === 1`** | Réassort complet (`stock_remaining = default_stock`) |
| **Achat** | `stock_remaining − 1`, prix = `base × (1 − promo)` |

### UI Magasin

- Grille **tous les articles** : prix barré si promo, badge « Épuisé », compteur « Reste : 1 »
- Bandeau : « Prochain réassort : cycle {n} » · « Promos jusqu'à H72 »
- Filtres optionnels : bureau / match / cycle

### Équilibrage Ryos

- Stocks bas + réassort tous les 3 cycles ≈ **dépense lissée** sans hoarding infini
- Promos = raison d'ouvrir le magasin **chaque cycle** sans FOMO sur tout le catalogue
- Le **marché P2P** reste l'option « je n'ai pas attendu le réassort »

### Migration depuis V1 (3 slots)

1. Migration `019_village_shop_stock.sql`
2. Réécrire `marketService.js` → `villageShopService.js`
3. `MarketView` : grille catalogue + état stock/promo
4. Conserver `POST /api/market/purchase` (ou renommer `/api/shop`)

**Statut :** ✅ livré (juil. 2026) — `villageShopService.js`, migration 019+, grille catalogue stocks/promos/réassort.

---

## 💤 Backlog catalogue (nouveaux objets)

- Parchemin d'éclair (+initiative T1) — seulement si les match consumables manquent de variété
- Kit dojo (améliorations permanentes multi-niveaux)
- Poudre révélatrice (contre leurre ennemi)
