# 🦅 Kage Legacy : Le Manager d'Escouade Shinobi

**Kage Legacy** est un jeu de gestion et de stratégie asynchrone par navigateur. Inspiré des mécaniques légendaires de *Hattrick*, le jeu plonge le joueur dans un univers de dark fantasy asiatique où la tactique, la formation et la gestion humaine l'emportent sur la puissance brute.

---

## 📜 Le Concept

Dans **Kage Legacy**, vous incarnez un **Jonin-Sensei**, mentor de votre propre escouade.

### 🔄 La Boucle de Jeu (Cycle de 72h)

* **L'Entraînement** — progression automatique selon le focus choisi (appliquée à H72).
* **La Préparation (H0–H35)** — entraînement, missions, magasin, Académie, inscription **reconnaissance** (combat résolu à H36).
* **Les Épreuves (H72)** — examens Chunin, Vol d'Oiseau, clôture du cycle.
* **Le Milieu (H36)** — reconnaissance et tendances espionnage.
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
| Règles du jeu (joueur) | http://localhost:5173/rules |
| Health check | http://localhost:3000/api/health |
| Connexion | http://localhost:5173/login — ou compte démo `demo_sensei` / `demo` après seed |

### Scripts utiles (racine)

| Commande | Description |
|----------|-------------|
| `npm run db:up` | Démarre MySQL (Docker) |
| `npm run db:down` | Arrête les conteneurs Docker |
| `npm run db:migrate` | Applique les migrations SQL |
| `npm run db:seed` | Génère le joueur démo + 15 ninjas (**dev uniquement**) |
| `npm run dev` | API + front en parallèle |
| `npm run dev:api` / `npm run dev:web` | API ou front seul |
| `npm run lint` | ESLint frontend |
| `npm run test:unit` | Smoke tests backend (imports, sceau, ligue, narratif, Égoïste) |
| `npm run e2e:prepare` | Migrate + seed + playtest cycle + calendrier ligue E2E |
| `npm run test:e2e` | Cypress headless (15 specs) |
| `npm run test:e2e:open` | Cypress interactif |

Les commandes **backend** détaillées ci-dessous se lancent avec `npm run <script> --prefix backend` (ajoutez `--` avant les arguments du script).

---

## 📟 Référence des commandes CLI

> **Syntaxe npm** : `npm run <script> --prefix backend -- [--option=valeur]`  
> Le `--` sépare les arguments npm de ceux passés au script Node.

### Base de données

| Commande | Arguments | Description |
|----------|-----------|-------------|
| `db:migrate` | — | Applique les migrations en attente |
| `db:seed` | — | Compte `demo_sensei` / `demo` + escouade (**ne pas lancer en prod** sur une base existante) |

### Horloge du cycle (72 h)

| Commande | Arguments | Description |
|----------|-----------|-------------|
| `clock:advance` | — | **+1 heure** (dev) + exécute les jobs de cycle si seuil atteint (H36, H54, H71, H72) |
| `clock:set` | `[0-72]` | Place l'horloge à **Hx** (recalcule `cycle_start_at` depuis maintenant) + jobs |
| `clock:set-start` | `--at=<ISO-8601>` | **Ancre H0** à une date précise ; l'heure courante est recalculée depuis cette ancre |

**Exemples horloge (local)** :

```bash
# Avancer d'une heure et déclencher les jobs éventuels
npm run clock:advance --prefix backend

# Se placer à H36 et lancer reconnaissance + tendances scout
npm run clock:set --prefix backend -- 36

# Ancrer le cycle à aujourd'hui 8h (heure de Paris/Bruxelles, été UTC+2)
npm run clock:set-start --prefix backend -- --at=2026-07-12T08:00:00+02:00
```

**Docker prod** (répertoire de travail `/app/backend`) :

```bash
docker exec -w /app/backend kage_app npm run clock:set-start -- --at=2026-07-12T08:00:00+02:00
docker exec -w /app/backend kage_app npm run clock:set -- 36
```

| Variable `.env.prod` | Rôle |
|---------------------|------|
| `CYCLE_START_AT` | Date ISO de l'ancre H0 (ex. `2026-07-12T08:00:00+02:00`) |
| `CYCLE_START_AT_APPLY` | `true` **une seule fois** au redémarrage pour appliquer l'ancre, puis repasser à `false` |

**SQL direct** (alternative à `clock:set-start`) :

```sql
UPDATE game_clock
SET
  cycle_start_at = '2026-07-12 06:00:00',
  last_tick_hour = LEAST(72, GREATEST(0, TIMESTAMPDIFF(HOUR, '2026-07-12 06:00:00', UTC_TIMESTAMP())))
WHERE id = 1;
```

*(8h à Paris en été = 6:00 UTC)*

### Reset global de saison (`season:hard-reset`)

Remet **tous les joueurs humains** à zéro gameplay : nouvelle escouade, nouvelles ligues, Ryos/réputation réinitialisés. **Conserve** : comptes, sessions, clans, rouleaux d'héritage, abonnements Élite (réactivés).

