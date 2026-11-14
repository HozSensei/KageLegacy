# ⚔️ Système de Combat

## 🎯 Vue d'Ensemble

Le combat dans **Shinobi Ascension** est un système de **deck-building tactique** tour par tour inspiré de **Slay the Spire**. Le joueur gère une main de cartes, du Chakra (énergie), et doit anticiper les intentions de l'ennemi.

## 📊 Stats du Personnage

### Comment les Stats Affectent le Combat

**Stats** proviennent de 2 sources :
1. **Arbre de Talents** (100 points au niveau 100)
2. **Cartes dans le deck** (bonus passifs)

**Formule générale** :
```javascript
Stat_Finale = Talent_Bonus + Deck_Passive_Bonus + Buffs_Temporaires
```

**Exemple** :
```
Taijutsu = 75 (talents) + 45 (cartes) + 10 (buff Force) = 130 Taijutsu
```

---

### 📈 Formules de Scaling des Cartes

Les **stats du personnage boostent les cartes** selon leur `stat_type` :

#### 1. Cartes d'Attaque (Taijutsu / Ninjutsu / Genjutsu)

```javascript
Dégâts_Finaux = Dégâts_Base × (1 + Stat / 100)
```

**Exemple** : Carte "Poing rapide" (6 dégâts, Taijutsu)
- Sans stats : 6 dégâts
- Avec 50 Taijutsu : 6 × 1.5 = **9 dégâts**
- Avec 100 Taijutsu : 6 × 2 = **12 dégâts**
- Avec 200 Taijutsu : 6 × 3 = **18 dégâts**

#### 2. Cartes de Défense (Médecine)

```javascript
Armure_Finale = Armure_Base × (1 + Medicine / 100)
```

**Exemple** : Carte "Garde" (5 armure, Médecine)
- Sans stats : 5 armure
- Avec 100 Médecine : 5 × 2 = **10 armure**

#### 3. Cartes de Soin (Médecine)

```javascript
Soin_Final = Soin_Base × (1 + Medicine / 100)
```

**Exemple** : Carte "Soin de combat" (8 PV, Médecine)
- Sans stats : 8 PV
- Avec 150 Médecine : 8 × 2.5 = **20 PV**

#### 4. Stats Secondaires

| Stat | Effet |
|------|-------|
| **Vitesse** | +1% chance de critique par 10 Vitesse (max 50%) |
| **Intelligence** | +1% chance de proc d'effets spéciaux par 10 Int |
| **Dextérité** | Réduit coût Chakra des cartes 0-1 coût (rare) |

**Critique** :
```javascript
Dégâts_Crit = Dégâts_Finaux × 1.5
Chance_Crit = min(50, Vitesse / 10) + Buffs
```

**Exemple** : 100 Vitesse → 10% crit chance

---

## 🎴 Ressources du Combat

### 1. Chakra (Énergie)

**Mécanique** :
- 🔷 **3 Chakra par tour** (réinitialisation complète)
- 🔷 Peut être augmenté avec certaines reliques (+1 max)
- 🔷 Action spéciale : Défausser 1 carte = +1 Chakra (1 fois/tour)

**Variante avancée** (pour plus tard) :
- Chakra persistant (ne se réinitialise pas)
- Maximum : 10 Chakra
- Permet des combos explosifs

### 2. Points de Vie (PV)

**Mécanique** :
- ❤️ Ne régénèrent PAS entre les combats (sauf objets/repos)
- ❤️ Mort = Échec de la mission
- ❤️ PV max augmentent avec le niveau du personnage

> **Implémenté** : les missions deck-combat sont des **parcours** (`docs/MISSION_RUNS.md`) — 3–5 combats enchaînés, événements entre combats (Sanctuaire de Mousse, Cache d’Éclaireur, Colporteur d’Ombre, Carrefour du Voile), PV/scrap persistants, récompenses en fin de run.

**Formule** :
```
PV_max = 100 + bonus_from_talent_nodes + bonus_from_cards
```

**Exemple** :
```
PV_max = 100 (base)
       + 50 (nœuds de talents avec +PV)
       + 20 (cartes avec bonus passif +PV)
       = 170 PV max
```

