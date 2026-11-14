# 🎖️ Pack Élite — Identité Sensei & monétisation cosmétique

**Statut :** ⏸️ **désactivé temporairement** (juil. 2026) — le code reste en place ; réactiver avec `ELITE_FEATURE_ENABLED=true`.

**Kill-switch :** si `ELITE_FEATURE_ENABLED` ≠ `true`, les abonnements DB sont ignorés, le checkout renvoie 503, et l'UI (profil, nav, outils) masque tout le Pack Élite.

**Objectif :** offrir un abonnement **Pack Élite** qui transforme l'identité publique du joueur (cosmétiques visibles par tous) et débloque des outils d'analyse privés — **sans aucun avantage compétitif**.

---

## Terminologie validée

| Terme produit | Usage |
| :--- | :--- |
| **Pack Élite** | Nom commercial de l'abonnement mensuel |
| **Jonin Élite** | Grade d'identité affiché à la place de « Jonin-Sensei » pour les abonnés actifs |
| **Titre** | Sous-titre personnalisable sous le pseudo (ex. « Architecte des Ombres ») |
| **Bannière** | Fond animé derrière l'identité (style Discord Nitro) |
| **Rapport Élite** | Couche analytique post-match premium (hors scope immédiat de cette spec UI) |

---

## Principes de design (ne pas régresser)

| Principe | Implication |
| :--- | :--- |
| **Zéro P2W** | Aucun Ryos, loot, stats ou objet match offert par le Pack Élite |
| **Visibilité sociale** | Les cosmétiques doivent apparaître là où les autres joueurs voient déjà un `sensei.name` |
| **Chronique inchangée** | Le texte romancé partagé reste identique pour tous ; le premium ajoute une vue analytique **privée** |
| **Titres = expression** | Le titre est cosmétique ; pas de bonus mécanique lié au libellé |
| **Rétrocompatibilité** | Sans abonnement → rendu actuel (texte brut, grade Jonin-Sensei) |

---

## 1. Modèle de données

### Migration `037_pack_elite.sql`

