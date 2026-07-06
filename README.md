# 🦅 Kage Legacy : Le Manager d'Escouade Shinobi

**Kage Legacy** est un jeu de gestion et de stratégie asynchrone par navigateur. Inspiré des mécaniques légendaires de *Hattrick*, le jeu plonge le joueur dans un univers de dark fantasy asiatique où la tactique, la formation et la gestion humaine l'emportent sur la puissance brute.

---

## 📜 Le Concept

Dans **Kage Legacy**, vous incarnez un **Jonin-Sensei**, mentor de votre propre escouade.

### 🔄 La Boucle de Jeu (Cycle de 72h)

* **L'Entraînement** — progression automatique selon le focus choisi (appliquée à H72).
* **Les Épreuves (H36)** — examens Chunin et rapport d'espionnage.
* **L'Opération de Frontière (H71→H72)** — chronique shinobi révélée progressivement.
* **Le Vol d'Oiseau** — vos Chunins d'élite partent en Jonin, la relève arrive.

---

## 🛠️ Stack Technique

| Couche | Technologie |
|--------|-------------|
| Back-End | Node.js, Express, MySQL |
| Front-End | Vue 3, Vite, Tailwind CSS, Pinia, Vue Router, vue-i18n |
| Infra | Docker Compose (MySQL 8) |

---

## 🚀 Installation & Développement

### Prérequis

- Node.js 20+
- Docker & Docker Compose

### Démarrage rapide

```bash
# Cloner et installer
git clone https://github.com/HozSensei/KageLegacy.git
cd KageLegacy
cp .env.example .env
npm run setup

# Lancer API + Front (deux terminaux ou un seul)
npm run dev
```

| Service | URL |
|---------|-----|
| Front-End | http://localhost:5173 |
| API | http://localhost:3000 |
| Health check | http://localhost:3000/api/health |
| Connexion | http://localhost:5173/login — ou compte démo `demo_sensei` / `demo` après seed |

### Scripts utiles

```bash
npm run db:up       # Démarre MySQL (Docker)
npm run db:migrate  # Applique les migrations SQL
npm run db:seed     # Génère le joueur démo + 15 ninjas
npm run clock:advance  # Avance l'horloge d'1h (dev)
npm run combat:benchmark --prefix backend  # Benchmark équilibre combat
npm run playtest:cycle --prefix backend    # Playtest cycle H0→H72 (1 joueur)
npm run playtest:multiplayer --prefix backend  # Playtest 2 comptes + P2P + cycle
npm run playtest:league --prefix backend       # Playtest 2 humains même pool + match H71
npm run cycle:tick --prefix backend        # Tick horloge (cron / prod)
npm run dev:api     # API seule
npm run dev:web     # Front seul
```

---

## 🗺️ Plan de Route & Spécifications

Les spécifications détaillées sont dans le dossier [`/specs`](specs/).

| Milestone | Fichier | Statut |
|-----------|---------|--------|
| 1 — Structure des Ninjas | [milestone-1.md](specs/milestone-1.md) | ✅ Fait |
| 2 — Bureau du Sensei | [milestone-2.md](specs/milestone-2.md) | ✅ Fait |
| 3 — Horloge & Entraînement | [milestone-3.md](specs/milestone-3.md) | 🟡 Scheduler + jobs H36/H71/H72 |
| 4 — Économie & Marché | [milestone-4.md](specs/milestone-4.md) | 🟡 Utilitaires, P2P global, magasin village |
| 5 — Moteur de Combat | [milestone-5.md](specs/milestone-5.md) | 🟡 Moteur 12 tours, benchmark |
| 6 — Moteur de Chronique | [milestone-6.md](specs/milestone-6.md) | 🟡 Pipeline narratif, objets match |
| 7 — Vol d'Oiseau | [milestone-7.md](specs/milestone-7.md) | ✅ Cérémonie, prime H72, relève |
| 8 — Ligues & Matchmaking | [milestone-8.md](specs/milestone-8.md) | 🟡 Pools, bots, invitations |
| 9 — Feuille de route & vigilance | [milestone-9.md](specs/milestone-9.md) | 📝 Vivant — priorités & playtests |

**Auth multi-joueurs** (register/login, sessions cookie) et **cloche notifications** (header) sont livrés — voir [milestone-9.md](specs/milestone-9.md) pour le détail à jour.

---

## 📁 Structure du Projet

```
kage-legacy/
├── backend/
│   ├── migrations/       # Schéma SQL
│   ├── scripts/          # Seed & utilitaires
│   └── src/
│       ├── models/       # Accès données
│       ├── routes/       # API REST
│       ├── services/     # Logique métier
│       └── validators/   # Validation Zod
├── frontend/
│   └── src/
│       ├── components/   # SenseiCard, NinjaCard…
│       ├── views/        # Bureau, Escouade…
│       ├── stores/       # Pinia
│       └── locales/      # i18n fr/en
├── specs/                # Documentation produit
└── docker-compose.yml
```
