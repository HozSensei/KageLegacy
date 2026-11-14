# 🗺️ Roadmap d'Implémentation

## 🎯 Vue d'Ensemble

Ce document détaille la roadmap complète pour transformer **Kage Legacy** en **Shinobi Ascension**, un jeu de deck-building roguelike.

**Durée estimée totale** : 3-4 mois pour le MVP

## 📅 Phases de Développement

### 🟢 Phase 0 : Préparation (Semaine 1)

**Objectif** : Préparer l'environnement et la base de code

#### Actions
- [x] Documenter le projet (PROJECT_VISION.md, etc.)
- [ ] Créer branche `shinobi-ascension` depuis `main`
- [ ] Nettoyer le code legacy inutilisé
- [ ] Configurer ESLint/Prettier pour le nouveau code
- [ ] Créer structure de dossiers (`services/`, `components/`, etc.)

#### Livrables
- Documentation complète dans `/docs`
- Environnement de dev propre
- Structure de projet définie

---

### 🟡 Phase 1 : Personnage Unique (Semaines 2-3)

**Objectif** : Le joueur incarne UN ninja au lieu d'une escouade

#### Backend

**Migrations**
```sql
-- 100_kage_legacy_v2_player.sql
CREATE TABLE player_character (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  name VARCHAR(100),
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  rank ENUM('Genin', 'Chunin', 'Jonin', 'ANBU', 'Kage') DEFAULT 'Genin',
  
  -- ⚠️ PAS de stats de base ici ! Elles viennent de l'arbre de talents + cartes
  talent_points_available INT DEFAULT 1,  -- 1 point au niveau 1
  
  clan_trait_id INT,
  element_affinity ENUM('Katon', 'Suiton', 'Raiton', 'Doton', 'Futon'),
  specialization ENUM('Taijutsu', 'Ninjutsu', 'Genjutsu', 'Medicine') NULL,
  
  avatar_url VARCHAR(255),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (clan_trait_id) REFERENCES clan_traits(id)
);

ALTER TABLE sensei
  ADD COLUMN card_dust INT DEFAULT 0,
  ADD COLUMN card_essence INT DEFAULT 0,
  ADD COLUMN kage_coins INT DEFAULT 0;
```

**Services**
- [x] `playerCharacterService.js`
  - `createCharacter(userId, { name, clan, element })`
  - `getCharacter(userId)` - Calcul des stats finales (talents + cartes)
  - `addXP(userId, amount)`
  - `levelUp(userId)` - +1 talent point, PAS de stat automatique
  - `chooseSpecialization(userId, spec)`
  - `getComputedStats(userId)` - Stats = talents + bonus passifs cartes du deck

**Routes**
- [x] `GET /api/player` - Récupérer le personnage
- [x] `GET /api/player/stats` - Stats calculées (talents + cartes)
- [x] `POST /api/player/create` - Créer le personnage (onboarding)
- [x] `POST /api/player/xp` + `POST /api/player/level-up` - Gain XP / level-up (+1 talent point)
- [x] `PUT /api/player/specialization` - Choisir spécialisation (niveau 10)

#### Frontend

**Stores**
- [x] `stores/player.js` (Pinia)
  - State : `character`, `stats`, `loading`, `error`
  - Actions : `fetchPlayer()`, `createCharacter()`, `fetchStats()`, `chooseSpecialization()`

**Composants**
- [x] `PlayerProfile.vue` - Affichage profil complet
- [x] `PlayerStats.vue` - Stats avec barres de progression
- [x] `LevelUpModal.vue` - Notification level-up (+1 talent point)

**Views**
- [x] `views/Profile.vue` - Page profil joueur
- [x] `views/CharacterCreation.vue` - Onboarding nouveau joueur

#### Tests
- [x] Test création personnage (intégration DB si MySQL dispo)
- [x] Test gain XP et level up (helpers purs + intégration)
- [x] Test choix spécialisation

---

### 🟠 Phase 2 : Système de Cartes (Semaines 4-5)

**Objectif** : Génération, collection et gestion de cartes

#### Backend