```sql
-- Abonnement & cosmétiques Sensei
CREATE TABLE IF NOT EXISTS sensei_elite_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('active', 'past_due', 'canceled', 'expired') NOT NULL DEFAULT 'active',
  stripe_customer_id VARCHAR(64) NULL,
  stripe_subscription_id VARCHAR(64) NULL,
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_elite_sub_user (user_id),
  CONSTRAINT fk_elite_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cosmétiques équipés (1 ligne par sensei)
CREATE TABLE IF NOT EXISTS sensei_cosmetics (
  user_id INT UNSIGNED NOT NULL PRIMARY KEY,
  title_slug VARCHAR(50) NULL,
  banner_slug VARCHAR(50) NOT NULL DEFAULT 'none',
  name_color VARCHAR(7) NOT NULL DEFAULT '#e8ece9',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cosmetics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalogue des titres débloquables (seed)
CREATE TABLE IF NOT EXISTS elite_title_catalog (
  slug VARCHAR(50) NOT NULL PRIMARY KEY,
  label_fr VARCHAR(80) NOT NULL,
  label_en VARCHAR(80) NOT NULL,
  unlock_rule ENUM('elite_default', 'season_reward', 'reputation') NOT NULL DEFAULT 'elite_default',
  unlock_threshold INT UNSIGNED NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalogue des bannières (seed)
CREATE TABLE IF NOT EXISTS elite_banner_catalog (
  slug VARCHAR(50) NOT NULL PRIMARY KEY,
  label_fr VARCHAR(80) NOT NULL,
  label_en VARCHAR(80) NOT NULL,
  css_class VARCHAR(80) NOT NULL,
  unlock_rule ENUM('elite_default', 'season_reward') NOT NULL DEFAULT 'elite_default',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Objet `SenseiIdentity` (contrat API partagé)

Tous les endpoints qui exposent un nom de Sensei **doivent** inclure ce bloc (ou `null` si bot sans cosmétiques) :

```ts
type SenseiIdentity = {
  userId: number;
  senseiName: string;
  isBot: boolean;
  isElite: boolean;           // abonnement actif
  gradeLabel: 'jonin' | 'jonin_elite';
  title: string | null;       // libellé résolu selon locale
  titleSlug: string | null;
  bannerSlug: string;         // 'none' | 'mist' | 'embers' | ...
  nameColor: string;          // hex #RRGGBB
  profileUrl: string;         // '/sensei/:userId'
};
```

### Helper backend `buildSenseiIdentity(userId, locale)`

```
1. JOIN sensei + users + sensei_elite_subscriptions + sensei_cosmetics
2. isElite = subscription.status === 'active' && period_end > NOW()
3. gradeLabel = isElite ? 'jonin_elite' : 'jonin'
4. title = résolution via elite_title_catalog si title_slug et droits OK
5. banner = cosmétique si isElite, sinon 'none'
6. nameColor = cosmétique si isElite, sinon couleur par défaut ink
```

**Batch :** pour les listes (classement ligue, clan), une requête `WHERE user_id IN (...)` évite le N+1.

---

## 2. API

### `GET /api/sensei/:userId/profile` (public, auth optionnelle)

Retourne le profil public visible par les autres joueurs.

```json
{
  "identity": { /* SenseiIdentity */ },
  "publicStats": {
    "reputation": 42,
    "division": "III",
    "seasonPoints": 18,
    "played": 7,
    "wins": 4,
    "draws": 1,
    "losses": 2,
    "promotions": 1
  },
  "recentMatch": {
    "id": 123,
    "result": "home_win",
    "opponentName": "Banri",
    "cycle": 4
  }
}
```

**Ne pas exposer :** stats exactes des ninjas, Ryos, inventaire, héritage détaillé.

### `GET /api/me/elite` (auth requise)

État de l'abonnement + cosmétiques équipés + catalogues débloqués.

```json
{
  "subscription": {
    "isActive": true,
    "status": "active",
    "currentPeriodEnd": "2026-08-09T12:00:00.000Z"
  },
  "equipped": {
    "titleSlug": "shadow_architect",
    "bannerSlug": "mist",
    "nameColor": "#c9a66b"
  },
  "catalog": {
    "titles": [{ "slug": "...", "label": "...", "unlocked": true }],
    "banners": [{ "slug": "...", "label": "...", "unlocked": true }],
    "nameColors": ["#e8ece9", "#c9a66b", "#8fad9a", "#6d9eb8", "#c97d5d"]
  }
}
```

### `PATCH /api/me/elite/cosmetics` (auth + abonnement actif)

```json
{
  "titleSlug": "veteran_league",
  "bannerSlug": "embers",
  "nameColor": "#c9a66b"
}
```

Validations :
- `titleSlug` doit exister dans le catalogue **et** être débloqué pour ce user
- `bannerSlug` idem
- `nameColor` dans la palette autorisée Pack Élite
- 403 si abonnement inactif (les cosmétiques restent en BDD mais ne s'affichent pas)

### Enrichissement des endpoints existants

| Endpoint | Changement |
| :--- | :--- |
| `GET /api/league` | `standings[].identity` au lieu de `senseiName` seul |
| `GET /api/matches/pools/:id/fixtures` | `home.identity`, `away.identity` |
| `GET /api/matches/:id` (operation) | `match.homeIdentity`, `match.awayIdentity` |
| `GET /api/player-market` | `listings[].sellerIdentity` |
| `GET /api/clan` | `members[].identity` |

**Rétrocompat :** conserver `senseiName` / `sellerName` en alias deprecated pendant 1 milestone, puis retirer.

---

## 3. Composant `SenseiIdentity.vue`

**Chemin :** `frontend/src/components/sensei/SenseiIdentity.vue`

### Props

| Prop | Type | Défaut | Description |
| :--- | :--- | :--- | :--- |
| `identity` | `Object` | requis | Bloc `SenseiIdentity` API |
| `variant` | `'inline' \| 'row' \| 'card' \| 'match'` | `'inline'` | Densité d'affichage |
| `subtitle` | `String` | `null` | Ligne contextuelle (division, score…) |
| `linkable` | `Boolean` | `true` | Lien vers `/sensei/:userId` |
| `highlight` | `Boolean` | `false` | Accentuer (joueur courant) |

### Variantes visuelles

```
inline   — classement ligue, marché P2P (1 ligne)
row      — liste clan, fixture (nom + titre + badge)
card     — page profil publique, showcase
match    — en-tête opération (deux identités face à face)
```

### Structure DOM (variante `card`)

```
.sensei-identity.sensei-identity--card
  .sensei-identity__banner[data-banner="mist"]     ← fond animé CSS
  .sensei-identity__content
    .sensei-identity__grade      "Jonin Élite"
    .sensei-identity__name       couleur nameColor + badge élite
    .sensei-identity__title      titre personnalisable
    .sensei-identity__subtitle   slot / prop
