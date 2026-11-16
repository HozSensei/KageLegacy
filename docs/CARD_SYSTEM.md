# 🃏 Système de Cartes

## 🎯 Vue d'Ensemble

Les cartes sont le cœur du gameplay. Le joueur collecte, améliore et combine des cartes pour créer des decks puissants. Chaque carte représente une technique, un objet ou un allié.

## 📊 Structure d'une Carte

### Propriétés Essentielles

```javascript
{
  // Identité
  id: 42,
  slug: "poing-du-dragon",
  name_fr: "Poing du dragon",
  name_en: "Dragon Fist",
  
  // Classification
  type: "attack",              // attack, defense, skill, summon, item
  stat_type: "taijutsu",       // taijutsu, ninjutsu, genjutsu, medicine
  element: "katon",            // katon, suiton, raiton, doton, futon, null
  rarity: "common",            // common, rare, legendary, mythic
  
  // Stats de jeu
  cost: 1,                     // Coût en Chakra
  damage: 8,                   // Dégâts (si attaque)
  block: 0,                    // Armure (si défense)
  heal: 0,                     // Soins (si soutien)
  
  // Effets actifs (quand jouée)
  effects: [
    { type: 'draw', value: 1 }  // Effets additionnels
  ],
  
  // 🆕 BONUS PASSIF (tant qu'elle est dans le deck)
  passive_bonus: {
    taijutsu: 3,               // +3 Taijutsu
    vitesse: 1                 // +1 Vitesse
  },
  
  // Texte
  description_fr: "Inflige 8 dégâts. Piochez 1 carte.",
  passive_description_fr: "Bonus passif : +3 Taijutsu, +1 Vitesse",
  description_en: "Deal 8 damage. Draw 1 card.",
  lore_fr: "Une technique ancestrale des maîtres de taijutsu.",
  lore_en: "An ancestral technique of taijutsu masters.",
  
  // Amélioration
  upgradable: true,
  upgrade_level: 0,            // 0 = base, 1 = +, 2 = ++
  upgrade_bonuses: {
    level_1: { 
      damage: +4,              // Effet actif amélioré
      passive: { taijutsu: +2, vitesse: +1 }  // Bonus passif amélioré aussi !
    },
    level_2: { 
      damage: +8, 
      cost: -1,
      passive: { taijutsu: +4, vitesse: +2 }
    }
  },
  
  // Visuels
  image_url: "/assets/cards/poing-du-dragon.png",
  artist: "Generated",
  
  // Métadonnées
  created_at: "2026-11-14",
  season_obtained: 1,          // Saison Battle Pass
  is_exclusive: false          // Carte exclusive saison ?
}
```

## 🎨 Types de Cartes

### Double Fonction des Cartes

**Chaque carte a 2 aspects** :

1. **Effet actif** : Ce qu'elle fait quand jouée en combat
2. **Bonus passif** : Stats ajoutées tant qu'elle est dans le deck

**Exemple** : Kunai
- Actif : Inflige 4 dégâts
- Passif : +2 Dextérité (même si pas jouée)

**Stratégie** : Choisir les cartes pour leur effet OU leurs stats (ou les deux !)

---

### 1. Attaque (Attack) — 50%

**Fonction** : Infliger des dégâts

**Sous-types** :
- **Simple** : Dégâts directs
- **Multi-frappe** : X attaques de Y dégâts
- **AOE** : Touche tous les ennemis
- **Conditionnelle** : Bonus si condition remplie

**Exemples** :

```javascript
// Attaque simple
{
  name_fr: "Poing rapide",
  type: "attack",
  stat_type: "taijutsu",
  cost: 1,
  damage: 6,
  effects: [],
  passive_bonus: { taijutsu: 2, vitesse: 1 }  // 🆕 Bonus passif
}

// Multi-frappe
{
  name_fr: "Barrage de kunais",
  type: "attack",
  stat_type: "taijutsu",
  cost: 2,
  damage: 4,
  effects: [
    { type: 'multi_strike', hits: 3 }  // 3× 4 dégâts
  ]
}

// Conditionnelle
{
  name_fr: "Frappe opportuniste",
  type: "attack",
  stat_type: "taijutsu",
  cost: 1,
  damage: 8,
  effects: [
    { type: 'bonus_if', condition: 'enemy_vulnerable', value: +6 }
  ],
  description_fr: "8 dégâts. +6 si l'ennemi est Vulnérable."
}
```

