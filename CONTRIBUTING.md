# Guide de Contribution

Merci de contribuer à **Kage Legacy V2** ! Ce document décrit les conventions et bonnes pratiques du projet.

## 📋 Table des matières

1. [Architecture du projet](#architecture-du-projet)
2. [Conventions de code](#conventions-de-code)
3. [Workflow Git](#workflow-git)
4. [Base de données](#base-de-données)
5. [Tests](#tests)
6. [Documentation](#documentation)

---

## 🏗️ Architecture du projet

### Structure des dossiers

```
/workspace
├── backend/
│   ├── src/
│   │   ├── services/       # Logique métier
│   │   ├── routes/         # Routes API Express
│   │   ├── middleware/     # Middlewares (auth, validation)
│   │   ├── models/         # (Optionnel) Modèles DB
│   │   ├── utils/          # Utilitaires réutilisables
│   │   ├── config/         # Configuration
│   │   └── db/             # Connexion DB et migrations
│   ├── migrations/         # Migrations SQL
│   ├── scripts/            # Scripts de développement et tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Composants Vue réutilisables
│   │   ├── views/          # Pages/vues
│   │   ├── stores/         # Stores Pinia
│   │   ├── composables/    # Composables Vue
│   │   ├── router/         # Configuration du routeur
│   │   ├── assets/         # Images, styles
│   │   └── utils/          # Utilitaires frontend
│   └── package.json
├── docs/                   # Documentation complète
├── legacy/                 # Code archivé (ancien système)
└── package.json            # Scripts racine
```

---

## 💻 Conventions de code

### Backend (Node.js / Express)

#### Style
- **ES Modules** : Utiliser `import/export` (pas de `require`)
- **Async/Await** : Préférer `async/await` aux Promises `.then()`
- **Arrow functions** : Pour les callbacks et fonctions courtes
- **Destructuring** : Extraire les propriétés dès que possible

```javascript
// ✅ Bon
import { getUserById } from '../services/userService.js';

export const getProfile = async (req, res) => {
  const { userId } = req.params;
  const user = await getUserById(userId);
  res.json(user);
};

// ❌ Éviter
const userService = require('../services/userService.js');

exports.getProfile = function(req, res) {
  userService.getUserById(req.params.userId).then(function(user) {
    res.json(user);
  });
};
```

#### Gestion des erreurs
- Toujours utiliser `try/catch` dans les routes
- Renvoyer des codes HTTP appropriés (200, 201, 400, 404, 500)
- Logger les erreurs avec `console.error`

```javascript
export const createCharacter = async (req, res) => {
  try {
    const { userId } = req.user;
    const character = await playerCharacterService.create(userId, req.body);
    res.status(201).json(character);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
};
```

#### Naming
- **Services** : `camelCase`, noms descriptifs (`playerCharacterService.js`)
- **Routes** : `kebab-case` dans l'URL (`/api/player-character`)
- **Fonctions** : Verbes d'action (`createCharacter`, `getUserStats`)
- **Variables** : `camelCase`, noms significatifs

---

### Frontend (Vue 3)

#### Style
- **Composition API** : Utiliser `<script setup>` (pas Options API)
- **Single File Components** : Un composant = un fichier `.vue`
- **PascalCase** : Pour les noms de composants (`PlayerProfile.vue`)

```vue
<!-- ✅ Bon -->
<script setup>
import { ref, computed } from 'vue';
import { usePlayerStore } from '@/stores/player';

const playerStore = usePlayerStore();
const stats = computed(() => playerStore.computedStats);
</script>

<template>
  <div class="player-profile">
    <h2>{{ playerStore.character.name }}</h2>
    <PlayerStats :stats="stats" />
  </div>
</template>
```

#### Stores (Pinia)
- Un store par domaine métier (`player.js`, `cards.js`, `combat.js`)
- Utiliser `computed` pour les getters
- Actions asynchrones avec `async/await`

```javascript
// stores/player.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePlayerStore = defineStore('player', () => {
  const character = ref(null);
  
  const computedStats = computed(() => {
    // Calcul des stats depuis talents + cartes
  });
  
  async function fetchCharacter() {
    const res = await fetch('/api/player');
    character.value = await res.json();
  }
  
  return { character, computedStats, fetchCharacter };
});
```

---

### Linting et Formatting

#### Lancer le linter
```bash
npm run lint              # Backend + Frontend
npm run lint --prefix backend
npm run lint --prefix frontend
```

#### Formater le code
```bash
npm run format            # Backend + Frontend
npm run format --prefix backend
npm run format --prefix frontend
```

#### Règles principales
- **Point-virgules** : Obligatoires
- **Guillemets** : Simples (`'string'`)
- **Indentation** : 2 espaces
- **Trailing comma** : Toujours en multiline
- **Max line length** : 100 caractères

---

## 🔀 Workflow Git

### Branches

- `main` : Branche principale (stable)
- `cursor/feature-name-9fa6` : Branches de fonctionnalités

**Convention de nommage** :
```
cursor/<description>-9fa6
```

Exemples :
- `cursor/player-character-9fa6`
- `cursor/card-system-9fa6`
- `cursor/talent-tree-9fa6`

### Commits

**Format** :
```
<type>(<scope>): <description>

[optional body]
```

**Types** :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatting, point-virgules manquants, etc.
- `refactor` : Refactoring de code
- `test` : Ajout de tests
- `chore` : Tâches de maintenance

**Exemples** :
```bash
git commit -m "feat(player): add player character creation endpoint"
git commit -m "fix(combat): resolve card draw bug when deck is empty"
git commit -m "docs(readme): update setup instructions"
```

### Workflow de développement

1. **Créer une branche** :
   ```bash
   git checkout -b cursor/ma-feature-9fa6
   ```

2. **Développer et commiter régulièrement** :
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Pousser la branche** :
   ```bash
   git push -u origin cursor/ma-feature-9fa6
   ```

4. **Pull Request** :
   - Créer une PR vers `main`
   - Description claire des changements
   - Référencer les issues liées

---

## 🗄️ Base de données

### Migrations

**Fichiers** : `/workspace/backend/migrations/XXX_description.sql`

**Nommage** : `100_description_descriptive.sql`

**Règles** :
- **Additive only** : Ne jamais supprimer de colonnes existantes
- **Safe defaults** : Toujours fournir des valeurs par défaut
- **Foreign keys** : Toujours définir les contraintes
- **Indexes** : Ajouter des index sur les colonnes fréquemment requêtées

**Exemple** :
```sql
-- 102_example_feature.sql

CREATE TABLE IF NOT EXISTS example_table (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_example_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_example_user ON example_table(user_id);
```

**Lancer les migrations** :
```bash
npm run db:migrate
```

---

## 🧪 Tests

### Backend

**Tests unitaires** : Services isolés
```bash
npm run test:unit --prefix backend
```

**Tests E2E** : Parcours complets
```bash
npm run test:e2e
```

### Frontend

**Tests Cypress** :
```bash
npm run test:e2e:open   # Mode interactif
npm run test:e2e        # Headless
```

---

## 📝 Documentation

### Fichiers à maintenir

- **README.md** : Instructions de setup et développement
- **CHANGELOG.md** : Historique des modifications
- **docs/** : Documentation technique complète

### Documenter son code

- **JSDoc** : Documenter les fonctions complexes
- **Commentaires** : Expliquer le "pourquoi", pas le "quoi"
- **README dans les dossiers** : Si nécessaire (ex: `/backend/services/README.md`)

**Exemple JSDoc** :
```javascript
/**
 * Calculate final player stats from talents and equipped cards
 * @param {number} userId - The player's user ID
 * @returns {Promise<Object>} Computed stats object with all attributes
 */
export async function getComputedStats(userId) {
  // ...
}
```

---

## ❓ Questions ?

Pour toute question ou clarification, contactez l'équipe ou ouvrez une issue sur GitHub.

**Merci de contribuer à Kage Legacy V2 !** 🥷✨
