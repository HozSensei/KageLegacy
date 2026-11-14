# 🏗️ Architecture Technique

## 📋 Stack Technologique

### Backend

| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| **Runtime** | Node.js | 20+ | Serveur applicatif |
| **Framework** | Express | 4.21+ | API REST |
| **Base de données** | MySQL | 8.0+ | Données persistantes |
| **ORM** | Raw SQL (query helper) | - | Requêtes DB |
| **Validation** | Zod | 3.24+ | Schémas de validation |
| **Auth** | Sessions + Cookies | - | Authentification |
| **Paiement** | Stripe | 17.7+ | Battle Pass |

### Frontend

| Composant | Technologie | Version | Rôle |
|-----------|-------------|---------|------|
| **Framework** | Vue 3 | 3.5+ | UI reactive |
| **Build Tool** | Vite | 8.1+ | Dev server & build |
| **Styling** | Tailwind CSS | 4.3+ | Styles utilitaires |
| **State** | Pinia | 3.0+ | Gestion d'état |
| **Router** | Vue Router | 5.1+ | Navigation |
| **i18n** | Vue i18n | 11.4+ | Multilingue FR/EN |
| **HTTP** | Fetch API | Native | Requêtes API |
| **Animations** | Vue Transition + CSS | Native | Animations combat |

### Infrastructure

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Conteneurs** | Docker Compose | Dev environment |
| **CI/CD** | GitHub Actions | Tests + Deploy |
| **Hosting** | À définir | Production (VPS ou PaaS) |
| **CDN** | À définir | Assets statiques |

## 🗂️ Structure de Projet

### Arborescence

