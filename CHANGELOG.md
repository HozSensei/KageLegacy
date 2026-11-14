# Changelog

Toutes les modifications notables du projet Kage Legacy sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Phase 4 polish — Combat (2026-11-14)

#### Added
- **Récompenses de victoire** : XP (+ talent points via level-up), Ryos, chance de carte collection ; hook Battle Pass stub commenté
- **Missions** : 11 missions Rang D→A, 11 templates ennemis originaux (`105_combat_missions_expand.sql`)
- **Keystones / notables** branchés : immortal, overload, intangible, combo_master, blade_swift, elemental_mastery, elemental_fusion, shadow_feint, perfect_tank (+ MVP existants)
- **Summons MVP** : allié unique, auto-attaque début de tour, taunt optionnel
- **UI** : écran `VictoryRewards` (XP / Ryos / carte / level-up)

### Phase 1 - Personnage unique (2026-11-14)

#### Added
- **Backend `playerCharacterService`** : création, XP, level-up (+1 talent point, aucune stat auto), spécialisation, stats calculées (talents + cartes)
- **Routes `/api/player`** : GET `/`, `/stats`, `/clans` ; POST `/create`, `/xp`, `/level-up` ; PUT `/specialization`
- **Frontend** : store Pinia `player`, vues `Profile` / `CharacterCreation`, composants `PlayerProfile`, `PlayerStats`, `LevelUpModal`
- **Redirect onboarding** : joueur authentifié sans personnage → `/character-creation`
- **Tests** : `npm run test:player-character` (helpers purs toujours ; intégration DB si MySQL)

#### Changed
- **Express `app.js`** : ne monte plus les routes legacy archivées ; auth / clock / player / health
- **Auth register/guest** : plus de provision d’escouade / cartes tactiques (différé V2)
- **Navigation** : hub recentré sur Bureau + Profil (autres sections en placeholder)

### Phase 0 - Préparation de Kage Legacy V2 (2026-11-14)

#### Added
- **Arborescence restructurée** : Dossiers backend et frontend organisés
- **Legacy code archivé** : Ancien système d'escouade déplacé vers `/legacy`
- **ESLint et Prettier configurés** : Configuration pour backend (Node.js) et frontend (Vue 3)
- **Scripts de linting et formatting** : `npm run lint` et `npm run format`
- **Migrations DB pour V2** :
  - `100_kage_legacy_v2_init.sql` : Table `player_character` et extension de `sensei`
  - `101_talent_tree.sql` : Tables pour l'arbre de talents
- **Documentation améliorée** :
  - `CHANGELOG.md` : Suivi des modifications
  - `CONTRIBUTING.md` : Conventions de code
  - `legacy/README.md` : Explication de l'archivage

#### Changed
- **Branche de développement** : Création de `cursor/kage-legacy-v2-9fa6`
- **Package.json** : Ajout des scripts `lint` et `format` dans backend et frontend
- **Architecture** : Passage d'un système de gestion d'escouade à un deck-building roguelike

#### Removed
- **Ancien système déplacé** :
  - Routes : squad, market, academy, bureau, operations, missions, league, etc.
  - Services : ninja generation, training, combat (ancien), operations, reconnaissance
  - Components : Squad UI, ninja cards, bureau panels, league views
  - Stores : squad.js

---

## [0.1.0] - Version Legacy (Avant V2)

### Description
Version originale de Kage Legacy : système de gestion d'escouade asynchrone de ninjas.

### Features principales
- Gestion d'une escouade de 3 ninjas
- Recrutement et formation via l'Académie
- Système de combat au tour par tour (Hattrick)
- Marché de joueurs (trading de ninjas)
- Ligues et rivalités entre villages
- Bureau et dispensaire
- Missions et opérations
- Système d'examens (Bird Flight, Chunin)

### Stack technique
- Backend : Express.js, MySQL
- Frontend : Vue 3, Pinia, Tailwind CSS
- Tests : Cypress (E2E)

---

## Format des versions futures

### [X.Y.Z] - YYYY-MM-DD

#### Added
- Nouvelles fonctionnalités

#### Changed
- Modifications de fonctionnalités existantes

#### Deprecated
- Fonctionnalités dépréciées (bientôt supprimées)

#### Removed
- Fonctionnalités supprimées

#### Fixed
- Corrections de bugs

#### Security
- Correctifs de sécurité

---

**Légende des phases V2** :
- Phase 0 : Préparation
- Phase 1 : Personnage unique
- Phase 2 : Système de cartes
- Phase 3 : Arbre de talents
- Phase 4 : Moteur de combat
- Phase 5 : Boosters & Shop
- Phase 6 : Battle Pass
- Phase 7 : Polish & Balancing
- Phase 8 : Alpha fermée
- Phase 9 : Beta & Lancement