**Migrations**
```sql
-- 101_card_system.sql
-- Voir CARD_SYSTEM.md pour le schéma complet
CREATE TABLE card_definitions ...;
CREATE TABLE user_card_collection ...;
CREATE TABLE user_decks ...;
CREATE TABLE user_deck_cards ...;
```

**Services**
- [ ] `cardGeneratorService.js`
  - `generateCard(type, element, rarity)`
  - `generateCardBatch(count, filters)`
  - `seedInitialCards()` - Générer 100 cartes de base

- [ ] `cardService.js`
  - `getAllCards(filters)`
  - `getCard(cardId)`
  - `getUserCollection(userId)`
  - `grantCard(userId, cardDefId, source)`
  - `upgradeCard(userId, cardCollectionId)`
  - `disenchantCard(userId, cardCollectionId)`
  - `craftCard(userId, cardDefId)`

- [ ] `deckService.js`
  - `createDeck(userId, name, cards)`
  - `updateDeck(deckId, name, cards)`
  - `deleteDeck(deckId)`
  - `activateDeck(userId, deckId)`
  - `getDeck(deckId)`
  - `validateDeck(cards)` - Vérifier contraintes (20-30, max copies, etc.)

**Scripts**
- [ ] `scripts/generateCards.js` - Générer le catalogue initial
- [ ] `scripts/seedCards.js` - Insérer en DB

**Routes**
- [ ] `GET /api/cards` - Catalogue complet (avec filtres)
- [ ] `GET /api/cards/:id` - Détail d'une carte
- [ ] `GET /api/cards/collection` - Collection du joueur
- [ ] `POST /api/cards/upgrade/:id` - Améliorer
- [ ] `POST /api/cards/disenchant/:id` - Désenchanter
- [ ] `POST /api/cards/craft/:cardDefId` - Crafter
- [ ] CRUD `/api/decks`

#### Frontend

**Stores**
- [ ] `stores/cards.js`
  - State : `catalog`, `collection`, `filters`
  - Actions : `fetchCatalog()`, `fetchCollection()`, etc.

- [ ] `stores/deck.js`
  - State : `decks`, `activeDeck`, `deckBeingBuilt`
  - Actions : `createDeck()`, `updateDeck()`, etc.

**Composants**
- [ ] `CardDisplay.vue` - Affichage d'une carte
- [ ] `CardList.vue` - Grille de cartes avec filtres
- [ ] `CardModal.vue` - Modal détail carte (upgrade, disenchant)
- [ ] `DeckBuilder.vue` - Constructeur de deck (drag & drop)
- [ ] `DeckList.vue` - Liste des decks
- [ ] `DeckStats.vue` - Statistiques d'un deck (coût moyen, curve, etc.)

**Views**
- [ ] `views/Collection.vue` - Collection de cartes
- [ ] `views/DeckBuilder.vue` - Constructeur de deck
- [ ] `views/Forge.vue` - Amélioration de cartes

#### Tests
- [ ] Test génération de cartes (balance)
- [ ] Test collection (grant, upgrade, disenchant, craft)
- [ ] Test deck (création, validation, activation)

---

### 🔴 Phase 4 : Moteur de Combat (Semaines 8-10)

**Objectif** : Combat carte par carte fonctionnel

_(Anciennement Phase 3, décalée après Arbre de Talents)_

#### Backend

**Migrations**
```sql
-- 102_combat_system.sql
CREATE TABLE mission_definitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_fr VARCHAR(200),
  rank ENUM('D', 'C', 'B', 'A', 'S'),
  encounters_json JSON,  -- Liste des combats
  rewards_json JSON
);

CREATE TABLE combat_sessions (
  id VARCHAR(36) PRIMARY KEY,  -- UUID
  user_id INT NOT NULL,
  mission_id INT,
  
  state ENUM('in_progress', 'victory', 'defeat', 'forfeited'),
  
  player_state_json JSON,   -- PV, Chakra, hand, deck, discard, statuts
  enemy_state_json JSON,    -- PV, Armure, intention, statuts
  
  current_turn INT,
  current_phase ENUM('player_turn', 'enemy_turn', 'game_over'),
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mission_id) REFERENCES mission_definitions(id)
);

CREATE TABLE combat_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  combat_session_id VARCHAR(36),
  turn INT,
  action_type VARCHAR(50),
  action_data_json JSON,
  timestamp TIMESTAMP,
  
  FOREIGN KEY (combat_session_id) REFERENCES combat_sessions(id) ON DELETE CASCADE
);
```