```
kage-legacy/  (racine du projet existant)
├── backend/
│   ├── migrations/          # Migrations SQL
│   │   ├── 001_initial.sql
│   │   ├── 100_shinobi_ascension_init.sql
│   │   ├── 101_card_system.sql
│   │   ├── 102_battle_pass.sql
│   │   └── ...
│   ├── scripts/             # Scripts utilitaires
│   │   ├── generateCards.js
│   │   ├── seedCards.js
│   │   └── testCombat.js
│   └── src/
│       ├── config/
│       │   └── database.js
│       ├── models/          # Accès données
│       │   ├── card.js
│       │   ├── player.js
│       │   └── battlePass.js
│       ├── routes/          # API REST
│       │   ├── auth.js
│       │   ├── cards.js
│       │   ├── combat.js
│       │   ├── deck.js
│       │   ├── missions.js
│       │   ├── battlePass.js
│       │   └── shop.js
│       ├── services/        # Logique métier
│       │   ├── playerCharacterService.js
│       │   ├── cardService.js
│       │   ├── cardGeneratorService.js
│       │   ├── deckService.js
│       │   ├── combatEngineService.js
│       │   ├── combatAIService.js
│       │   ├── missionService.js
│       │   ├── boosterService.js
│       │   ├── craftingService.js
│       │   ├── battlePassService.js
│       │   ├── questService.js
│       │   ├── clanGeneratorService.js
│       │   └── progressionService.js
│       ├── validators/      # Schémas Zod
│       │   ├── card.js
│       │   ├── deck.js
│       │   └── combat.js
│       └── index.js         # Point d'entrée
│
├── frontend/
│   └── src/
│       ├── assets/          # Images, fonts
│       │   ├── cards/
│       │   ├── avatars/
│       │   └── effects/
│       ├── components/      # Composants Vue
│       │   ├── cards/
│       │   │   ├── CardDisplay.vue
│       │   │   ├── CardList.vue
│       │   │   └── BoosterOpening.vue
│       │   ├── combat/
│       │   │   ├── CombatArena.vue
│       │   │   ├── Hand.vue
│       │   │   ├── EnemyDisplay.vue
│       │   │   ├── PlayerStatus.vue
│       │   │   └── IntentDisplay.vue
│       │   ├── deck/
│       │   │   ├── DeckBuilder.vue
│       │   │   └── DeckList.vue
│       │   ├── battle-pass/
│       │   │   ├── BattlePassTrack.vue
│       │   │   ├── QuestList.vue
│       │   │   └── RewardClaim.vue
│       │   └── ui/
│       │       ├── Button.vue
│       │       ├── Modal.vue
│       │       └── Notification.vue
│       ├── stores/          # Pinia stores
│       │   ├── auth.js
│       │   ├── player.js
│       │   ├── cards.js
│       │   ├── deck.js
│       │   ├── combat.js
│       │   └── battlePass.js
│       ├── views/           # Pages
│       │   ├── Home.vue
│       │   ├── Collection.vue
│       │   ├── DeckBuilder.vue
│       │   ├── Combat.vue
│       │   ├── Missions.vue
│       │   ├── Shop.vue
│       │   ├── BattlePass.vue
│       │   ├── Profile.vue
│       │   └── Forge.vue
│       ├── locales/         # i18n
│       │   ├── fr.json
│       │   └── en.json
│       ├── router/
│       │   └── index.js
│       ├── utils/
│       │   ├── api.js
│       │   ├── cardHelpers.js
│       │   └── combatHelpers.js
│       └── main.js
│
├── docs/                    # Documentation (ce dossier)
│   ├── PROJECT_VISION.md
│   ├── BATTLE_PASS.md
│   ├── COMBAT_SYSTEM.md
│   ├── CARD_SYSTEM.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   └── IMPLEMENTATION_ROADMAP.md
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔌 API REST

### Endpoints Principaux

#### Authentification
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

#### Joueur
```
GET    /api/player                    # Profil complet
GET    /api/player/stats              # Statistiques
PUT    /api/player/avatar             # Changer avatar
POST   /api/player/level-up           # Dépenser points de stat
```

#### Cartes
```
GET    /api/cards                     # Catalogue complet
GET    /api/cards/:id                 # Détail d'une carte
GET    /api/cards/collection          # Collection du joueur
POST   /api/cards/upgrade/:id         # Améliorer une carte
POST   /api/cards/disenchant/:id      # Désenchanter
POST   /api/cards/craft/:cardDefId    # Crafter une carte
```

#### Decks
```
GET    /api/decks                     # Liste des decks
GET    /api/decks/:id                 # Détail d'un deck
POST   /api/decks                     # Créer un deck
PUT    /api/decks/:id                 # Modifier un deck
DELETE /api/decks/:id                 # Supprimer un deck
PUT    /api/decks/:id/activate        # Activer un deck
```

#### Combat
```
POST   /api/combat/start              # Démarrer un combat (mission)
GET    /api/combat/:combatId/state    # État du combat
POST   /api/combat/:combatId/play     # Jouer une carte
POST   /api/combat/:combatId/end-turn # Terminer le tour
POST   /api/combat/:combatId/forfeit  # Abandonner
```

#### Missions
```
GET    /api/missions                  # Missions disponibles
GET    /api/missions/:id              # Détail d'une mission
POST   /api/missions/:id/start        # Démarrer une mission
GET    /api/missions/history          # Historique
```

#### Boutique
```
GET    /api/shop/boosters             # Catalogue boosters
POST   /api/shop/boosters/:type/open  # Ouvrir un booster
GET    /api/shop/cosmetics            # Cosmétiques
POST   /api/shop/cosmetics/:id/buy    # Acheter cosmétique
```

#### Battle Pass
```
GET    /api/battle-pass               # État du Battle Pass actuel
GET    /api/battle-pass/quests        # Quêtes actives
POST   /api/battle-pass/claim/:level  # Réclamer récompense
POST   /api/battle-pass/buy           # Acheter premium
POST   /api/battle-pass/buy-levels    # Acheter niveaux
```

#### Paiements (Stripe)
```
POST   /api/payments/create-session   # Créer session Stripe
GET    /api/payments/success          # Callback succès
GET    /api/payments/cancel           # Callback annulation
```

## 🗄️ Base de Données

### Schéma Relationnel (Nouveau)

```
users
  └─ player_character (1:1)
       ├─ clan_trait (N:1)
       ├─ user_card_collection (1:N)
       │    ├─ card_definitions (N:1)
       │    └─ user_deck_cards (1:N)
       │         └─ user_decks (N:1)
       └─ user_talents (1:N)
            └─ talent_tree_nodes (N:1)

