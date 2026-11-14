# 📅 Battle Pass — Système de Saison

## 🎯 Concept

Le **Battle Pass** est un système de progression saisonnière (2 mois) avec deux pistes parallèles :
- **Piste Gratuite** : Accessible à tous
- **Piste Premium** : Débloquée avec 5€ (ou 500 Kage Coins)

**Inspiration** : Fortnite, Apex Legends, Genshin Impact

## 📊 Structure d'une Saison

### Informations Saison

```javascript
{
  season_number: 1,
  name: "Saison 1 : L'Éveil des Ombres",
  theme: "shadow_clan",  // Thème narratif
  start_date: "2026-12-01",
  end_date: "2027-02-01",
  duration_days: 62,
  
  max_level: 50,         // Niveaux du pass
  xp_per_level: 1000,    // XP nécessaire par niveau
  
  free_track: { /* récompenses */ },
  premium_track: { /* récompenses */ }
}
```

### Niveaux et XP

**Progression** :
- 50 niveaux par saison
- 1000 XP par niveau (progressif : +50 XP tous les 10 niveaux)
- XP gagné via :
  - ✅ Missions complétées (100-500 XP selon rang)
  - ✅ Combats gagnés (50 XP)
  - ✅ Quêtes journalières (200 XP × 3/jour)
  - ✅ Quêtes hebdomadaires (1000 XP × 3/semaine)

**Temps pour compléter** :
- ~40-50h de jeu par saison (casual friendly)
- ~1h/jour pendant 2 mois
- Rattrapage possible en fin de saison

## 🎁 Récompenses

### Piste Gratuite (Tous les joueurs)

| Niveau | Récompense | Description |
|--------|------------|-------------|
| 1 | 🎴 1 Carte Rare | Carte de la saison |
| 2 | 💰 500 Ryos | Monnaie |
| 3 | ✨ 50 Dust | Crafting |
| 5 | 🎴 Booster Standard | 5 cartes |
| 10 | 🎴 1 Carte Légendaire | Carte signature saison |
| 15 | 💰 1000 Ryos | |
| 20 | 🎴 1 Carte Rare exclusive | Ne reviendra plus |
| 25 | 🔮 5 Essence | Craft rare |
| 30 | 🎴 Booster Premium | 5 cartes dont 1 rare garantie |
| 40 | 🎴 1 Carte Légendaire exclusive | Unique saison |
| 50 | 🎨 Avatar exclusif | Cosmétique gratuit |

**Total gratuit** :
- 3 Cartes Légendaires
- 3 Cartes Rares
- 3 Boosters
- 3000 Ryos
- 200 Dust
- 15 Essence
- 1 Avatar

### Piste Premium (+5€)

| Niveau | Récompense | Description |
|--------|------------|-------------|
| 1 | 🎴 2 Cartes Rares | Bonus immédiat |
| 1 | 🎨 Dos de carte exclusif | Cosmétique |
| 5 | 🎴 Booster Premium | |
| 10 | 🎴 2 Cartes Légendaires | Dont 1 exclusive saison |
| 10 | 💎 100 Kage Coins | Monnaie premium |
| 15 | 🎨 Avatar animé | Cosmétique rare |
| 20 | 🎴 Booster Légendaire | 3 cartes dont 1 légendaire garantie |
| 25 | 🔮 20 Essence | |
| 30 | 🎴 3 Cartes Légendaires | |
| 30 | 🎨 Emote exclusif | Animation combat |
| 40 | 💎 200 Kage Coins | |
| 50 | 🎴 Carte Mythique | Rareté au-dessus de Légendaire |
| 50 | 🎨 Effet de carte premium | Particules dorées |

**Total premium (en plus du gratuit)** :
- 1 Carte Mythique
- 6 Cartes Légendaires supplémentaires
- 4 Cartes Rares supplémentaires
- 3 Boosters supplémentaires
- 300 Kage Coins (rentabilisé !)
- 5 Cosmétiques exclusifs
- +20% XP pendant toute la saison

## 📋 Quêtes Saisonnières

