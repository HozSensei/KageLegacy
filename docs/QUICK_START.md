# 🚀 Guide de Démarrage Rapide

## 🎯 Pour les Développeurs

Ce guide vous permet de démarrer rapidement le développement de **Kage Legacy** (nouvelle version).

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ **Node.js 20+** : [Télécharger](https://nodejs.org)
- ✅ **Docker & Docker Compose** : [Télécharger](https://www.docker.com/products/docker-desktop)
- ✅ **Git** : [Télécharger](https://git-scm.com)
- ✅ **Un éditeur de code** : VS Code recommandé

---

## 🛠️ Installation

### 1. Cloner le Projet

```bash
git clone https://github.com/votre-username/kage-legacy.git
cd kage-legacy
```

### 2. Créer la Branche de Développement

```bash
# Créer une branche pour la nouvelle version
git checkout -b v2-deck-building
```

### 3. Configurer l'Environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env si nécessaire (optionnel pour le dev local)
```

### 4. Installer les Dépendances

```bash
# Installe TOUT : backend + frontend + MySQL
npm run setup
```

**Cette commande fait** :
- `npm install` (racine, backend, frontend)
- `docker compose up -d` (lance MySQL)
- Attend que MySQL soit prêt
- `npm run db:migrate` (applique les migrations)
- `npm run db:seed` (crée le compte démo)

### 5. Lancer le Projet

```bash
# Lance API (backend) + Web (frontend) en parallèle
npm run dev
```

**URLs** :
- 🌐 **Frontend** : http://localhost:5173
- 🔌 **API** : http://localhost:3000
- 🗄️ **MySQL** : localhost:3306

---

## 🧪 Comptes de Test

Après le seed, vous avez accès à :

**Compte Démo** :
- Username : `demo_sensei`
- Password : `demo`

**Compte Admin** (à créer manuellement) :
```sql
UPDATE users SET is_admin = TRUE WHERE username = 'demo_sensei';
```

---

## 📂 Structure de Développement

### Backend (`/backend`)

```bash
# Lancer seulement l'API
npm run dev:api

# Appliquer les migrations
npm run db:migrate

# Générer et seed les cartes (à venir)
npm run db:seed

# Tester le moteur de combat (à venir)
npm run test:combat
```

### Frontend (`/frontend`)

```bash
# Lancer seulement le frontend
npm run dev:web

# Linter
npm run lint
```

### Base de Données

```bash
# Démarrer MySQL
npm run db:up

# Arrêter MySQL
npm run db:down

# Se connecter à MySQL
docker exec -it kage_mysql mysql -u root -p
# Password: root
```

---

## 🗺️ Commencer le Développement

### Phase 1 : Personnage Unique

**Backend** :
1. Créer migration `100_shinobi_ascension_player.sql`
2. Créer `services/playerCharacterService.js`
3. Créer routes `routes/player.js`
4. Tester avec Postman/Insomnia

**Frontend** :
1. Créer store `stores/player.js`
2. Créer composants dans `components/player/`
3. Créer vue `views/Profile.vue`
4. Tester dans le navigateur

**Voir la [Roadmap complète](./IMPLEMENTATION_ROADMAP.md) pour les détails**

---

## 🧰 Outils de Développement

### Recommandations VS Code

**Extensions** :
- Vue Language Features (Volar)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MySQL (Weijan Chen)

**Settings** :
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["class:\\s*?[\"'`]([^\"'`]*).*?[\"'`]", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Débugger l'API

**VS Code Launch Config** (`.vscode/launch.json`) :
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/index.js",
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Tester l'API avec Postman

**Collection Postman disponible** : `docs/postman_collection.json` (à créer)

**Endpoints principaux** :
```
POST /api/auth/login
GET  /api/player
GET  /api/cards
GET  /api/cards/collection
POST /api/decks
POST /api/combat/start
```

---

## 🐛 Résolution de Problèmes

### MySQL ne démarre pas

```bash
# Vérifier les logs
docker logs kage_mysql

# Recréer le conteneur
docker compose down
docker compose up -d
```

### Port déjà utilisé

```bash
# Tuer les processus sur les ports 3000 et 5173
npm run kill:ports  # (à créer si besoin)

# Ou manuellement
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Migrations échouent

```bash
# Vérifier l'état de la DB
npm run db:status  # (à créer)

# Reset complet (⚠️ SUPPRIME TOUTES LES DONNÉES)
docker compose down -v
npm run setup
```

### Frontend ne se connecte pas à l'API

Vérifier que `VITE_API_URL` est bien configuré dans `frontend/.env` :
```bash
VITE_API_URL=http://localhost:3000
```

---

## 📝 Conventions de Code

### Backend

**Naming** :
- Services : `camelCase` (ex: `playerCharacterService.js`)
- Routes : `kebab-case` (ex: `/api/battle-pass`)
- DB : `snake_case` (ex: `user_id`, `card_definitions`)

**Async/Await** :
```javascript
// ✅ Bon
async function getPlayer(userId) {
  const player = await query('SELECT * FROM player_character WHERE user_id = ?', [userId]);
  return player[0];
}

// ❌ Mauvais
function getPlayer(userId) {
  return query('SELECT * FROM player_character WHERE user_id = ?', [userId])
    .then(player => player[0]);
}
```

### Frontend

**Naming** :
- Composants : `PascalCase.vue` (ex: `CardDisplay.vue`)
- Stores : `camelCase.js` (ex: `player.js`)
- Méthodes : `camelCase` (ex: `fetchPlayer()`)

**Composition API** :
```vue
<script setup>
import { ref, onMounted } from 'vue';
import { usePlayerStore } from '@/stores/player';

const playerStore = usePlayerStore();

onMounted(async () => {
  await playerStore.fetchPlayer();
});
</script>
```

---

## 🧪 Tests

### Backend (à implémenter)

```bash
# Tests unitaires
npm run test:unit --prefix backend

# Tests d'intégration
npm run test:integration --prefix backend

# Test d'un service spécifique
npm run test -- playerCharacterService.test.js
```

### Frontend (E2E existant)

```bash
# Préparer les fixtures
npm run e2e:prepare

# Lancer Cypress
npm run test:e2e
```

---

## 📚 Documentation Additionnelle

**Lire dans l'ordre** :
1. [PROJECT_VISION.md](./PROJECT_VISION.md) - Comprendre le projet
2. [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Voir les phases
3. [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md) - Architecture détaillée
4. [COMBAT_SYSTEM.md](./COMBAT_SYSTEM.md) ou [CARD_SYSTEM.md](./CARD_SYSTEM.md) - Systèmes spécifiques

---

## 🤝 Contribuer

**Workflow Git** :

```bash
# 1. Créer une branche feature
git checkout -b feature/player-character

# 2. Coder & commiter régulièrement
git add .
git commit -m "feat(player): Add player character service"

# 3. Pousser
git push origin feature/player-character

# 4. Créer une Pull Request sur GitHub
```

**Commits conventionnels** :
- `feat(scope): Description` - Nouvelle fonctionnalité
- `fix(scope): Description` - Correction de bug
- `docs(scope): Description` - Documentation
- `refactor(scope): Description` - Refactoring
- `test(scope): Description` - Tests

---

## 💬 Besoin d'Aide ?

- 📖 Lisez la [documentation complète](./README.md)
- 💬 Rejoignez le [Discord](#)
- 🐛 Ouvrez une [Issue GitHub](https://github.com/votre-username/kage-legacy/issues)

---

**Bon développement ! 🚀**