users
  └─ user_battle_pass (1:N)
       ├─ battle_pass_seasons (N:1)
       └─ user_battle_pass_quests (1:N)
            └─ battle_pass_quests (N:1)

users
  └─ user_cosmetics (1:N)

users
  └─ combat_sessions (1:N)
       ├─ combat_logs (1:N)
       └─ mission_definitions (N:1)

talent_tree_nodes (statique, ~150 nœuds)
  └─ user_talents (N:N via user_id)

users
  └─ user_talent_respec_history (1:N)
```

### Tables Principales (Nouvelles)

**Voir CARD_SYSTEM.md, TALENT_TREE.md et BATTLE_PASS.md pour les schémas complets**

Tables critiques :
- `player_character` : Personnage unique du joueur (level, xp, talent_points)
- `talent_tree_nodes` : Arbre de talents (statique, ~150 nœuds)
- `user_talents` : Nœuds débloqués par joueur
- `user_talent_respec_history` : Historique réinitialisations
- `card_definitions` : Catalogue de cartes (300+) avec passive_bonus_json
- `user_card_collection` : Cartes possédées + upgrades
- `user_decks` : Decks construits
- `user_deck_cards` : Contenu des decks
- `battle_pass_seasons` : Saisons BP
- `user_battle_pass` : Progression BP
- `combat_sessions` : États de combat actifs
- `mission_definitions` : Catalogue de missions

### Migrations Stratégie

**Phase 1** : Migrations additives (ne casse rien)
```sql
-- 100_kage_legacy_v2_init.sql
-- Ajoute les nouvelles tables sans toucher aux anciennes
CREATE TABLE player_character ...;
CREATE TABLE talent_tree_nodes ...;
CREATE TABLE user_talents ...;
CREATE TABLE card_definitions ...;
-- etc.
```

**Phase 2** : Migrations de transition (optionnel)
```sql
-- Migrer les données existantes si pertinent
-- Transformer ninjas en cartes alliés
INSERT INTO card_definitions (name_fr, type, ...)
SELECT CONCAT('Allié : ', name), 'summon', ...
FROM ninjas;
```

**Phase 3** : Cleanup (plus tard)
```sql
-- Supprimer les anciennes tables une fois la migration validée
-- DROP TABLE ninjas;
-- DROP TABLE game_clock;
-- etc.
```

## 🔐 Sécurité

### Authentification

**Actuellement** : Sessions + Cookies (existant)

**À conserver** :
- Session stockée côté serveur
- Cookie HttpOnly
- CSRF token (si nécessaire)

**Pas de JWT** (sessions suffisent pour un jeu web)

### Validation

**Toutes les entrées validées avec Zod**

```javascript
// validators/deck.js
import { z } from 'zod';

export const CreateDeckSchema = z.object({
  name: z.string().min(3).max(50),
  cards: z.array(z.number().int().positive()).min(20).max(30)
});

export const PlayCardSchema = z.object({
  combatId: z.string().uuid(),
  cardId: z.number().int().positive(),
  targetId: z.number().int().positive().optional()
});
```

### Anti-Cheat

**Mesures** :
1. **Combat côté serveur** : Toute la logique de combat se déroule sur le serveur
2. **Validation des actions** : Vérifier coût Chakra, cartes en main, cibles valides
3. **Rate limiting** : Limite les requêtes par seconde
4. **Checksums** : Vérifier l'état du combat à chaque action

```javascript
// Exemple de validation combat
async function playCard(userId, combatId, cardId, targetId) {
  // 1. Vérifier que le combat existe et appartient au joueur
  const combat = await getCombat(combatId);
  if (combat.user_id !== userId) throw new Error('Unauthorized');
  
  // 2. Vérifier que c'est le tour du joueur
  if (combat.current_phase !== 'player_turn') throw new Error('Not your turn');
  
  // 3. Vérifier que la carte est en main
  const cardInHand = combat.hand.find(c => c.id === cardId);
  if (!cardInHand) throw new Error('Card not in hand');
  
  // 4. Vérifier le coût en Chakra
  if (combat.current_chakra < cardInHand.cost) throw new Error('Not enough Chakra');
  
  // 5. Exécuter l'action
  return executeCombatAction(combat, cardInHand, targetId);
}
```

## ⚡ Performance

### Optimisations Backend

1. **Indexation DB**
```sql
-- Index sur les requêtes fréquentes
CREATE INDEX idx_user_collection ON user_card_collection(user_id);
CREATE INDEX idx_deck_active ON user_decks(user_id, is_active);
CREATE INDEX idx_bp_season ON user_battle_pass(user_id, season_id);
```

2. **Requêtes N+1 évitées**
```javascript
// Mauvais : N+1
const decks = await query('SELECT * FROM user_decks WHERE user_id = ?', [userId]);
for (const deck of decks) {
  deck.cards = await query('SELECT * FROM user_deck_cards WHERE deck_id = ?', [deck.id]);
}