**Services**
- [ ] `combatEngineService.js`
  - `startCombat(userId, missionId, deckId)`
  - `getCombatState(combatId)`
  - `playCard(combatId, cardId, targetId)`
  - `endTurn(combatId)`
  - `forfeit(combatId)`
  - **Fonctions internes** :
    - `drawCards(combat, count)`
    - `applyCardEffect(combat, card, target)`
    - `executeEnemyTurn(combat)`
    - `checkVictory(combat)`
    - `resolveStatuses(combat, side)`

- [ ] `combatAIService.js`
  - `generateEnemyFromTemplate(template, difficulty)`
  - `decideEnemyAction(enemy, player)` - IA
  - `getNextIntent(enemy, turn)` - Pattern-based

- [ ] `missionService.js` (refonte)
  - `getMissions(userId, filters)`
  - `getMission(missionId)`
  - `startMission(userId, missionId, deckId)` - Lance le premier combat
  - `completeMission(userId, missionId)` - Récompenses

**Routes**
- [ ] `POST /api/combat/start` - Démarrer combat
- [ ] `GET /api/combat/:id/state` - État actuel
- [ ] `POST /api/combat/:id/play` - Jouer une carte
- [ ] `POST /api/combat/:id/end-turn` - Fin de tour
- [ ] `POST /api/combat/:id/forfeit` - Abandonner
- [ ] `GET /api/missions` - Liste missions
- [ ] `GET /api/missions/:id` - Détail mission
- [ ] `POST /api/missions/:id/start` - Démarrer mission

#### Frontend

**Stores**
- [ ] `stores/combat.js`
  - State : `combatState`, `hand`, `player`, `enemy`, `logs`
  - Actions : `playCard()`, `endTurn()`, `updateState()`

**Composants**
- [ ] `CombatArena.vue` - Layout principal combat
- [ ] `PlayerStatus.vue` - PV, Chakra, Statuts
- [ ] `EnemyDisplay.vue` - Ennemi + Intention
- [ ] `Hand.vue` - Main de cartes (draggable)
- [ ] `CombatLog.vue` - Historique des actions
- [ ] `StatusIcon.vue` - Icônes de statuts animées
- [ ] `IntentDisplay.vue` - Bulle d'intention ennemie

**Views**
- [ ] `views/Combat.vue` - Page de combat
- [ ] `views/Missions.vue` - Sélection de missions

**Animations**
- [ ] Carte qui vole de la main vers la cible
- [ ] Dégâts (nombres rouges)
- [ ] Armure (bouclier bleu)
- [ ] Statuts (icônes avec particules)

#### Tests
- [ ] Test moteur de combat (cas nominaux)
- [ ] Test IA ennemie (patterns)
- [ ] Test validation anti-cheat
- [ ] Test E2E : Combat complet du début à la fin

---

### 🟣 Phase 5 : Boosters & Shop (Semaine 11)

**Objectif** : Système d'obtention de cartes

#### Backend

**Services**
- [ ] `boosterService.js`
  - `openBooster(userId, boosterType)`
  - `rollCard(rarity, filters)` - Tire une carte aléatoire
  - `grantBoosterRewards(userId, cards)` - Donne les cartes

**Routes**
- [x] `GET /api/shop/boosters` - Catalogue boosters
- [x] `POST /api/shop/boosters/:type/open` - Ouvrir booster
- [x] `GET /api/shop` - Aperçu catalogue élargi
- [x] `GET/POST /api/shop/coin-packs` - Packs Kage Coins (stub)
- [x] `GET/POST /api/shop/cosmetics` - Cosmétiques + équipement profil
- [x] `GET/POST /api/shop/battle-pass` - Offre / unlock premium depuis le shop

