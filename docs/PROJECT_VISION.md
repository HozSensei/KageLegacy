# 🥷 Kage Legacy — Vision du Projet

## 📋 Résumé Exécutif

**Kage Legacy** est un jeu de deck-building roguelike solo dans un univers ninja original inspiré du folklore japonais. Le joueur incarne un ninja unique qui progresse de Genin à Kage en collectionnant des cartes de techniques, en affrontant des boss légendaires et en améliorant son deck de façon permanente.

## 🎮 Pitch du Jeu

> "Forgez votre légende ninja en construisant le deck ultime. Collectionnez des techniques anciennes, affrontez des boss légendaires, et gravissez les rangs jusqu'à devenir Kage. Chaque carte améliorée reste vôtre pour toujours."

**Inspirations principales** :
- **Slay the Spire** : Deck-building roguelike, synergies de cartes
- **Monster Train** : Upgrades permanents, archétypes de deck
- **Hearthstone** : Collection de cartes, boosters, crafting
- **Inscryption** : Narration sombre, boss avec mécaniques uniques

## 🎯 Objectifs de Design

### Piliers du Gameplay

1. **Collection & Progression**
   - Collectionner 300+ cartes uniques
   - Améliorer les cartes de façon permanente (Base → + → ++)
   - Débloquer de nouveaux clans et capacités

2. **Deck-Building Tactique**
   - Construire un deck de 20-30 cartes
   - Synergies entre cartes (éléments, types, effets)
   - **Cartes donnent des bonus passifs de stats** (ex: Kunai = +2 Dextérité)
   - Multiples archétypes viables (Aggro, Control, Combo, DOT)

3. **Arbre de Talents (Path of Exile-like)**
   - Arbre massif de ~150 nœuds (stats + synergies)
   - 1 point de talent par niveau
   - Keystones puissants avec trade-offs
   - Réorientation possible (respec)

4. **Combat Stratégique**
   - Combat carte par carte avec gestion de ressources (Chakra)
   - Stats du personnage boostent les cartes
   - Anticiper les intentions ennemies
   - Boss avec mécaniques uniques et phases

5. **Méta-progression Permanente**
   - Niveau & Rangs (Genin → Kage)
   - Battle Pass avec récompenses exclusives
   - Arbre de talents (choix stratégiques permanents)
   - Achievements et cosmétiques

## 🎨 Direction Artistique

### Thème : Ninja Japonais Original

**CE QU'ON FAIT** :
- ✅ Univers ninja japonais générique (domaine public)
- ✅ Clans générés procéduralement (Kagemori, Yukisawa, etc.)
- ✅ Techniques originales (Poing du dragon, Boule de feu destructrice)
- ✅ Éléments traditionnels (Katon/Feu, Suiton/Eau, Raiton/Foudre, etc.)

**CE QU'ON ÉVITE** :
- ❌ Aucune référence directe à Naruto (Sharingan, Rasengan, etc.)
- ❌ Aucun personnage existant (Naruto, Sasuke, Kakashi)
- ❌ Aucun lieu copié (Konoha, Akatsuki)

**Pourquoi** : Protection légale contre Bandai Namco/Shueisha.

### Style Visuel

**Existant (à conserver)** :
- Interface Vue 3 + Tailwind CSS actuelle
- Cartes avec design TCG élégant
- Thème sombre avec accents colorés

**À ajouter** :
- Animations de combat (cartes qui volent, effets de particules)
- Animation d'ouverture de boosters (cartes brillantes)
- Effets visuels pour les éléments (feu, eau, foudre)
- Portraits de ninjas générés ou illustrations stylisées

## 💰 Modèle Économique

### Free-to-Play avec Monétisation Éthique

**Gratuit** :
- ✅ Tout le contenu de jeu accessible
- ✅ Toutes les cartes craftables avec le temps
- ✅ Progression complète sans payer

**Payant (Optionnel)** :
- 💎 **Kage Coins** (monnaie premium)
  - Boosters premium (meilleur loot mais craftable gratuitement)
  - Battle Pass premium (cosmétiques + boost XP)
  - Cosmétiques (avatars, dos de cartes, effets visuels)
  
- 📅 **Battle Pass** (5€/mois)
  - Piste gratuite : Récompenses de base
  - Piste premium : Cartes exclusives + cosmétiques + boost XP

**Pas de Pay-to-Win** :
- ❌ Pas de cartes exclusives premium
- ❌ Pas d'avantage compétitif payant
- ✅ Tout est craftable avec du temps de jeu

## 🎮 Boucle de Gameplay

### Session de Jeu (30-60 min)

```
1. PRÉPARATION
   ├─ Construire/ajuster son deck (5 min)
   └─ Dépenser points de talents (arbre)
   
2. MISSION
   ├─ Choisir une mission (Rang D à S)
   ├─ 5-10 combats enchaînés
   ├─ Événements entre combats (repos, marchand, coffre)
   └─ Boss final (15-20 min)
   
3. RÉCOMPENSES
   ├─ XP de niveau → +1 Point de Talent
   ├─ Ryos (monnaie)
   ├─ Cartes (1-3 selon difficulté)
   └─ Points de Battle Pass
   
4. FORGE
   ├─ Améliorer des cartes (Dust + Ryos)
   │  → Bonus passifs augmentent aussi !
   ├─ Crafter de nouvelles cartes
   └─ Désenchanter les doublons
   
5. PROGRESSION
   ├─ Monter de niveau → +1 Point de Talent
   ├─ Dépenser points dans l'arbre (stats + synergies)
   ├─ Avancer dans le Battle Pass
   └─ Compléter achievements
```