```

### Maquette interactive

Route de preview (auth requise) : **`/design/elite-identity`**

Fichiers livrés :
- `frontend/src/components/sensei/SenseiIdentity.vue`
- `frontend/src/data/eliteCosmeticCatalog.js` — données mock + catalogues
- `frontend/src/views/EliteIdentityShowcase.vue` — toutes les variantes

---

## 4. Page profil publique `/sensei/:userId`

**Vue :** `frontend/src/views/SenseiProfileView.vue`

| Zone | Contenu |
| :--- | :--- |
| **Hero** | `SenseiIdentity` variant `card` + bannière animée |
| **Palmarès** | W/D/L, points saison, division, réputation |
| **Dernier match** | Lien vers `/operation/match/:id` |
| **Grades ninjas** | Silhouettes : 3 icônes Genin/Chunin **sans stats** |

Le propriétaire du profil voit un bandeau « Personnaliser mon identité » → panneau édition titres/bannière/couleur (Pack Élite requis).

---

## 5. Points d'intégration UI (ordre de livraison)

| Priorité | Fichier | Remplacement |
| :---: | :--- | :--- |
| 1 | `LeagueView.vue` | `row.senseiName` → `<SenseiIdentity variant="inline" />` |
| 2 | `OperationView.vue` | `matchTitle` → deux `<SenseiIdentity variant="match" />` |
| 3 | `ClanView.vue` | membres → `variant="row"` |
| 4 | `PlayerMarketView.vue` | vendeur → `variant="inline"` |
| 5 | `LeagueView.vue` (fixtures) | paires de match → `variant="row"` |
| 6 | `SenseiProfileView.vue` | nouvelle page |

---

## 6. Catalogue cosmétiques (seed V1)

### Titres (`elite_title_catalog`)

| slug | FR | Règle |
| :--- | :--- | :--- |
| `shadow_architect` | Architecte des Ombres | elite_default |
| `veteran_league` | Vétéran de la Ligue | elite_default |
| `chronicle_keeper` | Gardien des Chroniques | elite_default |
| `dojo_founder` | Fondateur de Dojo | reputation ≥ 50 |
| `promoted_ii` | Promu Division II | season_quest |
| `flawless_cycle` | Cycle sans défaite | season_quest |

### Bannières (`elite_banner_catalog`)

| slug | FR | CSS class |
| :--- | :--- | :--- |
| `none` | Aucune | — |
| `mist` | Brume du crépuscule | `sensei-banner--mist` |
| `embers` | Braises du forgeur | `sensei-banner--embers` |
| `moonlight` | Clair de lune | `sensei-banner--moonlight` |
| `scroll` | Parchemin ancestral | `sensei-banner--scroll` |

### Couleurs de pseudo (palette Pack Élite)

`#e8ece9` (défaut), `#c9a66b` (or), `#8fad9a` (jade), `#6d9eb8` (eau), `#c97d5d` (feu)

---

## 6 bis. Season Pass (inclus dans le Pack Élite)

Le **Pack Élite** couvre **une saison de ligue** (10 cycles). L'abonnement et le season pass partagent la même fenêtre : `sensei_elite_subscriptions.season_number` = `pools.season_number`.

### Principes

| Règle | Détail |
| :--- | :--- |
| **Alignement saison** | Cosmétiques élite visibles uniquement si abonnement actif sur la saison courante |
| **Fin de saison** | À la clôture (cycle 10), `expireEliteSubscriptionsForSeason` passe les abonnements en `expired` |
| **Quêtes saison** | Débloquent titres/bannières `season_quest` — récompenses **conservées** dans `elite_unlocked_rewards` |
| **Défaut élite** | Titres/bannières `elite_default` disponibles dès l'activation, sans quête |
| **Zéro gameplay** | Les quêtes mesurent l'engagement (victoires, sceaux, missions, points) — pas de bonus combat |

### Quêtes V1 (seed migration 037)

| slug | Objectif | Récompense |
| :--- | :--- | :--- |
| `wins_2` | 2 victoires ligue | Titre `promoted_ii` |
| `seals_5` | 5 sceaux chakra ouverts | Bannière `scroll` |
| `missions_3` | 3 missions collectées | Titre `flawless_cycle` |
| `points_9` | 9 points ligue | Bannière `moonlight` |

### Hooks événements

| `event_type` | Déclenché par |
| :--- | :--- |
| `league_win` | `matchService.applyMatchResultsForPool` |
| `league_match_played` | idem (tous les participants) |
| `league_points` | sync à la lecture du pass + après match |
| `daily_seal_opened` | `dailySealService.openChakraSeal` |
| `mission_collected` | `missionService.collectMissionRewards` |

### API

- `GET /api/elite/me` — abonnement + season pass + catalogues + identity
- `GET /api/elite/season-pass` — progression quêtes uniquement
- `PATCH /api/elite/cosmetics` — équipement (titres/bannières débloqués seulement)

### Dev

`POST /api/dev/grant-elite` — active le Pack Élite sur la saison courante (compte connecté).

---

## 7. Rapport Élite + Outils Élite (phase G — livré)

### Rapport Élite (privé, post-match)

Couche analytique distincte de la chronique narrative :

- Timeline tour par tour (icônes technique)
- Possession, fin de match, KO
- 3 « moments décisifs » auto-détectés (dégâts, interception sensei, critique…)
- Répartition des dégâts par technique (Tai / Nin / Gen)
- **Heatmap élémentaire** (dégâts infligés/reçus par élément, cercle avantage/désavantage)
- Données source : `matches.combat_log` (+ champs `attaquant_element`, `cible_element` depuis les nouveaux combats)

