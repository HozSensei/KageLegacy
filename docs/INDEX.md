# 📚 Index de la Documentation

Bienvenue dans la documentation complète de **Kage Legacy** (version 2.0) !

---

## 🗂️ Documents Principaux

### 1. 📖 [README.md](./README.md)
**Guide d'introduction complet**

- Présentation du projet
- Fonctionnalités principales
- Stack technique
- Installation
- Screenshots

👉 **Commencez ici** si vous découvrez le projet.

---

### 2. 🎯 [PROJECT_VISION.md](./PROJECT_VISION.md)
**Vision et Game Design**

- Résumé exécutif
- Pitch du jeu
- Objectifs de design
- Direction artistique (sans Naruto)
- Modèle économique
- Boucle de gameplay
- Métriques de succès
- Positionnement marché

👉 **Lisez ceci** pour comprendre la vision globale.

---

### 3. 📅 [BATTLE_PASS.md](./BATTLE_PASS.md)
**Système de Saison**

- Structure d'une saison (2 mois)
- Niveaux et XP
- Récompenses (gratuite & premium)
- Quêtes (journalières, hebdomadaires, saison)
- Cosmétiques exclusifs
- Cartes Mythiques
- Monétisation (5€)
- Cycle de saison
- Structure DB complète

👉 **Référence complète** pour le système de Battle Pass.

---

### 4. 🌳 [TALENT_TREE.md](./TALENT_TREE.md)
**Arbre de Talents (Path of Exile-like)**

- Structure de l'arbre (~150 nœuds)
- Types de nœuds (Stats, Notables, Keystones)
- 4 branches principales
- Exemples de builds complets
- Système de respec
- Structure DB
- Interface visuelle

👉 **Référence complète** pour le système de progression du personnage.

---

### 5. ⚔️ [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) · [MISSION_RUNS.md](./MISSION_RUNS.md) · [PVP_SYSTEM.md](./PVP_SYSTEM.md)
**Mécanique de Combat** (PvE), **parcours multi-combats**, et **PvP Host**

- Ressources (Chakra, PV, Armure)
- Déroulement d'un tour (3 phases)
- Parcours de mission (3–5 combats + événements, PV persistants)
- Système d'intentions
- Types de cartes (Attaque, Défense, Soutien, Invocation, Passive)
- Triangle tactique (Tai > Gen > Nin)
- Système d'éléments (Katon, Suiton, etc.)
- Statuts (Buffs & Debuffs)
- IA ennemie (3 niveaux)
- Synergies et combos
- Interface de combat

👉 **Référence technique** pour implémenter le combat.

---

### 6. 🃏 [CARD_SYSTEM.md](./CARD_SYSTEM.md)
**Système de Cartes**

- Structure d'une carte (propriétés)
- Types de cartes détaillés
- Système de rareté (4 niveaux)
- Amélioration (Base → + → ++)
- Obtention (missions, boosters, craft)
- Désenchantement (Dust & Essence)
- Génération procédurale
- Balance des cartes
- Structure DB complète

👉 **Référence technique** pour tout ce qui concerne les cartes.

---

### 6b. 💰 [ECONOMY.md](./ECONOMY.md)
**Tuning économique F2P**

- Monnaies (Ryos, Dust, Essence, Kage Coins)
- Coûts boosters, rewards combat, craft/upgrade, Battle Pass
- Ratios verrouillés (`npm run test:economy`)
- Source code : `backend/src/config/economyConfig.js`

👉 **Référence** pour toute modification de montants / sinks / sources.

---

### 7. 🏗️ [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
**Architecture Technique**

- Stack technologique (Backend & Frontend)
- Structure de projet (arborescence complète)
- API REST (tous les endpoints)
- Base de données (schéma relationnel)
- Sécurité (auth, validation, anti-cheat)
- Performance (optimisations)
- Monitoring (métriques)
- Déploiement (CI/CD)
- Configuration (env vars)

👉 **Référence technique** pour l'architecture globale.

---

### 8. 🗺️ [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)
**Roadmap d'Implémentation**

- **8 Phases** de développement (3-4 mois)
  - Phase 0 : Préparation
  - Phase 1 : Personnage unique
  - Phase 2 : Système de cartes
  - Phase 3 : Moteur de combat
  - Phase 4 : Boosters & Shop
  - Phase 5 : Battle Pass
  - Phase 6 : Polish & Balancing
  - Phase 7 : Lancement Alpha
  - Phase 8 : Beta & Lancement
- Estimation globale
- Critères de succès par phase
- Outils de développement

👉 **Suivez ceci** pour implémenter le projet étape par étape.

---

### 9. 🚀 [QUICK_START.md](./QUICK_START.md)
**Guide de Démarrage Rapide**

