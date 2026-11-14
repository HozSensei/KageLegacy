# 🥷 Kage Legacy

<div align="center">

**Un jeu de deck-building roguelike solo dans un univers ninja original**

[![Status](https://img.shields.io/badge/Status-En_Développement-yellow)](https://github.com)
[![License](https://img.shields.io/badge/License-Proprietary-red)](https://github.com)
[![Node](https://img.shields.io/badge/Node-20+-green)](https://nodejs.org)
[![Vue](https://img.shields.io/badge/Vue-3.5+-blue)](https://vuejs.org)

[🎮 Jouer](#) • [📚 Documentation](./PROJECT_VISION.md) • [🗺️ Roadmap](./IMPLEMENTATION_ROADMAP.md) • [💬 Discord](#)

</div>

---

## 🎯 Qu'est-ce que Kage Legacy ?

**Kage Legacy** est un jeu de deck-building roguelike inspiré de **Slay the Spire** et **Monster Train**, mais dans un univers ninja japonais original.

### Le Pitch

> Forgez votre légende ninja en construisant le deck ultime. Collectionnez des techniques anciennes, affrontez des boss légendaires, et gravissez les rangs de Genin à Kage. Chaque carte améliorée reste vôtre pour toujours.

### Gameplay en 30 secondes

1. **Créez votre ninja** : Choisissez un clan et un élément
2. **Collectionnez des cartes** : Techniques, objets, alliés
3. **Construisez votre deck** : 20-30 cartes synergiques
4. **Affrontez des ennemis** : Combat tour par tour tactique
5. **Progressez en permanence** : Améliorez vos cartes, montez de niveau
6. **Complétez le Battle Pass** : Récompenses exclusives chaque saison

---

## ✨ Fonctionnalités Principales

### 🃏 Collection & Deck-Building
- **300+ cartes uniques** générées procéduralement
- **5 types de cartes** : Attaque, Défense, Soutien, Invocation, Passive
- **Rarétés** : Commune, Rare, Légendaire, Mythique
- **Amélioration permanente** : Base → + → ++ (reste upgradée pour toujours)
- **Crafting** : Désenchantez les doublons, craftez les cartes manquantes

### ⚔️ Combat Stratégique
- **Combat carte par carte** : Gérez votre main, votre Chakra, vos PV
- **Triangle tactique** : Taijutsu > Genjutsu > Ninjutsu > Taijutsu
- **Éléments** : Katon, Suiton, Raiton, Doton, Futon
- **Statuts** : Poison, Brûlure, Force, Régénération, etc.
- **Boss avec mécaniques uniques** : Phases, capacités spéciales
- **IA intelligente** : Patterns prédictibles ou aléatoires

### 📈 Progression Permanente
- **Niveau 1 à 100** : Genin → Chunin → Jonin → ANBU → Kage
- **Stats à améliorer** : Taijutsu, Ninjutsu, Genjutsu, Médecine, Vitesse, Intelligence
- **Spécialisation** : Choisissez votre voie au niveau 10
- **Clans** : Débloquez de nouveaux clans avec capacités uniques

### 📅 Battle Pass Saisonnier
- **Saisons de 2 mois** : Nouveau contenu régulier
- **Quêtes journalières & hebdomadaires**
- **2 pistes** : Gratuite (pour tous) et Premium (5€)
- **Récompenses exclusives** : Cartes, cosmétiques, Kage Coins
- **Carte Mythique niveau 50** : Ultra-puissante et exclusive

### 🎨 Cosmétiques
- **Avatars** : Basiques, animés, légendaires
- **Dos de cartes** : Thèmes saisonniers
- **Emotes** : Réactions en combat
- **Effets visuels** : Particules dorées, holographiques

---

## 🎮 Inspirations

| Jeu | Ce qu'on en prend |
|-----|-------------------|
| **Slay the Spire** | Deck-building roguelike, synergies, statuts |
| **Monster Train** | Upgrades permanents, archétypes |
| **Hearthstone** | Collection TCG, boosters, crafting |
| **Inscryption** | Narration sombre, boss uniques |

---

## 🛠️ Stack Technique

### Backend
- **Node.js 20+** + **Express 4.21+**
- **MySQL 8.0+** (base de données)
- **Zod 3.24+** (validation)
- **Stripe 17.7+** (paiements Battle Pass)

### Frontend
- **Vue 3.5+** (framework UI)
- **Vite 8.1+** (build tool)
- **Tailwind CSS 4.3+** (styling)
- **Pinia 3.0+** (state management)
- **Vue Router 5.1+** (navigation)
- **Vue i18n 11.4+** (multilingue FR/EN)

### Infrastructure
- **Docker Compose** (dev environment)
- **GitHub Actions** (CI/CD)
- **MySQL** (production)

---

## 📂 Structure du Projet

```
kage-legacy/
├── backend/
│   ├── migrations/          # Migrations SQL
│   ├── scripts/             # Scripts utilitaires (seed, génération)
│   └── src/
│       ├── models/          # Accès données
│       ├── routes/          # API REST
│       ├── services/        # Logique métier
│       └── validators/      # Schémas Zod
│
├── frontend/
│   └── src/
│       ├── components/      # Composants Vue
│       ├── stores/          # Pinia stores
│       ├── views/           # Pages
│       ├── locales/         # i18n (FR/EN)
│       └── router/          # Vue Router
│
├── docs/                    # Documentation complète
│   ├── PROJECT_VISION.md    # Vision & Game Design
│   ├── BATTLE_PASS.md       # Système de Battle Pass
│   ├── COMBAT_SYSTEM.md     # Mécanique de combat
│   ├── CARD_SYSTEM.md       # Système de cartes
│   ├── TECHNICAL_ARCHITECTURE.md  # Architecture technique
│   └── IMPLEMENTATION_ROADMAP.md  # Roadmap d'implémentation
│
└── README.md
```

---

## 🚀 Installation (Dev)

### Prérequis
- **Node.js 20+**
- **Docker & Docker Compose**
- **Git**

### Démarrage rapide

```bash
# 1. Cloner le repo
git clone https://github.com/votre-username/kage-legacy.git
cd kage-legacy

# 2. Créer la branche de développement
git checkout -b shinobi-ascension

# 3. Copier .env.example
cp .env.example .env

# 4. Installer les dépendances
npm run setup

# 5. Lancer le projet
npm run dev
```

Le jeu est accessible sur :
- **Frontend** : http://localhost:5173
- **API** : http://localhost:3000

---

## 📚 Documentation Complète

Toute la documentation est dans le dossier [`/docs`](./docs/) :

| Document | Description |
|----------|-------------|
| [PROJECT_VISION.md](./PROJECT_VISION.md) | Vision globale, objectifs, direction artistique |
| [BATTLE_PASS.md](./BATTLE_PASS.md) | Système de saison, quêtes, récompenses |
| [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) | Mécanique de combat détaillée |
| [CARD_SYSTEM.md](./CARD_SYSTEM.md) | Système de cartes, génération, balance |
| [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) | Architecture technique complète |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Roadmap d'implémentation (3-4 mois) |

---

## 🗺️ Roadmap

### 🟢 Phase 1 : Personnage Unique (Semaines 2-3)
- [x] Documentation complète
- [ ] Migration DB : `player_character`
- [ ] Backend : `playerCharacterService.js`
- [ ] Frontend : Profil joueur, level up

### 🟡 Phase 2 : Système de Cartes (Semaines 4-5)
- [ ] Génération de 100+ cartes
- [ ] Collection & crafting
- [ ] Deck builder

### 🔴 Phase 3 : Moteur de Combat (Semaines 6-8)
- [ ] Combat carte par carte
- [ ] IA ennemie
- [ ] Missions

### 🟣 Phase 4-5 : Boosters & Battle Pass (Semaines 9-11)
- [ ] Système de boosters
- [ ] Battle Pass avec quêtes
- [ ] Intégration Stripe

### ⚪ Phase 6-7 : Polish & Alpha (Semaines 12-15)
- [ ] Balance & UX
- [ ] Tests alpha (10-20 joueurs)

**Voir la [roadmap complète](./IMPLEMENTATION_ROADMAP.md) pour les détails**

---

## 🎨 Screenshots (À venir)

```
[Interface de combat]
[Collection de cartes]
[Deck builder]
[Battle Pass]
```

---

## 💰 Modèle Économique

### Free-to-Play Éthique

✅ **Gratuit** :
- Tout le contenu de jeu accessible
- Toutes les cartes craftables
- Progression complète sans payer

💎 **Payant (Optionnel)** :
- Battle Pass Premium : 5€/mois
- Kage Coins (monnaie premium)
- Cosmétiques exclusifs

❌ **Pas de Pay-to-Win** :
- Aucune carte exclusive premium
- Aucun avantage compétitif payant

---

## 🤝 Contribution

**Le projet est actuellement en développement actif.**

Pour contribuer :
1. Fork le repo
2. Créer une branche `feature/ma-fonctionnalité`
3. Commit & push
4. Ouvrir une Pull Request

---

## 📝 Licence

**Proprietary** - Tous droits réservés.

Ce projet est un jeu commercial en développement.

---

## 📧 Contact

- **Discord** : [Rejoindre la communauté](#)
- **Email** : contact@shinobi-ascension.com
- **GitHub Issues** : [Signaler un bug](https://github.com/votre-username/kage-legacy/issues)

---

<div align="center">

**Fait avec ❤️ pour les fans de deck-building et de ninja**

[🎮 Jouer](#) • [📚 Documentation](./PROJECT_VISION.md) • [💬 Discord](#)

</div>