### 2. Objet (Item) — 20%

**Fonction** : Buffs, soins, manipulation (consommables)

**Sous-types** :
- **Consommable** : Usage unique (Exhaust)
- **Permanent** : Effet persistant

**Exemples** :

```javascript
// Objet : Kunai
{
  name_fr: "Kunai",
  type: "item",
  cost: 0,
  damage: 4,
  exhaust: true,  // Se retire après usage
  passive_bonus: { dexterity: 2 },  // 🆕 Bonus passif
  upgrade_bonuses: {
    level_1: { damage: +2, passive: { dexterity: +1 } }
  }
}

// Objet : Pilule fortifiante
{
  name_fr: "Pilule fortifiante",
  type: "item",
  cost: 1,
  effects: [
    { type: 'apply_status', status: 'force', value: 3, duration: 3 }
  ],
  exhaust: true,
  passive_bonus: { taijutsu: 1, vitesse: 1 }
}

// Objet : Parchemin d'exil — scelle l'intention ennemie (PvE)
{
  name_fr: "Parchemin d'exil",
  type: "item",
  cost: 2,
  effects: [
    { type: 'exile_enemy_card' } // → intent sealed (pas de drain chakra)
  ],
  exhaust: true,
  passive_bonus: { intelligence: 3 }
}
```

### 3. Défense (Defense) — 15%

**Fonction** : Gagner de l'Armure, esquiver

**Sous-types** :
- **Block** : Armure temporaire
- **Évitement** : % esquive
- **Réduction** : -X% dégâts
- **Riposte** : Armure + Contre-attaque

**Exemples** :

```javascript
// Block simple
{
  name_fr: "Garde haute",
  type: "defense",
  cost: 1,
  block: 8,
  effects: []
}

// Évitement
{
  name_fr: "Esquive au leurre",
  type: "defense",
  cost: 1,
  block: 5,
  effects: [
    { type: 'evade_next', chance: 0.5 }  // 50% esquive
  ]
}

// Riposte
{
  name_fr: "Contre-attaque",
  type: "defense",
  cost: 2,
  block: 10,
  effects: [
    { type: 'counter', damage: 8 }  // Renvoie 8 dégâts
  ]
}
```

### 4. Soutien (Skill) — 10%

**Fonction** : Soins, buffs, manipulation

**Sous-types** :
- **Soin** : Restaure PV
- **Buff** : Augmente stats
- **Pioche** : +X cartes
- **Manipulation** : Exile, retour, coût réduit

**Exemples** :

```javascript
// Soin
{
  name_fr: "Paume apaisante",
  type: "skill",
  stat_type: "medicine",
  cost: 2,
  heal: 12,
  effects: []
}

// Buff
{
  name_fr: "Pilule fortifiante",
  type: "skill",
  cost: 1,
  effects: [
    { type: 'apply_status', target: 'self', status: 'force', value: 3, duration: 2 }
  ],
  description_fr: "+3 Force pendant 2 tours."
}

// Pioche
{
  name_fr: "Concentration",
  type: "skill",
  cost: 0,
  effects: [
    { type: 'draw', value: 2 }
  ]
}
```

### 5. Invocation (Summon) — 5%

**Fonction** : Invoquer un allié persistent

**Exemples** :

```javascript
{
  name_fr: "Invoquer clone de combat",
  type: "summon",
  cost: 3,
  summon: {
    name: "Clone",
    hp: 20,
    attack: 6,
    abilities: ["taunt"],  // Absorbe les attaques
    description: "Taunt : Absorbe les dégâts à votre place"
  }
}

{
  name_fr: "Invoquer le Gardien de jade",
  type: "summon",
  cost: 5,
  rarity: "legendary",
  summon: {
    name: "Gardien de jade",
    hp: 40,
    attack: 10,
    abilities: ["taunt", "regen"],
    passive: "Régénère 5 PV par tour"
  }
}
```

