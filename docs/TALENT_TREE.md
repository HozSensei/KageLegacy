# 🌳 Arbre de Talents

## 🎯 Concept

L'**Arbre de Talents** est le système de progression principal du personnage, inspiré de **Path of Exile**. 

**Principe** :
- ❌ **Aucune stat automatique** par niveau
- ✅ Toutes les stats viennent de : **Talents + Cartes**
- 🌳 Arbre massif de **~150 nœuds**
- 📈 **1 point de talent par niveau** (100 points au niveau 100)

---

## 🗺️ Structure de l'Arbre

### Vue d'Ensemble

```
                    [DÉPART]
                       |
        ┌──────────────┼──────────────┬──────────────┐
        |              |              |              |
    TAIJUTSU      NINJUTSU       GENJUTSU       MÉDECINE
    (Combat)    (Élémentaire)   (Contrôle)      (Survie)
        |              |              |              |
    [Stats]        [Stats]        [Stats]        [Stats]
        |              |              |              |
    [Notables]     [Notables]     [Notables]     [Notables]
        |              |              |              |
    [Keystone]     [Keystone]     [Keystone]     [Keystone]
```

### 4 Branches Principales

| Branche | Focus | Keystones Signature |
|---------|-------|---------------------|
| **Taijutsu** | Dégâts physiques, combos | Berserker, Lame Rapide |
| **Ninjutsu** | Techniques élémentaires, Chakra | Fusion Élémentaire, Surcharge |
| **Genjutsu** | Contrôle, débuffs, esquive | Maître des Illusions, Intangible |
| **Médecine** | Soins, tanking, régénération | Immortel, Tank Parfait |

---

## 📊 Types de Nœuds

### 1. Nœuds de Stats (Petits)

**Fonction** : Augmenter une stat de base

**Exemples** :
```javascript
{
  id: 'tai_5_a',
  name: '+5 Taijutsu',
  type: 'stat',
  bonus: { taijutsu: 5 },
  cost: 1
}

{
  id: 'nin_10_b',
  name: '+10 Ninjutsu',
  type: 'stat',
  bonus: { ninjutsu: 10 },
  cost: 1
}

{
  id: 'mixed_stats',
  name: '+3 Taijutsu, +3 Vitesse',
  type: 'stat',
  bonus: { taijutsu: 3, vitesse: 3 },
  cost: 1
}
```