- Prérequis
- Installation (5 étapes)
- Comptes de test
- Structure de développement
- Outils recommandés
- Résolution de problèmes
- Conventions de code
- Tests
- Workflow Git

👉 **Consultez ceci** pour démarrer le développement rapidement.

---

## 🗺️ Parcours de Lecture Recommandé

### Pour les Game Designers
1. [README.md](./README.md) - Vue d'ensemble
2. [PROJECT_VISION.md](./PROJECT_VISION.md) - Vision & Game Design
3. [TALENT_TREE.md](./TALENT_TREE.md) - Arbre de talents (progression)
4. [CARD_SYSTEM.md](./CARD_SYSTEM.md) - Système de cartes (bonus passifs)
5. [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) - Mécanique de combat
6. [BATTLE_PASS.md](./BATTLE_PASS.md) - Système de saison

### Pour les Développeurs Backend
1. [QUICK_START.md](./QUICK_START.md) - Installation
2. [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) - Architecture
3. [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Roadmap
4. [TALENT_TREE.md](./TALENT_TREE.md) - Structure DB arbre de talents
5. [CARD_SYSTEM.md](./CARD_SYSTEM.md) - Structure DB cartes + bonus passifs
6. [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) - Logique de combat
7. [BATTLE_PASS.md](./BATTLE_PASS.md) - Structure DB Battle Pass

### Pour les Développeurs Frontend
1. [QUICK_START.md](./QUICK_START.md) - Installation
2. [README.md](./README.md) - Vue d'ensemble
3. [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) - API & Composants
4. [TALENT_TREE.md](./TALENT_TREE.md) - Interface arbre de talents (zoomable)
5. [CARD_SYSTEM.md](./CARD_SYSTEM.md) - Affichage cartes + bonus passifs
6. [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) - Interface de combat
7. [BATTLE_PASS.md](./BATTLE_PASS.md) - Interface Battle Pass

### Pour les Investisseurs / Business
1. [README.md](./README.md) - Vue d'ensemble
2. [PROJECT_VISION.md](./PROJECT_VISION.md) - Vision, marché, métriques
3. [BATTLE_PASS.md](./BATTLE_PASS.md) - Modèle économique
4. [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Timeline

---

## 📝 Glossaire

### Termes du Jeu

| Terme | Définition |
|-------|------------|
| **Chakra** | Ressource utilisée pour jouer des cartes (= Mana) |
| **Armure** | Points qui absorbent les dégâts avant les PV (temporaire) |
| **Deck** | Collection de 20-30 cartes utilisées en combat |
| **Dust** | Monnaie obtenue en désenchantant des cartes |
| **Essence** | Monnaie rare pour upgrader les cartes légendaires |
| **Kage Coins** | Monnaie premium (achetée avec argent réel) |
| **Rang** | Genin → Chunin → Jonin → ANBU → Kage |
| **Statut** | Effet temporaire (Poison, Force, etc.) |
| **Intention** | Action que l'ennemi va faire au prochain tour |
| **Battle Pass** | Système de progression saisonnière avec récompenses |
| **Mythique** | Rareté au-dessus de Légendaire (très rare) |

### Termes Techniques

| Terme | Définition |
|-------|------------|
| **Migration** | Script SQL pour modifier la structure de la DB |
| **Seed** | Script pour remplir la DB avec des données de test |
| **Store** | Gestionnaire d'état Pinia (Frontend) |
| **Service** | Module de logique métier (Backend) |
| **Validator** | Schéma Zod pour valider les données |
| **Component** | Composant Vue réutilisable |
| **View** | Page complète Vue |

---

## 🔗 Liens Utiles

### Externes
- [Node.js](https://nodejs.org) - Runtime JavaScript
- [Vue 3](https://vuejs.org) - Framework Frontend
- [Vite](https://vitejs.dev) - Build Tool
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS
- [MySQL](https://www.mysql.com) - Base de données
- [Stripe](https://stripe.com) - Paiements
- [Docker](https://www.docker.com) - Conteneurisation

### Inspirations
- [Slay the Spire](https://www.megacrit.com) - Référence deck-building
- [Monster Train](https://www.themonstertrain.com) - Upgrades permanents
- [Hearthstone](https://hearthstone.blizzard.com) - Collection TCG
- [Inscryption](https://www.inscryption.com) - Narration unique

---

## 📧 Contact

- **Discord** : [Rejoindre](#)
- **GitHub** : [Issues](https://github.com/votre-username/kage-legacy/issues)
- **Email** : contact@shinobi-ascension.com

---

**Dernière mise à jour** : Novembre 2026  
**Version** : 1.0