#### Frontend

**Composants**
- [x] `BoosterSelection.vue` - Choix du booster
- [x] `BoosterOpening.vue` - Animation d'ouverture (cartes qui se retournent)
- [x] `BoosterResults.vue` - Résultats (nouvelles cartes, doublons)
- [x] `CoinPackCatalog.vue` / `CosmeticCatalog.vue` / `BattlePassOffer.vue`

**Views**
- [x] `views/ShopView.vue` - Boutique à onglets (Boosters | Cosmétiques | Monnaie | Battle Pass)

#### Tests
- [ ] Test probabilités de rareté
- [ ] Test anti-triche (vérifier côté serveur)

---

### 🔵 Phase 6 : Battle Pass (Semaines 12-13)

**Objectif** : Système de saison avec quêtes et récompenses

#### Backend

**Migrations**
```sql
-- 103_battle_pass.sql
-- Voir BATTLE_PASS.md pour le schéma complet
CREATE TABLE battle_pass_seasons ...;
CREATE TABLE user_battle_pass ...;
CREATE TABLE battle_pass_quests ...;
CREATE TABLE user_battle_pass_quests ...;
CREATE TABLE user_cosmetics ...;
```

**Services**
- [ ] `battlePassService.js`
  - `getActiveSeason()`
  - `getUserBattlePass(userId, seasonId)`
  - `addXP(userId, amount, source)`
  - `claimReward(userId, level, track)`
  - `purchasePremium(userId)`
  - `purchaseLevels(userId, count)`

- [ ] `questService.js`
  - `getActiveQuests(userId)`
  - `progressQuest(userId, questKey, value)`
  - `claimQuestReward(userId, questId)`
  - `generateDailyQuests()` - Cron
  - `generateWeeklyQuests()` - Cron

**Intégration Stripe**
- [ ] `stripeService.js`
  - `createCheckoutSession(userId, productType)`
  - `handleWebhook(event)` - Callback Stripe

**Routes**
- [ ] `GET /api/battle-pass` - État du BP actuel
- [ ] `GET /api/battle-pass/quests` - Quêtes actives
- [ ] `POST /api/battle-pass/claim/:level` - Réclamer récompense
- [ ] `POST /api/battle-pass/buy` - Acheter premium (Stripe)
- [ ] `POST /api/battle-pass/buy-levels` - Acheter niveaux
- [ ] `POST /api/payments/webhook` - Webhook Stripe

#### Frontend

**Stores**
- [ ] `stores/battlePass.js`
  - State : `season`, `userProgress`, `quests`, `rewards`
  - Actions : `fetchBattlePass()`, `claimReward()`, etc.

**Composants**
- [ ] `BattlePassTrack.vue` - Piste de progression (50 niveaux)
- [ ] `QuestList.vue` - Liste des quêtes actives
- [ ] `QuestCard.vue` - Une quête (progression + récompense)
- [ ] `RewardModal.vue` - Modal réclamation récompense

**Views**
- [ ] `views/BattlePass.vue` - Page Battle Pass

#### Tests
- [ ] Test XP et level up
- [ ] Test réclamation récompenses
- [ ] Test quêtes (progression, complétion)
- [ ] Test intégration Stripe (sandbox)

---

### ⚪ Phase 7 : Polish & Balancing (Semaine 14)

**Objectif** : Peaufiner l'expérience et équilibrer le jeu

#### Actions

**Balance Gameplay**
- [ ] Tester 50+ combats avec différents decks
- [ ] Ajuster dégâts, coûts, effets des cartes
- [ ] Équilibrer les boss (ni trop faciles ni trop durs)
- [ ] Ajuster les récompenses (XP, Ryos, cartes)

**UX/UI**
- [ ] Animations fluides (60 FPS garanti)
- [ ] Feedback visuel clair (cartes jouables, coût, cible)
- [ ] Tutoriel nouveau joueur (onboarding)
- [ ] Tooltips explicatifs (mots-clés, statuts)

**Performance**
- [ ] Optimiser requêtes DB (index, N+1 queries)
- [ ] Lazy loading des images
- [ ] Code splitting des routes
- [ ] Minification & compression