| Argument | Obligatoire | Description |
|----------|-------------|-------------|
| `--dry-run` | ou `--confirm` | Aperçu sans modifier la base |
| `--confirm` | ou `--dry-run` | Exécute réellement le reset |
| `--season=<n>` | recommandé | Numéro de saison des nouveaux pools (défaut `1`) |
| `--at=<ISO-8601>` | optionnel | Ancre **H0** du nouveau cycle (défaut : maintenant en UTC) |

**Procédure recommandée** :

```bash
# 1. Prévisualiser
npm run season:hard-reset --prefix backend -- --dry-run --season=1 --at=2026-07-12T08:00:00+02:00

# 2. Exécuter (irréversible côté gameplay)
npm run season:hard-reset --prefix backend -- --confirm --season=1 --at=2026-07-12T08:00:00+02:00
```

**Hard reset effectif à aujourd'hui 8h** (Paris/Bruxelles, été) :

```bash
npm run season:hard-reset --prefix backend -- --confirm --season=1 --at=2026-07-12T08:00:00+02:00
```

Sur le NAS :

```bash
docker exec -w /app/backend kage_app npm run season:hard-reset -- --dry-run --season=1 --at=2026-07-12T08:00:00+02:00
docker exec -w /app/backend kage_app npm run season:hard-reset -- --confirm --season=1 --at=2026-07-12T08:00:00+02:00
```

Après le reset, l'horloge est à **H0** avec `cycle_start_at` = l'heure indiquée par `--at`. Le scheduler prod (`ENABLE_SCHEDULER=true`) fera avancer le cycle en temps réel.

### Panneau admin web (`/admin`)

Alternative au `docker exec` : interface web pour les mêmes opérations (horloge, hard reset, maintenance).

1. Promouvoir un compte en admin (une seule fois, via SQL) :

```sql
UPDATE users SET is_admin = TRUE WHERE username = 'votre_compte';
```

2. Se connecter avec ce compte et ouvrir `/admin`.

Pour retirer les droits : `UPDATE users SET is_admin = FALSE WHERE username = 'votre_compte';`

### Cycle & maintenance prod

| Commande | Arguments | Description |
|----------|-----------|-------------|
| `cycle:tick` | — | Un tick horloge (cron prod, H36/H54/H71/H72 selon l'heure réelle) |
| `guest:purge` | — | Purge comptes invités expirés |
| `pool:repair-schedules` | `--all` ou `--pool-id=<id>` | Répare un calendrier ligue round-robin corrompu |
| | `--include-played` | Réécrit aussi les matchs déjà joués (défaut : `scheduled` seulement) |

### Playtests (dev)

| Commande | Options | Description |
|----------|---------|-------------|
| `playtest:cycle` | — | Jalons H0 → H36 → H71 → H72 (1 joueur) |
| `playtest:missions` | — | Missions idle rangs D/C/B/A + notifications |
| `playtest:multiplayer` | — | 2 comptes + P2P + cycle |
| `playtest:league` | — | 2 humains même pool + match H71 |

Options `economy:simulate` : `--cycles=20`, `--items=1`, `--chunin`, `--bird-flight`, `--progression` (= chunin + bird-flight) — voir `backend/scripts/simulateEconomyCycles.js`.

### Tests automatisés (backend)

| Commande | Sujet |
|----------|--------|
| `test:reconnaissance` | Mission reconnaissance différée H36 |
| `test:scout-cycle` | Espionnage H36/H54 |
| `test:cycle-freezes` | Gels composition / équipement H54/H71 |
| `test:operation-dossier` | Dossier d'opération |
| `test:combat-loot` | Butin combat |
| `test:narrative` | Moteur de chronique |
| `test:egoiste` | Trait Égoïste / insubordination |
| `test:pool-schedule` | Calendrier round-robin |
| `test:season-hard-reset` | Reset global de saison |
| `audit:imports` | Cohérence des imports backend |

### Combat, économie, narratif

| Commande | Arguments | Description |
|----------|-----------|-------------|
| `combat:benchmark` | `-- --runs=100` | Benchmark équilibre combat |
| `combat:tactic-cards` | `-- --runs=100` | Benchmark cartes tactiques |
| `combat:simulate` | — | Simule un match (script interactif) |
| `economy:simulate` | — | ~20 cycles + achats magasin |
| `economy:calibrate` | — | Calibrage analytique des primes |
| `narrative:backfill` | — | Régénère les segments i18n des chroniques legacy |

### Ancien bloc scripts (raccourci)

```bash
npm run combat:benchmark --prefix backend
npm run playtest:cycle --prefix backend
npm run cycle:tick --prefix backend
npm run guest:purge --prefix backend
```

---

### CI (GitHub Actions)

Sur chaque push/PR vers `main` :

- **Job `quality`** : `npm ci`, ESLint, smoke tests narratif/Égoïste, `economy:calibrate`, benchmarks combat et cartes tactiques (100 runs chacun).
- **Job `e2e`** : MySQL 8 (service container), `npm run e2e:prepare` (migrate + seed + playtest cycle), puis `npm run test:e2e` (15 specs Cypress).

En local : `npm run db:up`, puis `npm run e2e:prepare`, puis `npm run test:e2e`.

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

Pour l'horloge et le hard reset en prod, voir la section **Référence des commandes CLI** (horloge, `season:hard-reset`, variables `CYCLE_START_AT`).

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