### Méta-progression Long Terme

**Objectifs à 100h de jeu** :
- 🎯 Niveau 100 (Rang Kage) → 100 points de talents
- 🌳 Arbre de talents optimisé (build théorycrafté)
- 🃏 Collection complète (300 cartes)
- ⬆️ 50+ cartes améliorées niveau 2 (bonus passifs max)
- 🏆 Tous les achievements débloqués
- 👥 Tous les clans légendaires obtenus
- 📅 Plusieurs saisons de Battle Pass complétées

**Diversité de builds** :
- Build Tank (stats Médecine/Défense via talents + cartes)
- Build Burst (Taijutsu élevé + Keystones dégâts)
- Build Élémentaire (Ninjutsu + cartes élémentaires)
- Build Contrôle (Intelligence + cartes manipulation)

## 📊 Métriques de Succès

### KPI Techniques
- ⏱️ Temps de chargement < 2s
- 🎮 Framerate 60 FPS constant en combat
- 📱 Responsive (desktop + mobile)
- 🐛 Crash rate < 0.1%

### KPI Engagement
- 🔄 Rétention J1 > 40%
- 📆 Rétention J7 > 20%
- ⏰ Session moyenne > 30 min
- 🎯 Taux de complétion mission > 70%

### KPI Monétisation
- 💰 Taux de conversion Battle Pass > 5%
- 💎 ARPPU (revenu par payeur) > 10€/mois
- 🎁 Taux d'ouverture boosters > 80%

## 🚀 Positionnement Marché

### Concurrents Directs
- **Slay the Spire** : Référence du genre, mais thème fantasy
- **Monster Train** : Excellent mais complexe
- **Inscryption** : Narratif fort mais peu rejouable

### Notre Différenciation
- ✨ **Thème ninja unique** (pas saturé comme fantasy)
- 🔄 **Upgrades permanents** (pas de perte de progression)
- 🎴 **Collection TCG** (satisfaction de complétion)
- 📅 **Battle Pass** (contenu régulier, communauté)
- 🌐 **Multilingue** (FR/EN dès le lancement)

## 🎯 Public Cible

### Persona Principal : "Alex, 25 ans"
- 🎮 Fan de roguelikes (Hades, Slay the Spire)
- 🃏 Collectionneur (Hearthstone, Magic Arena)
- 🥷 Aime la culture japonaise (manga, anime)
- ⏰ Cherche un jeu "pick-up and play" (sessions courtes)
- 💰 Prêt à payer pour du contenu régulier (Battle Pass)

### Persona Secondaire : "Marie, 32 ans"
- 🧠 Aime les jeux tactiques/stratégiques
- 📚 Apprécie la progression et la maîtrise
- 🎨 Sensible à la direction artistique
- 🆓 Préfère F2P avec option premium éthique

## 📅 Roadmap Stratégique

### Phase Alpha (3 mois)
- ✅ MVP : Combat + 50 cartes + Progression de base
- ✅ Test interne avec 10-20 joueurs
- ✅ Itération sur balance et UX

### Phase Beta (2 mois)
- 🔓 Beta fermée (100 joueurs)
- 🃏 150 cartes, 10 boss, 5 clans
- 💰 Économie et monétisation testées

### Lancement (Soft Launch)
- 🌍 Lancement FR/EN sur itch.io / Steam
- 📅 Première saison de Battle Pass
- 📢 Marketing communautaire (Reddit, Discord)

### Post-Launch (Ongoing)
- 📅 Nouvelle saison Battle Pass tous les 2 mois
- 🃏 +30 cartes par saison
- 🏆 Nouveaux boss et événements
- 🎨 Cosmétiques saisonniers

## 🛠️ Stack Technique (Existant)

**Backend** :
- Node.js + Express
- MySQL 8
- Services modulaires

**Frontend** :
- Vue 3 + Vite
- Tailwind CSS
- Pinia (state management)
- Vue Router

**Infra** :
- Docker Compose
- GitHub Actions (CI/CD)

**À Ajouter** :
- WebSocket (temps réel pour animations)
- Redis (cache Battle Pass)
- Stripe (paiements Battle Pass)

## 📝 Prochaines Étapes

1. ✅ Documentation complète (ce document)
2. 🏗️ Architecture technique détaillée
3. 🎴 Génération des 100 premières cartes
4. ⚔️ Moteur de combat carte par carte
5. 🎨 UI/UX combat avec animations
6. 📅 Système de Battle Pass
7. 🧪 Tests alpha internes

---

**Date de création** : Novembre 2026  
**Version** : 1.0  
**Statut** : Projet en phase de conception