### Quêtes Journalières (3/jour)

**Renouvellement** : Tous les jours à 00h UTC

**Exemples** :
- ✅ Gagner 3 combats (200 XP)
- ✅ Jouer 20 cartes (200 XP)
- ✅ Infliger 500 dégâts (200 XP)
- ✅ Ouvrir 1 booster (200 XP)
- ✅ Améliorer 1 carte (200 XP)

**Durée** : 24h (si manquée, perdue)

### Quêtes Hebdomadaires (3/semaine)

**Renouvellement** : Tous les lundis à 00h UTC

**Exemples** :
- 🎯 Compléter 5 missions de rang B ou plus (1000 XP)
- 🎯 Battre 2 boss différents (1000 XP)
- 🎯 Gagner 15 combats (1000 XP)
- 🎯 Collecter 10 nouvelles cartes (1000 XP)
- 🎯 Infliger 5000 dégâts avec l'élément Katon (1000 XP)

**Durée** : 7 jours (cumule si non faites)

### Quêtes de Saison (Milestones)

**Objectifs long terme** (récompenses bonus)

**Exemples** :
- 🏆 Compléter 50 missions (5000 XP + Booster Légendaire)
- 🏆 Gagner 100 combats (5000 XP + 1000 Ryos)
- 🏆 Collectionner 50 cartes cette saison (5000 XP + Carte exclusive)
- 🏆 Améliorer 20 cartes (5000 XP + 100 Essence)

## 🎨 Cosmétiques Exclusifs

### Avatars

**Gratuits (Piste Gratuite)** :
- Avatar basique (niveau 50)

**Premium (Piste Premium)** :
- Avatar animé (niveau 15)
- Avatar avec effets de particules (niveau 30)
- Avatar légendaire de la saison (niveau 50)

### Dos de Cartes

**Thème saison** : Chaque saison a un dos de carte unique