### 3. Armure (Block)

**Mécanique** :
- 🛡️ Absorbe les dégâts avant les PV
- 🛡️ **Disparaît à la fin du tour** (temporaire)
- 🛡️ Certaines reliques la rendent persistante

**Formule des dégâts** :
```
Dégâts réels = max(0, Dégâts bruts - Armure)
Armure restante = max(0, Armure - Dégâts bruts)
```

## 🔄 Déroulement d'un Tour

### Phase 1 : Début du Tour Joueur

```
1. ✅ Réinitialise Chakra à 3 (ou max)
2. ✅ Pioche 5 cartes (ou jusqu'à main max de 10)
3. ✅ Résout effets "Début de tour"
   - Régénération (soigne X PV)
   - Poison (perd X PV)
   - Brûlure (perd X PV en fin de tour)
   - Buffs/Debuffs décrémentent
4. ✅ Allié invoqué attaque automatiquement
5. ✅ Révèle l'intention de l'ennemi
```

### Phase 2 : Actions du Joueur

**Le joueur peut faire (dans n'importe quel ordre)** :

1. **Jouer des cartes** (coût en Chakra)
   - Cliquer sur une carte de la main
   - Cible (soi-même ou ennemi selon la carte)
   - Effet résolu immédiatement

2. **Défausser 1 carte pour +1 Chakra** (1 fois/tour)
   - Bouton spécial sous la main
   - Permet de "mana ramp"

3. **Terminer le tour**
   - Bouton "Fin du tour"
   - Passe à la phase 3

**Limite main** : Max 10 cartes. Si pioche > 10, défausser.

### Phase 3 : Tour de l'Ennemi

```
1. ✅ Exécute l'intention annoncée
   - 🗡️ Attaque : Inflige X dégâts
   - 🛡️ Défense : Gagne X Armure
   - 💀 Spécial : Capacité unique
   - ⚡ Combo : Attaque multiple
   
2. ✅ Résout ses effets de statut
   - Poison, Brûlure, etc.
   
3. ✅ Prépare sa prochaine intention (affichée)

4. ✅ Passe au tour suivant (retour Phase 1)
```

### Conditions de Victoire/Défaite

**Victoire** : PV de l'ennemi à 0  
**Défaite** : PV du joueur à 0

## 🎯 Système d'Intentions

**Concept** : L'ennemi annonce son action du prochain tour

### Types d'Intentions

| Icône | Type | Description | Couleur |
|-------|------|-------------|---------|
| 🗡️ | Attaque | Va infliger X dégâts | Rouge |
| 🛡️ | Défense | Va gagner X Armure | Bleu |
| 💪 | Buff | Va augmenter ses stats | Vert |
| ☠️ | Débuff | Va appliquer Poison/Faiblesse | Violet |
| ⚡ | Combo | Attaque X fois pour Y dégâts | Rouge vif |
| ❓ | Inconnu | ??? (boss uniquement) | Gris |

### Affichage UI

```
┌────────────────────────────┐
│  🥷 ENNEMI : Chunin Élite  │
│  ❤️ 85/120   🛡️ 12        │
│                            │
│  Prochaine action :        │
│  🗡️ Attaque : 18 dégâts   │
└────────────────────────────┘
```

**Avantage tactique** :
- Le joueur peut préparer sa défense
- Anticiper et bloquer l'attaque
- Débuffer l'ennemi avant qu'il attaque

## 🃏 Types de Cartes

### 1. Cartes d'Attaque (70% du deck)

**Fonction** : Infliger des dégâts à l'ennemi

**Exemple** :
```javascript
{
  name: "Poing du dragon",
  type: "attack",
  cost: 1,
  damage: 8,
  stat_type: "taijutsu",
  effect: { type: 'draw', value: 1 },
  description: "Inflige 8 dégâts. Piochez 1 carte."
}
```

**Variantes** :
- **Attaque simple** : Dégâts directs
- **Multi-frappe** : Attaque X fois pour Y dégâts
- **AOE** : Attaque tous les ennemis (si plusieurs)
- **Conditionnelle** : Bonus si ennemi a débuff

### 2. Cartes de Défense (15% du deck)

**Fonction** : Gagner de l'Armure, esquiver, réduire dégâts

**Exemple** :
```javascript
{
  name: "Substitution (Kawarimi)",
  type: "defense",
  cost: 1,
  block: 8,
  effect: { type: 'evade_next', chance: 50 },
  description: "Gagne 8 Armure. 50% d'esquiver la prochaine attaque."
}
```

**Variantes** :
- **Block** : Armure temporaire
- **Évitement** : % d'esquiver
- **Réduction** : -X% dégâts reçus ce tour
- **Riposte** : Armure + Contre-attaque

### 3. Cartes de Soutien (10% du deck)

**Fonction** : Soins, buffs, pioche, manipulation deck

**Exemple** :
```javascript
{
  name: "Paume mystique",
  type: "skill",
  cost: 2,
  heal: 15,
  effect: { type: 'apply_status', target: 'self', status: 'regen', value: 5, duration: 3 },
  description: "Soigne 15 PV. Régénère 5 PV/tour pendant 3 tours."
}
```

**Variantes** :
- **Soin** : Restaure PV
- **Buff** : +Force, +Dextérité
- **Pioche** : +X cartes
- **Manipulation** : Exile, retour en main, coût réduit

### 4. Cartes Allié (5% du deck)

**Fonction** : Invoquer un allié qui reste en jeu

**Exemple** :
```javascript
{
  name: "Invoquer clone de combat",
  type: "summon",
  cost: 3,
  summon: {
    name: "Clone",
    hp: 20,
    attack: 6,
    ability: "Taunt : Absorbe les attaques à votre place"
  },
  description: "Invoque un Clone (20 PV, 6 ATK, Taunt)."
}
```

**Mécanique** :
- L'allié reste en jeu jusqu'à destruction
- Attaque automatiquement chaque tour
- Peut avoir Taunt (absorbe les dégâts)
- **Limite : 1 seul allié à la fois**

### 5. Cartes Passives (Traits Héréditaires)

**Fonction** : Effets permanents pendant tout le combat

**Exemple** :
```javascript
{
  name: "Oeil de Kagemori",
  type: "passive",
  cost: 0,
  permanent: true,
  effect: { type: 'reveal_intent', turns_ahead: 1 },
  description: "Passif : Révèle toujours l'intention de l'ennemi."
}
```

**Mécanique** :
- Ne se pioche PAS (toujours actif)
- Consomme 1-2 slots du deck (trade-off)
- Maximum 2 passifs par deck

## 🎲 Triangle Tactique

**Hérité du système existant** : Tai > Gen > Nin > Tai

```
    TAIJUTSU
   (Corps à corps)
    ↗️         ↖️
   💪           👊
  ↙️             ↘️
GENJUTSU ←→→→ NINJUTSU
(Illusions)   (Techniques)
```

**Bonus** : +20% dégâts si avantage de type (×**1.2**)

> Implémentation : pas de malus réciproque sur la triade — hors avantage = ×1.
> Code : `backend/src/services/deckCombat/typeAdvantage.js` (`getTypeAdvantage`).
> Tests : `npm run test:type-advantage` · voir aussi [COMBAT_BALANCE_TESTS.md](./COMBAT_BALANCE_TESTS.md).

**Exemple** :
```
Joueur joue "Poing du dragon" (Taijutsu, 10 dégâts)
Ennemi a posture Genjutsu
→ Taijutsu bat Genjutsu : 10 × 1.2 = 12 dégâts
```

**Médecine** : Neutre (ni avantage ni désavantage)

## 🌊 Système d'Éléments

### 5 Éléments (Folklore Ninja)

```
KATON (Feu) 🔥
  ↓ bat
FUTON (Vent) 🌪️
  ↓ bat
RAITON (Foudre) ⚡
  ↓ bat
DOTON (Terre) 🪨
  ↓ bat
SUITON (Eau) 💧
  ↓ bat (retour au début)
KATON (Feu) 🔥
```

### Multiplicateurs

- **Avantage** : ×1.5 dégâts
- **Désavantage** : ×0.7 dégâts
- **Neutre** : ×1.0

> Code : `getElementAdvantage` / `elementMultiplier` dans `typeAdvantage.js`.
> Appliqué dans `computeCardDamage` (cartes d’attaque) avec la triade.

**Exemple** :
```
Joueur : "Boule de feu" (Katon, 10 dégâts)
Ennemi : Affinité Futon
→ Katon bat Futon : 10 × 1.5 = 15 dégâts
```

## 🎭 Système de Statuts

### Statuts Positifs (Buffs)

| Statut | Effet | Icône | Durée |
|--------|-------|-------|-------|
| **Force** | +X dégâts d'attaque | 💪 | X tours |
| **Dextérité** | +X Armure gagnée | 🛡️ | X tours |
| **Régénération** | +X PV début de tour | 💚 | X tours |
| **Intangible** | Attaques = 1 dégât | 👻 | 1 tour |
| **Rituel** | +X Force permanent | 🔮 | Permanent |
| **Vitesse** | Pioche +X cartes | ⚡ | X tours |

### Statuts Négatifs (Debuffs)

| Statut | Effet | Icône | Durée |
|--------|-------|-------|-------|
| **Poison** | -X PV début de tour | ☠️ | X tours |
| **Brûlure** | -X PV fin de tour | 🔥 | X tours |
| **Faiblesse** | -25% dégâts infligés | 🥀 | X tours |
| **Vulnérable** | +50% dégâts reçus | 💔 | X tours |
| **Paralysie** | Perd 1 tour | ⚡ | 1 tour |
| **Confusion** | Cartes coûtent +1 | 🌀 | X tours |

### Mécanique de Stack

**Cumul** : Les statuts s'empilent

**Exemple** :
```
Tour 1 : Applique Poison 5 (3 tours)
Tour 2 : Applique Poison 3 (2 tours)
→ Ennemi a Poison 8 (durée = plus longue)

Début Tour 3 : Perd 8 PV, Poison → 5 (2 tours restants)
Début Tour 4 : Perd 5 PV, Poison → 3 (1 tour)
Début Tour 5 : Perd 3 PV, Poison → 0 (expiré)
```

## 🤖 IA Ennemie

### Patterns d'IA (3 niveaux)

#### 1. Mobs Basiques (Random Pondéré)

```javascript
{
  name: "Bandit rônin",
  hp: 40,
  armor: 0,
  patterns: [
    { weight: 60, action: "attack", damage: 8 },
    { weight: 30, action: "defend", block: 10 },
    { weight: 10, action: "buff", status: "force", value: 2 }
  ]
}
```

**Chaque tour** : Tire une action aléatoire selon les poids

#### 2. Élites (Pattern Fixe)

```javascript
{
  name: "Chunin de Suna",
  hp: 80,
  pattern: [
    { action: "attack", damage: 12 },
    { action: "attack", damage: 12 },
    { action: "defend", block: 15 },
    // Boucle
  ],
  currentTurn: 0
}
```

**Prédictible** : Le joueur peut anticiper

#### 3. Boss (Phases + Mécaniques)

```javascript
{
  name: "Gaara du Désert",
  hp: 280,
  phases: [
    {
      hp_threshold: 100,  // HP > 100 (Phase 1)
      pattern: [
        { action: "defend", block: 20 },
        { action: "attack", damage: 15, hits: 2 },
        { action: "summon", minion: "Sable protecteur" }
      ]
    },
    {
      hp_threshold: 50,   // HP < 50% (Phase 2 - Enragé)
      on_enter: { 
        action: "special", 
        effect: "full_heal_armor",
        message: "Gaara se transforme !" 
      },
      pattern: [
        { action: "heavy_attack", damage: 28 },
        { action: "debuff_all", status: "vulnerable", duration: 2 },
        { action: "ultimate", damage: 40, block: 30 }
      ]
    }
  ],
  
  passives: [
    {
      trigger: "on_damage_taken",
      effect: "gain_armor",
      value: 5,
      description: "Gagne 5 Armure à chaque attaque reçue (Sable)"
    }
  ]
}
```

**Phases** : Comportement change selon HP  
**Passives** : Capacités toujours actives  
**Changement de phase** : Effet spécial (animation, dialogue)

## 🏆 Synergies et Combos

### Exemple 1 : Deck Poison

**Stratégie** : Empiler du Poison, survivre

**Cartes clés** :
- "Aiguille empoisonnée" (1 Chakra, 4 dégâts + Poison 5)
- "Amplifier poison" (2 Chakra, double le Poison)
- "Catalyseur" (2 Chakra, déclenche tout le Poison immédiatement)
- "Substitution" (1 Chakra, 8 Armure + Évitement 50%)

**Combo** :
```
Tour 1 : Aiguille × 2 (Poison 10)
Tour 2 : Amplifier poison (Poison 20)
Tour 3 : Catalyseur (20 dégâts instantanés !)
```

### Exemple 2 : Deck Taijutsu Blitz

**Stratégie** : Cartes low-cost, burst rapide

**Cartes clés** :
- "Combo rapide" (0 Chakra, 3 dégâts + Pioche 1)
- "Coup de poing" (1 Chakra, 6 dégâts)
- "8 Portes (1ère)" (3 Chakra, +5 Force pendant 3 tours)
- "Lotus avant" (2 Chakra, 14 dégâts, Exhaust)

**Combo** :
```
Tour 1 : 8 Portes (+5 Force)
Tour 2 : Combo × 3 + Poing × 2 = Énorme burst
```

### Exemple 3 : Deck Tank Médical

**Stratégie** : Soigner, tanker, épuiser

**Cartes clés** :
- "Mur Doton" (2 Chakra, 15 Armure)
- "Paume mystique" (2 Chakra, 12 Soins + Regen 5)
- "Riposte" (1 Chakra, 6 Armure + Contre 8 dégâts)
- "Régénération cellulaire" (3 Chakra, Regen 8 pendant 5 tours)

**Combo** :
```
Tour 1 : Régénération cellulaire (Regen 8 × 5 = 40 PV)
Tous les tours : Mur + Riposte (tank + damage)
```

## 🎨 Interface de Combat

### Layout Principal

```
┌──────────────────────────────────────────────┐
│  🎯 MISSION : Boss Chunin                    │
│  Difficulté : ★★★☆☆                         │
└──────────────────────────────────────────────┘

ENNEMI : Chunin Élite [Boss]
❤️ 85/120    🛡️ 12 Armure
[Statuts] 🔥 Brûlure (3)  💪 Force +2 (1)

        ╔═══════════════════════════╗
        ║  🥷 CHUNIN ÉLITE          ║
        ║  Intention : 🗡️ 18 dégâts ║
        ╚═══════════════════════════╝

──────────────────────────────────────────────

VOUS : Aiko Kagemori [Genin Niv.12]
❤️ 68/100    🔷 Chakra : 2/3    🎴 Pioche : 8

[Statuts] ⚡ Vitesse +2 (2)

[ALLIÉ]                     [MAIN - 5 cartes]
┌─────────────┐     ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐
│ Clone       │     │🔥│ │⚡│ │🛡️│ │👊│ │💊│
│ 12/20 PV    │     │2 │ │3 │ │1 │ │1 │ │2 │
│ ATK: 6      │     └──┘ └──┘ └──┘ └──┘ └──┘
└─────────────┘

[Actions]
[Défausser 1 carte → +1 Chakra] [Terminer le tour]
```

### Animations Importantes

1. **Carte jouée** : Vol de la main vers la cible
2. **Dégâts** : Nombres rouges qui jaillissent
3. **Armure** : Bouclier bleu qui brille
4. **Statuts** : Icônes animées au-dessus du personnage
5. **Intention** : Bulle avec icône au-dessus de l'ennemi
6. **Phase de boss** : Flash + dialogue + changement visuel

---

## Tests d’équilibrage

Simulations déterministes (seed + politique greedy) : `docs/COMBAT_BALANCE_TESTS.md`  
`npm run test:combat-balance` / `npm run test:combat-balance:report`

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2026