**Note** : Les passifs ne sont plus des cartes mais des talents dans l'arbre !

**Fonction** : Effets permanents (ne se pioche pas)

**Exemples** :

```javascript
{
  name_fr: "Oeil de Kagemori",
  type: "passive",
  cost: 0,
  permanent: true,
  rarity: "legendary",
  effects: [
    { type: 'reveal_intent', turns_ahead: 1 }
  ],
  description_fr: "Révèle toujours l'intention de l'ennemi."
}

{
  name_fr: "Sang du Yukisawa",
  type: "passive",
  cost: 0,
  permanent: true,
  rarity: "rare",
  effects: [
    { type: 'start_combat_buff', status: 'dexterity', value: 2 }
  ],
  description_fr: "Commence chaque combat avec +2 Dextérité."
}
```

## 🌈 Système de Rareté

### Distribution

| Rareté | % du Pool | Couleur | Pouvoir | Exemples |
|--------|-----------|---------|---------|----------|
| **Commune** | 60% | Gris | Basique | Poing, Garde |
| **Rare** | 30% | Bleu | Moyen | Boule de feu, Clone |
| **Légendaire** | 9% | Or | Puissant | Éclair perçant, Gardien de jade |
| **Mythique** | 1% | Violet | Ultra-puissant | Boss signatures, Battle Pass 50 |

### Caractéristiques par Rareté

```javascript
const RARITY_STATS = {
  common: {
    cost_range: [0, 2],
    damage_range: [4, 10],
    effects: 0-1,
    upgrade_cost: { dust: 20, ryos: 500 }
  },
  rare: {
    cost_range: [1, 3],
    damage_range: [8, 16],
    effects: 1-2,
    upgrade_cost: { dust: 100, ryos: 1500 }
  },
  legendary: {
    cost_range: [2, 5],
    damage_range: [14, 28],
    effects: 2-3,
    upgrade_cost: { dust: 500, ryos: 5000 }
  },
  mythic: {
    cost_range: [3, 7],
    damage_range: [20, 40],
    effects: 3-4,
    upgrade_cost: { dust: 2000, ryos: 20000 }
  }
};
```

## ⬆️ Système d'Amélioration

### Niveaux d'Upgrade

**3 niveaux** : Base (0) → + (1) → ++ (2)

### Coût d'Amélioration

| Rareté | Niveau 1 | Niveau 2 |
|--------|----------|----------|
| Commune | 500 Ryos + 20 Dust | 2000 Ryos + 100 Dust |
| Rare | 1500 Ryos + 100 Dust | 6000 Ryos + 500 Dust |
| Légendaire | 5000 Ryos + 500 Dust | 20000 Ryos + 2000 Dust + 10 Essence |
| Mythique | 20000 Ryos + 2000 Dust + 20 Essence | Non upgradable (déjà max) |

### Patterns d'Upgrade

**Attaque** :
- Niveau 1 : +40-60% dégâts
- Niveau 2 : +80-100% dégâts OU -1 coût

**Défense** :
- Niveau 1 : +40-60% armure
- Niveau 2 : +80-100% armure OU effet bonus (contre, évitement)

**Soutien** :
- Niveau 1 : +durée OU +valeur
- Niveau 2 : -1 coût OU effet bonus

**Exemples** :

```javascript
// Poing rapide (Base)
{ name: "Poing rapide", cost: 1, damage: 6, effects: [] }

// Poing rapide+ (Niveau 1)
{ name: "Poing rapide+", cost: 1, damage: 9, effects: [{ type: 'draw', value: 1 }] }

// Poing rapide++ (Niveau 2)
{ name: "Poing rapide++", cost: 0, damage: 12, effects: [{ type: 'draw', value: 1 }] }
```

## 🎁 Obtention de Cartes

### Sources

1. **Récompenses de Mission**
   - Rang D : 1 carte commune (80%)
   - Rang C : 1 carte rare (40%)
   - Rang B : 1 carte rare (80%)
   - Rang A : 1 carte légendaire (40%)
   - Rang S : 1 carte légendaire garantie