**Exemples** :
- Saison 1 : "Dos Ombres Ancestrales" (motif d'ombres dansantes)
- Saison 2 : "Dos Flammes Éternelles" (flammes animées)
- Saison 3 : "Dos Glace Cristalline" (cristaux de glace)

### Emotes (Réactions en combat)

**Premium uniquement** :

Exemples :
- 👍 "Bien joué"
- 🤔 "Hmmm..."
- 😱 "Oh non !"
- 😎 "Trop facile"
- 🔥 "En feu !"

### Effets Visuels de Cartes

**Niveau 50 Premium** : Toutes les cartes ont des particules dorées/holographiques

## 🏆 Récompenses Spéciales

### Cartes Exclusives Saison

**Système** : Certaines cartes ne sont obtenues QUE via le Battle Pass de leur saison

**Après la saison** :
- ❌ Ne reviennent JAMAIS dans les boosters
- ✅ Mais peuvent être craftées avec beaucoup de ressources (5000 Dust)

**Raison** : Sensation d'exclusivité, FOMO (Fear Of Missing Out)

### Carte Mythique (Niveau 50 Premium)

**Rareté au-dessus de Légendaire**

**Caractéristiques** :
- Effet visuel unique (particules spéciales)
- Puissance légèrement supérieure aux légendaires
- Lore exclusive de la saison
- Animation de jeu unique

**Exemple Saison 1** :
```javascript
{
  name: "Maître des Ombres Ancestrales",
  rarity: "mythic",
  type: "passive",
  effect: "Au début de votre tour, créez une copie d'une carte aléatoire de votre main (coût -1).",
  visual: "particules d'ombres violettes",
  obtain: "Battle Pass Saison 1 - Niveau 50 Premium"
}
```

## 💎 Achat et Monétisation

### Prix du Battle Pass

**Standard** :
- 5€ (ou 500 Kage Coins)
- Piste premium complète
- +20% XP pendant la saison

**Bundle Premium** (10€) :
- Piste premium
- +25 niveaux instantanés
- Cosmétique exclusif bonus
- +50% XP

### Achat de Niveaux

**Si le joueur n'a pas le temps** :
- 150 Kage Coins par niveau (~1.50€)
- Max 20 niveaux achetables
- Débloqué uniquement après niveau 30 (anti-P2W précoce)

### Kage Coins (Monnaie Premium)

**Bundles** (catalogue `/shop` onglet Monnaie — noms originaux) :
- 💎 Éclat de Chakra — 100 coins = 1€
- 💎 Braise du Village — 500 coins = 5€ (bonus : +50 coins)
- 💎 Forge des Ombres — 1000 coins = 10€ (bonus : +150 coins)
- 💎 Coffre du Kage — 5000 coins = 50€ (bonus : +1000 coins)

Achat : Stripe Checkout via `POST /api/shop/coin-packs/:id/purchase` (`method=stripe`) quand `STRIPE_SECRET_KEY` est défini — voir [STRIPE_V2.md](./STRIPE_V2.md). Stub admin/dev (`SHOP_COIN_STUB=true`) conservé en fallback.

**Utilisations** :
- Battle Pass (500 coins) — aussi depuis l’onglet Battle Pass du `/shop` (`POST /api/shop/battle-pass/unlock`)
- Boosters Premium (100 coins)
- Cosmétiques boutique (Ryos et/ou coins)
- Niveaux de Battle Pass (150 coins/niveau)

## 📊 Structure Base de Données

```sql
-- Table : Saisons
CREATE TABLE battle_pass_seasons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  season_number INT UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  theme VARCHAR(50),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  max_level INT DEFAULT 50,
  base_xp_per_level INT DEFAULT 1000,
  is_active BOOLEAN DEFAULT FALSE,
  rewards_json JSON NOT NULL  -- Structure des récompenses
);

-- Table : Progression joueur
CREATE TABLE user_battle_pass (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  season_id INT NOT NULL,
  current_level INT DEFAULT 0,
  current_xp INT DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_purchased_at TIMESTAMP NULL,
  
  -- Récompenses réclamées
  claimed_rewards_json JSON DEFAULT '{"free":[],"premium":[]}',
  
  -- Stats saison
  missions_completed INT DEFAULT 0,
  combats_won INT DEFAULT 0,
  cards_obtained INT DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES battle_pass_seasons(id),
  UNIQUE KEY uk_user_season (user_id, season_id)
);

-- Table : Quêtes journalières/hebdomadaires
CREATE TABLE battle_pass_quests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  season_id INT NOT NULL,
  quest_type ENUM('daily', 'weekly', 'milestone') NOT NULL,
  quest_key VARCHAR(100) NOT NULL,  -- 'win_3_combats'
  
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  
  goal_value INT NOT NULL,          -- Objectif (ex: 3 combats)
  xp_reward INT NOT NULL,           -- XP donnée
  bonus_reward_json JSON,           -- Récompenses bonus
  
  -- Disponibilité
  available_from TIMESTAMP NOT NULL,
  available_until TIMESTAMP NOT NULL,
  
  FOREIGN KEY (season_id) REFERENCES battle_pass_seasons(id)
);

-- Table : Progression quêtes joueur
CREATE TABLE user_battle_pass_quests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  quest_id INT NOT NULL,
  
  current_progress INT DEFAULT 0,   -- Progression actuelle
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  is_claimed BOOLEAN DEFAULT FALSE, -- Récompense réclamée
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_id) REFERENCES battle_pass_quests(id),
  UNIQUE KEY uk_user_quest (user_id, quest_id)
);

-- Table : Cosmétiques débloqués
CREATE TABLE user_cosmetics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  cosmetic_type ENUM('avatar', 'card_back', 'emote', 'card_effect') NOT NULL,
  cosmetic_key VARCHAR(100) NOT NULL,
  season_obtained INT,
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season_obtained) REFERENCES battle_pass_seasons(id),
  UNIQUE KEY uk_user_cosmetic (user_id, cosmetic_type, cosmetic_key)
);
```

## 🔄 Cycle de Saison

### Avant le Lancement (J-7)

1. **Teaser** : Annonce thème et cartes exclusives
2. **Prévente** : Battle Pass disponible à l'achat anticipé (-10%)

### Lancement (Jour 1)

1. **Activation** : Saison démarre automatiquement
2. **Notification** : Tous les joueurs reçoivent popup explicative
3. **Quêtes** : Premières quêtes journalières disponibles

### Mi-Saison (J+30)

1. **Événement** : Boss spécial avec double XP
2. **Rattrapage** : Quêtes bonus pour joueurs en retard
3. **Teaser Saison 2** : Premiers aperçus

### Fin de Saison (J+60)

1. **Double XP** : Dernière semaine (J-7)
2. **Avertissement** : Notifications de fin imminente
3. **Réclamation** : Tous les niveaux atteints doivent être réclamés

### Transition (J+62)

1. **Clôture** : Saison N fermée
2. **Bilan** : Mail avec statistiques personnelles
3. **Nouvelle Saison** : Saison N+1 démarre (ou pause de 1 semaine)

## 📈 Métriques de Succès

### KPI à surveiller

**Engagement** :
- % de joueurs actifs participant au Battle Pass
- Temps moyen pour atteindre niveau 50
- Taux de complétion des quêtes journalières

**Monétisation** :
- Taux de conversion gratuit → premium (objectif : >5%)
- Revenue par saison
- Taux d'achat de niveaux (doit rester faible <10%)

**Rétention** :
- Joueurs revenant chaque jour pour quêtes
- Rétention saison complète (objectif : >30%)
- Taux de ré-achat saison suivante (objectif : >60%)

## 🎯 Objectifs Business

**Saison 1 (objectifs modestes)** :
- 1000 joueurs actifs
- 5% de conversion premium (50 achats = 250€)
- Taux de complétion niveau 50 : 40%

**Saison 2-3 (croissance)** :
- 5000 joueurs actifs
- 8% de conversion premium (400 achats = 2000€)
- Fidélisation 60% des acheteurs S1

**Long Terme (12 mois)** :
- 20 000+ joueurs actifs
- 10%+ conversion premium
- Revenue récurrent ~5000€/mois

## 🛠️ Implémentation Technique

### Service Backend

```javascript
// backend/src/services/battlePassService.js

export async function addBattlePassXP(userId, xpAmount, source) {
  const season = await getActiveSeason();
  const userPass = await getUserBattlePass(userId, season.id);
  
  // Bonus XP premium
  const multiplier = userPass.is_premium ? 1.2 : 1.0;
  const finalXP = Math.floor(xpAmount * multiplier);
  
  let newXP = userPass.current_xp + finalXP;
  let newLevel = userPass.current_level;
  
  // Level up ?
  while (newXP >= getXPForLevel(newLevel + 1) && newLevel < season.max_level) {
    newXP -= getXPForLevel(newLevel + 1);
    newLevel++;
  }
  
  await query(
    'UPDATE user_battle_pass SET current_level = ?, current_xp = ? WHERE user_id = ? AND season_id = ?',
    [newLevel, newXP, userId, season.id]
  );
  
  return { newLevel, newXP, xpGained: finalXP };
}

export async function claimReward(userId, level, trackType) {
  // trackType: 'free' ou 'premium'
  const season = await getActiveSeason();
  const userPass = await getUserBattlePass(userId, season.id);
  
  if (trackType === 'premium' && !userPass.is_premium) {
    throw new Error('Premium Battle Pass required');
  }
  
  if (userPass.current_level < level) {
    throw new Error('Level not reached yet');
  }
  
  const rewards = JSON.parse(season.rewards_json);
  const reward = rewards[trackType][level];
  
  // Vérifier si déjà réclamé
  const claimed = JSON.parse(userPass.claimed_rewards_json);
  if (claimed[trackType].includes(level)) {
    throw new Error('Already claimed');
  }
  
  // Donner la récompense
  await grantReward(userId, reward);
  
  // Marquer comme réclamé
  claimed[trackType].push(level);
  await query(
    'UPDATE user_battle_pass SET claimed_rewards_json = ? WHERE id = ?',
    [JSON.stringify(claimed), userPass.id]
  );
  
  return { reward };
}
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2026