**Accessibilité**
- [ ] Support clavier (navigation, raccourcis)
- [ ] Contraste suffisant (WCAG AA)
- [ ] Textes alternatifs sur images

**Tests**
- [ ] Tests E2E complets (parcours joueur type)
- [ ] Tests de régression
- [ ] Tests de charge (100 utilisateurs simultanés)

---

### 🚀 Phase 8 : Lancement Alpha (Semaine 15)

**Objectif** : Alpha fermée avec 10-20 joueurs

#### Préparation

- [ ] Environnement de staging déployé
- [ ] Serveur Discord communautaire créé
- [ ] Formulaire de feedback intégré
- [ ] Monitoring activé (Sentry, logs)

#### Recrutement Alpha

- [ ] Sélectionner 10-20 testeurs
- [ ] Leur donner accès au jeu
- [ ] Brief : objectifs, feedback attendu

#### Suivi

- [ ] Session de jeu observée (stream)
- [ ] Interviews post-session
- [ ] Collecte de bugs et suggestions
- [ ] Itération rapide sur les problèmes critiques

**Durée** : 2-3 semaines de test

---

### 🌟 Phase 9 : Beta & Lancement (Mois 4+)

**Beta Fermée** (1-2 mois)
- [ ] 100+ joueurs
- [ ] Économie complète testée
- [ ] Première saison de Battle Pass
- [ ] Marketing communautaire (Reddit, forums)

**Soft Launch** (Public limité)
- [ ] Lancement sur itch.io
- [ ] Communauté Discord active
- [ ] Feedback public et itération

**Lancement Complet**
- [ ] Steam (si validé)
- [ ] Marketing élargi
- [ ] Saison 1 officielle

---

## 📊 Estimation Globale

| Phase | Durée | Complexité | Priorité |
|-------|-------|------------|----------|
| 0. Préparation | 1 semaine | Faible | 🔴 Critique |
| 1. Personnage unique | 2 semaines | Moyenne | 🔴 Critique |
| 2. Système de cartes | 2 semaines | Moyenne | 🔴 Critique |
| 3. Moteur de combat | 3 semaines | Élevée | 🔴 Critique |
| 4. Boosters & Shop | 1 semaine | Faible | 🟠 Importante |
| 5. Battle Pass | 2 semaines | Moyenne | 🟠 Importante |
| 6. Polish | 1 semaine | Moyenne | 🟡 Souhaitable |
| 7. Alpha | 3 semaines | Faible | 🟡 Souhaitable |

**Total** : ~3-4 mois pour le MVP

---

## 🎯 Critères de Succès par Phase

### Phase 1 ✅
- Un joueur peut créer un personnage
- Le personnage gagne de l'XP et level up
- Les stats sont persistées

### Phase 2 ✅
- 100+ cartes générées et en DB
- Un joueur peut voir sa collection
- Un joueur peut construire un deck valide

### Phase 3 ✅
- Un joueur peut démarrer un combat
- Le combat se déroule tour par tour
- Victoire/Défaite fonctionnent

### Phase 4 ✅
- Un joueur peut acheter et ouvrir un booster
- Les cartes sont ajoutées à sa collection
- Animation d'ouverture fluide

### Phase 5 ✅
- Le Battle Pass affiche la progression
- Les quêtes se complètent automatiquement
- Les récompenses sont réclamables
- L'achat premium fonctionne (Stripe)

### Phase 6 ✅
- Le jeu est équilibré (winrate ~50% en missions B)
- Aucun bug bloquant
- Performance 60 FPS

### Phase 7 ✅
- 10+ testeurs actifs
- Feedback collecté et traité
- Bugs critiques corrigés

---

## 🛠️ Outils de Développement

**Gestion de Projet**
- GitHub Projects (Kanban)
- Issues GitHub (bugs, features)
- Milestones par phase

**Communication**
- Discord (testeurs, communauté)
- GitHub Discussions

**Tests**
- Backend : Jest ou Vitest
- E2E : Cypress (existant)
- Manual : Checklist par phase

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2026