2. **Boosters** (`/shop` onglet Boosters)
   - Parchemin Standard (500 Ryos) : 5 cartes, rareté normale
   - Parchemin Élémentaire (650 Ryos) : 5 cartes filtrées par élément
   - Parchemin Premium (100 KC) : 5 cartes, 1 rare garantie
   - API : `GET/POST /api/shop/boosters` — tirage 100 % serveur

   **Shop élargi** (même page, onglets) :
   - Cosmétiques : cadres d’avatar, dos de carte, titres (`/api/shop/cosmetics`)
   - Packs Kage Coins (`/api/shop/coin-packs`)
   - Offre Battle Pass premium (`/api/shop/battle-pass`)

3. **Boss Drop**
   - Chaque boss a 1 carte signature légendaire (10% drop)
   - Première victoire : Garantie

4. **Battle Pass**
   - Piste gratuite : 3 légendaires
   - Piste premium : +6 légendaires + 1 mythique

5. **Crafting**
   - Craft avec Dust (coût élevé mais garanti)
   - Permet d'obtenir n'importe quelle carte

6. **Événements**
   - Cartes exclusives temporaires
   - Challenges hebdomadaires

## ♻️ Système de Désenchantement

### Dust (Poussière de Chakra)

**Obtention** :
- Désenchanter une carte en double
- Récompenses de missions/Battle Pass

**Valeurs** :

| Rareté | Désenchantement | Craft |
|--------|-----------------|-------|
| Commune | 5 Dust | 50 Dust |
| Rare | 20 Dust | 200 Dust |
| Légendaire | 100 Dust | 1000 Dust |
| Mythique | 500 Dust | 5000 Dust |

**Ratio** : Craft coûte 10× le désenchantement

### Essence (Essence de Chakra)

**Obtention** :
- Récompenses rares (Battle Pass, Boss)
- Désenchanter une carte légendaire/mythique upgradée

**Utilisation** :
- Upgrader cartes légendaires niveau 2
- Craft de cartes mythiques

## 🎲 Génération Procédurale de Cartes

### Template de Génération

```javascript
// backend/src/services/cardGenerator.js

function generateCard(type, element, rarity) {
  const name = generateName(type, element, rarity);
  const stats = generateStats(type, rarity);
  const effects = generateEffects(type, rarity);
  
  return {
    slug: slugify(name),
    name_fr: name,
    name_en: translateToEnglish(name),
    type,
    stat_type: mapTypeToStat(type),
    element,
    rarity,
    cost: stats.cost,
    damage: stats.damage,
    block: stats.block,
    heal: stats.heal,
    effects,
    description_fr: buildDescription(stats, effects, 'fr'),
    description_en: buildDescription(stats, effects, 'en'),
    upgradable: true,
    upgrade_bonuses: generateUpgradeBonuses(stats, rarity)
  };
}
```

### Pool de Noms (Techniques)

```javascript
const TECHNIQUE_PREFIXES = {
  taijutsu: ['Poing', 'Frappe', 'Coup', 'Barrage', 'Rotation'],
  ninjutsu: ['Boule', 'Jet', 'Vague', 'Mur', 'Lance', 'Souffle'],
  genjutsu: ['Illusion', 'Mirage', 'Brume', 'Rêve', 'Voile'],
  medicine: ['Paume', 'Soin', 'Régénération', 'Chakra']
};

const TECHNIQUE_SUFFIXES = {
  common: ['rapide', 'simple', 'basique', 'léger'],
  rare: ['destructeur', 'puissant', 'éclair', 'tourbillon'],
  legendary: ['suprême', 'ancestral', 'interdit', 'légendaire', 'divin']
};

const ELEMENT_NAMES = {
  katon: 'de feu',
  suiton: 'd\'eau',
  raiton: 'de foudre',
  doton: 'de terre',
  futon: 'de vent'
};
```