**Rareté** : ~100 nœuds (66% de l'arbre)

---

### 2. Nœuds Notables (Moyens)

**Fonction** : Bonus puissants ou synergies

**Exemples** :

```javascript
// Notable : Maître des Combos
{
  id: 'combo_master',
  name: 'Maître des Combos',
  type: 'notable',
  effect: 'Si vous jouez 3 cartes Taijutsu dans un tour : +2 Force',
  icon: '⚔️',
  cost: 1,
  requires: ['tai_20_c', 'tai_15_d']
}

// Notable : Fusion Élémentaire
{
  id: 'elemental_fusion',
  name: 'Fusion Élémentaire',
  type: 'notable',
  effect: 'Jouer 2 cartes d\'éléments différents : Piochez 1 carte',
  icon: '🔥💧',
  cost: 1,
  requires: ['nin_25_a']
}

// Notable : Collectionneur
{
  id: 'collector',
  name: 'Collectionneur',
  type: 'notable',
  effect: 'Chaque carte Objet unique dans votre deck : +1 à toutes vos stats',
  icon: '🎒',
  cost: 1,
  requires: ['int_15_b']
}

// Notable : Régénération Accrue
{
  id: 'boosted_regen',
  name: 'Régénération Accrue',
  type: 'notable',
  effect: '+50% efficacité de Régénération et Soins',
  icon: '💚',
  cost: 1,
  requires: ['med_30_a']
}
```

**Rareté** : ~40 nœuds (27% de l'arbre)

---

### 3. Keystones (Rares)

**Fonction** : Changements majeurs de gameplay (avec trade-offs)

**Exemples** :

```javascript
// Keystone : Berserker
{
  id: 'berserker',
  name: 'Berserker',
  type: 'keystone',
  effect: 'Vos attaques font 2× dégâts mais vous ne pouvez pas gagner d\'Armure',
  icon: '💢',
  color: 'red',
  cost: 1,
  requires: ['combo_master', 'tai_50_x']
}

// Keystone : Surcharge
{
  id: 'overload',
  name: 'Surcharge',
  type: 'keystone',
  effect: 'Vos cartes Ninjutsu coûtent +1 Chakra mais font +100% dégâts',
  icon: '⚡',
  color: 'gold',
  cost: 1,
  requires: ['nin_60_y']
}

// Keystone : Intangible
{
  id: 'intangible',
  name: 'Intangible',
  type: 'keystone',
  effect: 'Vous ne pouvez pas porter d\'attaques mais les attaques ennemies font 1 dégât max',
  icon: '👻',
  color: 'purple',
  cost: 1,
  requires: ['gen_45_z']
}

// Keystone : Immortel
{
  id: 'immortal',
  name: 'Immortel',
  type: 'keystone',
  effect: 'Régénérez 2% de vos PV max par tour. Vos attaques font -50% dégâts',
  icon: '💖',
  color: 'pink',
  cost: 1,
  requires: ['med_55_w']
}

// Keystone : Maître des Objets
{
  id: 'item_master',
  name: 'Maître des Objets',
  type: 'keystone',
  effect: 'Les cartes Objet ne s\'épuisent plus (2 usages). Vous ne pouvez pas jouer de Techniques',
  icon: '🎒',
  color: 'brown',
  cost: 1,
  requires: ['collector', 'int_40_v']
}
```

**Rareté** : ~10 nœuds (7% de l'arbre)

---

## 🎮 Exemples de Builds

### Build 1 : "Berserker Taijutsu"

**Objectif** : One-shot les ennemis

**Talents (50 points)** :
- 30 points dans stats Taijutsu (+150 Taijutsu)
- 10 points dans Vitesse (+50 Vitesse)
- "Maître des Combos" (Notable)
- "Lame Rapide" (Notable : Cartes 0-1 coût +3 dégâts)
- "Berserker" (Keystone : 2× dégâts, pas d'Armure)

**Deck** :
- 20 cartes Taijutsu low-cost
- 5 objets (Pilules boost)
- 5 cartes pioche

**Stats finales** :
- Taijutsu : 150 (talents) + 60 (cartes) = **210 Taijutsu**
- Bonus : 2× dégâts (Berserker)
- Carte "Coup rapide" (1 coût, 6 dégâts) → 6 × 3.1 × 2 + 3 = **~40 dégâts**

**Faiblesse** : Aucune défense (un coup = mort)

---

### Build 2 : "Tank Immortel"

**Objectif** : Survivre éternellement

**Talents (50 points)** :
- 30 points dans Médecine (+150 Médecine)
- 15 points dans Défense/PV max
- "Régénération Accrue" (Notable : +50% soins)
- "Immortel" (Keystone : +2% PV/tour, -50% dégâts)

**Deck** :
- 15 cartes Soin/Défense
- 10 cartes Objet (Kit médical)
- 5 cartes attaque (pour finir le combat lentement)

**Stats finales** :
- Médecine : 150 (talents) + 50 (cartes) = **200 Médecine**
- PV max : 180 (avec nœuds)
- Regen : 3.6 PV/tour (2% de 180)

**Stratégie** : Tank tout, soigne plus que dégâts reçus

---

### Build 3 : "Mage Élémentaire"

**Objectif** : Gros dégâts élémentaires avec Chakra

**Talents (50 points)** :
- 25 points dans Ninjutsu (+125 Ninjutsu)
- 10 points dans Intelligence (+50 Intelligence)
- 5 points dans +Chakra max (+2 Chakra)
- "Fusion Élémentaire" (Notable : 2 éléments = pioche)
- "Maîtrise Élémentaire" (Notable : +25% dégâts élémentaires)
- "Surcharge" (Keystone : +1 coût, +100% dégâts)

**Deck** :
- 10 cartes Katon (feu)
- 10 cartes Suiton (eau)
- 5 cartes pioche/Chakra
- 5 objets boost

**Stats finales** :
- Ninjutsu : 125 (talents) + 50 (cartes) = **175 Ninjutsu**
- Chakra max : 5 par tour
- Bonus : +100% dégâts (Surcharge) + 25% (Maîtrise)

**Combo** :
```
Tour 1 : Jouer Katon + Suiton → Pioche 1 (Fusion)
Carte "Boule de feu" (3 coût, 12 dégâts)
→ 12 × 2.75 × 2.25 = ~74 dégâts !
```

---

### Build 4 : "Collectionneur d'Objets"

**Objectif** : Abuser des objets

**Talents (50 points)** :
- 20 points répartis (équilibré)
- "Collectionneur" (Notable : +1 toutes stats par objet unique)
- "Maître des Objets" (Keystone : Objets 2× usage, pas de Techniques)

**Deck** :
- 25 cartes Objet différentes (Kunai, Shuriken, Pilule, Kit, Parchemin, etc.)
- 5 cartes Défense/Soutien

**Stats finales** :
- +25 à TOUTES les stats (Collectionneur)
- Objets utilisables 2× (Maître des Objets)

**Stratégie** : Spam d'objets puissants réutilisables

---

## 🔄 Système de Respec

### Coût de Réorientation

**Option 1 : Respec complet gratuit** (friendly)
- Permet d'expérimenter sans punition
- Bouton "Réinitialiser l'arbre" dans l'interface

**Option 2 : Respec coûteux** (hardcore)
- Coût : 5000 Ryos + 500 Dust
- Limite : 1 respec par semaine
- Encourage à théorycraft avant d'investir

**Option 3 : Respec progressif** (hybride)
- 1 respec gratuit tous les 10 niveaux
- Respec supplémentaire : 2000 Ryos

---

## 📊 Structure Base de Données

```sql
-- Définition de l'arbre (statique)
CREATE TABLE talent_tree_nodes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  node_id VARCHAR(50) UNIQUE NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  type ENUM('stat', 'notable', 'keystone') NOT NULL,
  
  -- Bonus (stats ou effet)
  stat_bonus_json JSON,      -- { "taijutsu": 5, "vitesse": 3 }
  effect_description_fr TEXT,
  effect_description_en TEXT,
  effect_code VARCHAR(100),  -- Code pour appliquer l'effet en jeu
  
  -- Position visuelle
  position_x INT NOT NULL,
  position_y INT NOT NULL,
  branch ENUM('taijutsu', 'ninjutsu', 'genjutsu', 'medicine', 'center'),
  
  -- Prérequis
  requires_nodes_json JSON,  -- ['tai_5_a', 'tai_10_b']
  
  -- Visuels
  icon VARCHAR(10),          -- Emoji ou classe CSS
  color VARCHAR(20)          -- Pour les Keystones
);

-- Talents débloqués par le joueur
CREATE TABLE user_talents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  node_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_talents (user_id)
);

-- Historique respec
CREATE TABLE user_talent_respec_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  respec_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cost_ryos INT,
  cost_dust INT,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_respec_history (user_id)
);
```

---

## 🎨 Interface Visuelle

### Affichage de l'Arbre

**Inspiration** : Path of Exile (zoomable, pannable)

```
Fonctionnalités UI :
- Zoom in/out (molette souris)
- Pan (clic-glisser)
- Minimap (coin supérieur droit)
- Filtre par branche
- Recherche de nœud
- "Highlight path" : Montre le chemin optimal vers un nœud
- Stats calculées en temps réel (panneau latéral)
```

### Panneau de Stats

```
┌─────────────────────────────────┐
│  VOS STATS ACTUELLES            │
├─────────────────────────────────┤
│  Taijutsu    : 150 (+45 talents)│
│  Ninjutsu    : 85  (+25 talents)│
│  Genjutsu    : 40  (+10 talents)│
│  Médecine    : 120 (+60 talents)│
│  Vitesse     : 95  (+30 talents)│
│  Intelligence: 70  (+20 talents)│
├─────────────────────────────────┤
│  EFFETS ACTIFS                  │
│  • Maître des Combos            │
│  • Régénération Accrue          │
│  • Berserker (Keystone)         │
├─────────────────────────────────┤
│  Points disponibles : 23        │
└─────────────────────────────────┘
```

---

## 🎯 Objectifs de Design

### Équilibrage

**Objectifs** :
- ✅ Multiples builds viables (pas un seul "meta")
- ✅ Keystones = game changers mais avec coût
- ✅ Stats seules ≠ suffisant (synergies nécessaires)
- ✅ Profondeur sans complexité écrasante

### Diversité

**100 nœuds de stats** : Permettent builds généralistes
**40 Notables** : Créent des synergies
**10 Keystones** : Définissent l'identité du build

**Exemples de diversité** :
- Build pur Taijutsu vs Build hybride Tai/Nin
- Build Glass Cannon vs Build Tank
- Build Burst vs Build DOT (Damage Over Time)

---

## 🚀 Implémentation

### Phase 1 : Arbre Basique (MVP)

**50 nœuds** :
- 30 nœuds de stats
- 15 Notables
- 5 Keystones

**1 branche complète** : Taijutsu

### Phase 2 : Arbre Complet

**150 nœuds** :
- 100 stats
- 40 Notables
- 10 Keystones

**4 branches** : Taijutsu, Ninjutsu, Genjutsu, Médecine

### Phase 3 : Balance & Itération

- Collecte de données (builds populaires)
- Nerfs/Buffs des Keystones OP/UP
- Ajout de nouveaux nœuds selon retours

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2026