Endpoint : `GET /api/matches/:id/elite-report` — 403 si pas Pack Élite actif.

UI : panneau repliable dans `OperationView` (`OperationEliteReport.vue`).

### Outils Élite (privés, bureau)

| Outil | Description |
| :--- | :--- |
| **Stats saison** | V/D/N, possession moyenne, historique des matchs |
| **Conseil composition** | Tips deck / voies (plus de triangle Assaut / Mur / Flux) |
| **ROI entraînement** | Coût net (héritage) vs gain attendu par ninja |
| **Héritage** | Résumé parchemins + remises actives |
| **Simulateur matchup** | Monte Carlo escouade active vs compo pure adverse |

Endpoints :

- `GET /api/elite/tools`
- `POST /api/elite/tools/matchup` — body `{ opponentComposition, runs }`

UI : `EliteToolsPanel.vue` dans le Bureau (visible si abonnement actif).

**V2 (hors scope immédiat) :** comparaison head-to-head adversaire récurrent.

### Contrôle d'accès premium (audit)

| Feature | Free | Élite actif | Enforcement |
| :--- | :---: | :---: | :--- |
| Cosmétiques **visibles** (autres joueurs) | ✅ voir | ✅ voir + porter | `buildSenseiIdentities` |
| Éditeur cosmétiques / catalog | ❌ | ✅ | `updateEquippedCosmetics`, `/api/elite/me` |
| Season pass (quêtes, déblocages) | ❌ | ✅ | `getSeasonPassPayload`, `recordEliteQuestEvent` |
| Outils bureau + simulateur | ❌ | ✅ | `assertEliteToolsAccess` |
| Rapport Élite + heatmap | ❌ | ✅ | `buildEliteMatchReport` |
| Stats mécaniques opération + debriefing | ❌ | ✅ | `operationService` (`hasActiveEliteSubscription`) |
| Chronique narrative | ✅ | ✅ | Public (spectacle H72) |

Checkout sans Stripe : grant auto **uniquement** en dev (`NODE_ENV !== production` ou `ENABLE_DEV_TOOLS`).

---

## 8. Paiement (phase 3 — outline)

| Étape | Détail |
| :--- | :--- |
| Stripe Checkout | Produit « Pack Élite » récurrent mensuel |
| Webhook | `customer.subscription.updated` → `sensei_elite_subscriptions` |
| Portail client | Lien annulation / factures Stripe |
| Grace period | 3 jours `past_due` avant masquage cosmétiques |

**Prix indicatif PO :** 3,99 €/mois — ajustable sans impact technique.

---

## 9. Plan d'implémentation

| Phase | Livrable | Statut |
| :--- | :--- | :--- |
| **A** | Spec + maquette `SenseiIdentity` + showcase | ✅ |
| **B** | Migration 037, `buildSenseiIdentity`, season pass | ✅ |
| **C** | API ligue avec `identity` | ✅ |
| **D** | Intégrer composant dans les vues | ✅ ligue, opération, clan, marché |
| **E** | Page profil publique + éditeur cosmétiques UI | ✅ |
| **F** | Stripe Checkout + webhook | ✅ |
| **G** | Rapport Élite + Outils Élite (bureau) + audit accès | ✅ |

---

## 10. Tests

| Test | Cible |
| :--- | :--- |
| `testSenseiIdentity.js` | Helper `buildSenseiIdentity`, batch, abonnement expiré |
| `testEliteTools.js` | Rapport match, outils bureau, simulateur matchup, 403 sans abonnement |
| `testEliteCosmeticsApi.js` | PATCH validations, 403 sans abonnement |
| Cypress `elite-identity.cy.js` | Showcase rend les 4 variantes ; ligue affiche badge élite (mock API) |

---

## Fichiers de référence

| Fichier | Rôle |
| :--- | :--- |
| `backend/migrations/037_pack_elite.sql` | Schéma BDD |
| `backend/src/services/senseiIdentityService.js` | Builder identity |
| `backend/src/services/eliteSubscriptionService.js` | Abonnement saison |
| `backend/src/services/eliteSeasonPassService.js` | Quêtes & déblocages |
| `backend/src/routes/elite.js` | API `/api/elite/*` |
| `frontend/src/components/sensei/SenseiIdentity.vue` | Composant identity |
| `frontend/src/data/eliteCosmeticCatalog.js` | Catalogue mock V1 |
| `frontend/src/views/EliteIdentityShowcase.vue` | Maquette interactive |
| `specs/milestone-6.md` | Chronique (inchangée pour tous) |
| `specs/milestone-9.md` | Principes anti-P2W |