**Exemples générés** :
- "Poing rapide" (Taijutsu, Commune)
- "Boule de feu destructrice" (Ninjutsu Katon, Rare)
- "Illusion suprême" (Genjutsu, Légendaire)

## 📊 Balance des Cartes

### Formule d'Évaluation

**Power Score** : Évalue la puissance d'une carte

```javascript
function calculatePowerScore(card) {
  let score = 0;
  
  // Dégâts
  if (card.damage) {
    score += card.damage * 1.0;
  }
  
  // Armure (vaut un peu moins que dégâts)
  if (card.block) {
    score += card.block * 0.8;
  }
  
  // Soins (vaut moins car ne progresse pas le combat)
  if (card.heal) {
    score += card.heal * 0.7;
  }
  
  // Effets
  for (const effect of card.effects) {
    score += evaluateEffect(effect);
  }
  
  // Coût (doit équilibrer la puissance)
  const targetScore = card.cost * 5;  // 1 Chakra = 5 power
  
  return { score, target: targetScore, balanced: Math.abs(score - targetScore) < 2 };
}
```

### Cibles de Balance

| Coût | Power Cible | Exemple |
|------|-------------|---------|
| 0 | 0-2 | Défausse, pioche 1 |
| 1 | 5-7 | 6 dégâts OU 5 armure + pioche 1 |
| 2 | 10-12 | 10 dégâts OU 8 armure + effet |
| 3 | 15-17 | 15 dégâts OU 12 armure + buff |
| 4 | 20-22 | 20 dégâts OU invocation |
| 5 | 25-28 | 25 dégâts OU invocation puissante |

## 📦 Structure DB

```sql
-- Définitions de cartes (catalogue)
CREATE TABLE card_definitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_fr VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  
  type ENUM('attack', 'defense', 'skill', 'summon', 'passive') NOT NULL,
  stat_type ENUM('taijutsu', 'ninjutsu', 'genjutsu', 'medicine'),
  element VARCHAR(20),
  rarity ENUM('common', 'rare', 'legendary', 'mythic') NOT NULL,
  
  base_cost INT NOT NULL,
  base_damage INT DEFAULT 0,
  base_block INT DEFAULT 0,
  base_heal INT DEFAULT 0,
  
  effects_json JSON,
  summon_json JSON,
  
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  lore_fr TEXT,
  lore_en TEXT,
  
  upgradable BOOLEAN DEFAULT TRUE,
  upgrade_bonuses_json JSON,
  
  image_url VARCHAR(255),
  artist VARCHAR(100) DEFAULT 'Generated',
  
  season_introduced INT,
  is_exclusive BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_rarity (rarity),
  INDEX idx_type (type),
  INDEX idx_element (element)
);

-- Collection du joueur
CREATE TABLE user_card_collection (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  card_definition_id INT NOT NULL,
  
  upgrade_level INT DEFAULT 0,
  is_upgraded BOOLEAN DEFAULT FALSE,
  upgraded_at TIMESTAMP NULL,
  
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  obtained_source ENUM('mission', 'booster', 'craft', 'battle_pass', 'event') NOT NULL,
  
  times_played INT DEFAULT 0,
  total_damage_dealt INT DEFAULT 0,
  total_block_gained INT DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_definition_id) REFERENCES card_definitions(id),
  
  UNIQUE KEY uk_user_card (user_id, card_definition_id),
  INDEX idx_user (user_id),
  INDEX idx_upgraded (is_upgraded)
);

-- Decks du joueur
CREATE TABLE user_decks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  
  is_active BOOLEAN DEFAULT FALSE,
  archetype ENUM('aggro', 'control', 'combo', 'midrange') DEFAULT 'midrange',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active)
);

-- Cartes dans un deck
CREATE TABLE user_deck_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deck_id INT NOT NULL,
  user_card_collection_id INT NOT NULL,
  
  position INT,  -- Ordre dans le deck (optionnel)
  
  FOREIGN KEY (deck_id) REFERENCES user_decks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_card_collection_id) REFERENCES user_card_collection(id) ON DELETE CASCADE,
  
  UNIQUE KEY uk_deck_card (deck_id, user_card_collection_id)
);
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2026
