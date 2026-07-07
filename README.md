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
npm run lint           # ESLint frontend
npm run test:unit      # Smoke tests narratif + Égoïste
npm run combat:benchmark --prefix backend  # Benchmark équilibre combat
npm run playtest:cycle --prefix backend    # Playtest cycle H0→H72 (1 joueur)
npm run playtest:missions --prefix backend # Playtest 3 paliers idle + notifications
npm run test:e2e                           # Cypress : login, missions, cloche, collecte
npm run test:e2e:open                      # Cypress interactif (navigateur)
npm run playtest:multiplayer --prefix backend  # Playtest 2 comptes + P2P + cycle
npm run playtest:league --prefix backend       # Playtest 2 humains même pool + match H71
npm run economy:simulate --prefix backend      # Simule ~20 cycles + achats magasin (équilibre Ryos)
npm run economy:calibrate --prefix backend     # Calibrage analytique des primes match
npm run narrative:backfill --prefix backend  # One-shot : segments i18n sur chroniques legacy
# Options : --progression (Chunin + Vol d'Oiseau), --chunin, --bird-flight, --items=1, --training
npm run cycle:tick --prefix backend        # Tick horloge (cron / prod)
npm run dev:api     # API seule
npm run dev:web     # Front seul
```

### CI (GitHub Actions)

Sur chaque push/PR vers `main` : `npm ci` (racine + backend + frontend), ESLint, smoke tests narratif/Égoïste, `economy:calibrate`, `combat:benchmark` (100 runs). Les E2E Cypress restent à lancer en local via `npm run test:e2e` (nécessite MySQL + seed).

### Déploiement Docker (NAS / prod)

Image publiée sur chaque push vers `main` :

```
ghcr.io/hozsensei/kage-legacy:main
```

**Prérequis MySQL** (base dédiée, même serveur que vos autres apps) :

```sql
CREATE DATABASE kage_legacy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kage'@'%' IDENTIFIED BY 'mot_de_passe_fort';
GRANT ALL PRIVILEGES ON kage_legacy.* TO 'kage'@'%';
FLUSH PRIVILEGES;
```

**Sur le NAS** (après avoir copié `.env.prod.example` → `.env.prod`) :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Au démarrage, le container **attend MySQL**, applique les **migrations** (données joueurs conservées), puis lance l'API + Nginx.

| Variable | Rôle |
|----------|------|
| `DB_HOST` | IP/host MySQL (ex. `192.168.4.39`) |
| `DB_NAME` | `kage_legacy` (séparé des autres jeux) |
| `CORS_ORIGIN` | URL publique HTTPS du front |
| `ENABLE_SCHEDULER` | `true` — horloge 72h |
| `AUTH_DEMO_FALLBACK` | `false` en prod |

**Mise à jour** : `pull` + `up -d` — ne jamais lancer `db:seed` en prod sur une base existante.

### Ancre du cycle (horloge H0)

À la **première migration**, `game_clock.cycle_start_at` est fixé à `UTC_TIMESTAMP()` — donc au premier `db:migrate` de votre déploiement (≈ 20h12 si c'est à ce moment-là que le container a migré).

Pour reculer le début du cycle (ex. « hier à midi ») :

**Option A — une fois via Docker** (après mise à jour image) :

```bash
docker exec kage_app node scripts/setCycleStart.js --at=2026-07-06T12:00:00+02:00
```

**Option B — via `.env.prod`** (redémarrage unique, puis retirer `CYCLE_START_AT_APPLY`) :

```env
CYCLE_START_AT=2026-07-06T12:00:00+02:00
CYCLE_START_AT_APPLY=true
```

**Option C — SQL direct** sur MySQL :

```sql
UPDATE game_clock
SET
  cycle_start_at = '2026-07-06 10:00:00',
  last_tick_hour = LEAST(72, GREATEST(0, TIMESTAMPDIFF(HOUR, '2026-07-06 10:00:00', UTC_TIMESTAMP())))
WHERE id = 1;
```

*(midi heure de Bruxelles en été = 10:00 UTC)*

Le redémarrage du container **ne modifie pas** l'ancre — seul `cycle_start_at` en base compte.

Build local : `docker build -t kage-legacy:local .`

---

## 🗺️ Plan de Route & Spécifications

Les spécifications détaillées sont dans le dossier [`/specs`](specs/).

| Milestone | Fichier | Statut |
|-----------|---------|--------|
| 1 — Structure des Ninjas | [milestone-1.md](specs/milestone-1.md) | ✅ Fait |
| 2 — Bureau du Sensei | [milestone-2.md](specs/milestone-2.md) | ✅ Fait |
| 3 — Horloge & Entraînement | [milestone-3.md](specs/milestone-3.md) | ✅ Scheduler, jobs H36/H71/H72 |
| 4 — Économie & Marché | [milestone-4.md](specs/milestone-4.md) | ✅ Utilitaires, P2P global, magasin village |
| 5 — Moteur de Combat | [milestone-5.md](specs/milestone-5.md) | ✅ Moteur 12 tours, benchmark |
| 6 — Moteur de Chronique | [milestone-6.md](specs/milestone-6.md) | ✅ Pipeline narratif, objets match, i18n |
| 7 — Vol d'Oiseau | [milestone-7.md](specs/milestone-7.md) | ✅ Cérémonie, prime H72, relève |
| 8 — Ligues & Matchmaking | [milestone-8.md](specs/milestone-8.md) | ✅ Pools, bots, invitations, fin de saison |
| 9 — Feuille de route & vigilance | [milestone-9.md](specs/milestone-9.md) | ✅ Clôturé juil. 2026 — vivant pour vigilance |

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