// Bon : 1 requête avec JOIN
const decks = await query(`
  SELECT 
    d.*,
    JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'card_id', c.card_definition_id)) as cards
  FROM user_decks d
  LEFT JOIN user_deck_cards c ON c.deck_id = d.id
  WHERE d.user_id = ?
  GROUP BY d.id
`, [userId]);
```

3. **Cache en mémoire** (optionnel, via Redis)
```javascript
// Cache du catalogue de cartes (ne change pas souvent)
const cardCache = new Map();

async function getAllCards() {
  if (cardCache.has('all')) {
    return cardCache.get('all');
  }
  
  const cards = await query('SELECT * FROM card_definitions');
  cardCache.set('all', cards);
  return cards;
}
```

### Optimisations Frontend

1. **Code splitting**
```javascript
// router/index.js
const Combat = () => import('../views/Combat.vue');  // Lazy load
```

2. **Images optimisées**
- WebP pour les cartes
- Sprites pour les icônes
- Lazy loading des images hors écran

3. **Animations performantes**
- Utiliser `transform` et `opacity` (GPU accelerated)
- Éviter `width`, `height`, `top`, `left`
- `will-change` pour les animations fréquentes

```css
.card-flying {
  will-change: transform, opacity;
  transition: transform 0.3s ease-out, opacity 0.2s;
}
```

## 📊 Monitoring

### Métriques à Tracker

**Performance** :
- Temps de réponse API (95th percentile)
- Temps de chargement frontend
- Framerate en combat

**Engagement** :
- DAU (Daily Active Users)
- Rétention J1, J7, J30
- Temps de session moyen
- Taux de complétion missions

**Monétisation** :
- Taux de conversion Battle Pass
- ARPU (Average Revenue Per User)
- ARPPU (Average Revenue Per Paying User)

**Technique** :
- Crash rate
- Erreurs API (4xx, 5xx)
- Uptime

### Outils

**À implémenter** :
- Backend : Logs structurés (Winston ou Pino)
- Frontend : Error boundary + Sentry
- Analytics : Google Analytics ou Plausible
- APM : Optional (New Relic, DataDog)

## 🚀 Déploiement

### Environnements

**Dev** :
- Docker Compose local
- Hot reload activé
- DB de dev (seed data)

**Staging** :
- VPS ou PaaS (Heroku, Render, Fly.io)
- DB partagée de test
- CI/CD auto-deploy sur push `staging`

**Production** :
- VPS dédié ou PaaS
- DB MySQL managée (PlanetScale, RDS)
- CDN pour assets (Cloudflare)
- CI/CD auto-deploy sur tag `v*`

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]
    tags: [v*]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:e2e
  
  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - # Deploy to staging
  
  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: test
    runs-on: ubuntu-latest
    steps:
      - # Deploy to production
```

## 🔧 Configuration

### Variables d'Environnement

```bash
# .env.example

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=shinobi_ascension
DB_USER=root
DB_PASSWORD=password

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Auth
SESSION_SECRET=your-super-secret-key-change-me
COOKIE_DOMAIN=localhost

# Stripe (Battle Pass)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BATTLE_PASS=price_...

# Game Config
ENABLE_CARD_GENERATION=true
CARD_GENERATION_SEED=42
BATTLE_PASS_SEASON_ACTIVE=1
```

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2026
