# Changelog

Toutes les modifications notables du projet Kage Legacy sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### i18n FR/EN complète (V2 shell + catalogues) (2026-11-15)

#### Added
- Helper `localizedName` / `localizedDescription` (`frontend/src/utils/localeContent.js`)
- Persistance locale `localStorage` (`kage-locale`) + switcher landing/auth (`LocaleSwitcher`)
- Champ langue à l’inscription ; invité hérite de la locale UI
- Doc `docs/I18N.md` + audit `npm run audit:i18n --prefix backend`
- Cypress locale étendu (landing + collection/missions)

#### Fixed
- Sélection EN pour allié combat, récompense de carte, erreurs Élite/WebSocket
- Libellés EN « Bird Flight » (ex-Vol d’Oiseau restés en FR dans `en.json`)

### Seeds catalogues V2 au boot Docker (2026-11-15)

#### Added
- **`db:seed-v2`** : meta-script idempotent (cartes + talents + battle pass) — pas de compte démo, rejouable
- **Entrypoint Docker** : après migrations réussies, lance automatiquement `db:seed-v2` ; échappatoire `SKIP_V2_SEEDS=1`
- Variable documentée dans `.env.prod.example`, `docker-compose.prod.yml`, README et QUICK_START

### Noms originaux et nouvelle page des règles (2026-11-14)

#### Changed
- **Lignées** : Shizumori, Benigiri, Kazamine, Nagihara, Kumatani et Yukisawa remplacent les six anciens noms de clan ; bonus et identifiants inchangés
- **Pays** affichés : Midorihara, Kareno, Oborohama, Ishikura ; identifiants internes `leaf` / `sand` / `mist` / `stone` inchangés
- **Cartes** renommées, slugs et effets inchangés : Dune engloutissante, Reflet trompeur, Lame du guérisseur, Pilule fortifiante ; huit cartes de l'ancien catalogue tactique renommées de la même façon
- **Sensei de bots et compte de démonstration** : prénoms originaux
- **Page des règles** FR/EN réécrite pour le jeu actuel : ninja unique, deck de 20 à 30 cartes, arbre de talents, combat au tour par tour, parcours de mission, boutique, passe de saison, arène
- Garde-fou de nommage des cartes (`backend/scripts/lib/cardFactory.js`) étendu à d'autres noms à ne pas reprendre

#### Added
- **Migration `114_original_names.sql`** : renomme en base les lignées, les ninjas qui portent un nom de lignée, les sensei de bots et les cartes concernées ; rejouable, aucun identifiant modifié

### Thème sombre et finitions d'interface (2026-11-14)

#### Added
- **Thème sombre** en plus du clair : fonds indigo nuit (`#14182b`), texte crème, accent vermillon éclairci pour le texte, tons secondaires recalibrés — mêmes jetons (`frontend/src/styles/tokens.css`, bloc `[data-theme='dark']`), mêmes aplats et mêmes formes
- **Bascule clair / sombre** (`ThemeToggle`, `data-testid="theme-toggle"`) dans la coque et sur les pages publiques (accueil, connexion, règles) ; choix mémorisé (`localStorage`, clé `kage-legacy-theme`), thème du système suivi tant qu'aucun choix n'est fait, thème posé avant le premier rendu (`index.html`)
- **Illustrations** : voile « heure bleue » en thème sombre (`.illustration`), sans modifier les fichiers
- **Journal de combat** : libellés lisibles FR/EN pour tous les événements du moteur (PvE et PvP), formulés du point de vue du joueur
- **Test Cypress** `theme.cy.js` : thème du système, bascule, persistance après rechargement

#### Changed
- **Arbre de talents** : l'arbre entier tient dans le cadre au zoom par défaut (desktop et mobile) ; nœuds, liens et libellés compensent le dézoom
- **PvP** : « Premier joueur / Second joueur » à la place de « Host / Guest » dans les textes visibles ; identifiants techniques inchangés
- Couleurs en dur remplacées par des jetons dans les composants et feuilles de style concernés
- **Bandeaux d'illustration** : JPEG remplacés par WebP (hub, accueil/connexion, missions, boutique, PvP) — ~1,25 Mo → ~0,67 Mo pour le NAS ; cibles navigateurs modernes, sans fallback JPEG

### Refonte visuelle de l'interface (2026-11-14)

#### Changed
- **Socle** : thème clair unique (papier crème, encre indigo, accent vermillon, vert feuillage, bleu ciel, bois, or), tokens Tailwind v4 dans `frontend/src/styles/`, formes en aplat et mécanisme `data-tone`
- **Typographie** auto-hébergée (`@fontsource-variable`) : Bricolage Grotesque pour les titres et les chiffres, Inter pour le texte ; plus aucune police ni icône chargée depuis un CDN
- **Icônes** : glyphes SVG (`AppIcon`) à la place des emojis et de Material Symbols ; losange emboîté comme motif de marque (`BrandMark`, favicon)
- **Écrans** : coque et navigation, accueil public, connexion, hub, carte de jeu, collection, decks, combat, arbre de talents, boutique, passe de saison, missions et parcours, PvP, profil, création du ninja, règles
- **Mouvement** : transitions de page, apparitions en cascade, retours de combat (dégâts, armure, changement de tour), progression du passe, déblocage de talent — CSS et transitions Vue, `prefers-reduced-motion` respecté
- **Illustrations** : cinq visuels utilisés en bandeau d'en-tête (hub, accueil, missions, boutique, PvP)

#### Removed
- Sélecteur de thèmes (`stores/theme.js`, `themes/catalog.js`, `themes.css`) et anciennes images d'en-tête

#### Fixed
- Boutique : la révélation d'un parchemin ne démarrait jamais (`props.value` au lieu de `props.cards`)
- Arbre de talents : un clic à la souris ne sélectionnait pas le nœud (capture du pointeur dès l'appui)

### Boss multi-phases (2026-11-14)

#### Added
- **Phases boss** : seuils HP → intents / buffs / immunités / barrière (`bossPhases.js`, `docs/BOSS_PHASES.md`)
- **Mécaniques** : charge ennemie, invocation ennemie (minion taunt), shield break (barrière persistante)
- **5 boss** B/A/S : Hollow Bell Warden, Embercoil Matron, Grave Orchid Seer, Mirrorfracture Colossus, Voidspire Regent
- **Missions** : migration `112_boss_phases_missions.sql` (runs B/A retargetés + missions dédiées dont S)
- **Tests** : `npm run test:boss-phases`

### Phase 4 — Mission runs (2026-11-14)

#### Added
- **Parcours multi-combats** : `mission_runs` + migration `106_mission_runs.sql` ; 3–5 combats par mission, boss sur rangs B/A
- **Événements MVP** : Sanctuaire de Mousse, Cache d’Éclaireur, Colporteur d’Ombre, Carrefour du Voile
- **PV / ferraille persistants** entre combats ; mort ou abandon de combat = échec du run
- **Récompenses de fin de run** (`grantRunRewards`, multiplicateur `runBonusMult`) — loot différé pendant les étapes
- **API** : `/api/missions/:id/start` → run ; `/runs/:id/enter|resolve-event|abandon`
- **UI** : `MissionRunView` (liste de nœuds), reprise de parcours, `VictoryRewards` étape / fin de run
- **Doc** : `docs/MISSION_RUNS.md` (flux joueur)

### PvP Host architecture (2026-11-14)

#### Added
- **Matchmaking ± niveau** : file `pvp_queue`, fenêtre configurable (±3 / ±5), namespace `pvp_*` / `shared/pvp/`
- **Architecture Host** : un joueur simule le duel client-side ; Guest envoie des intentions ; serveur = queue + match + signaling WS (`/ws/pvp`) + checksum fin de match (`trust_host`)
- **API** `/api/pvp/*` + migration `109_pvp_system.sql`
- **Frontend** : file d’attente `/pvp`, arène `/pvp/duel/:id` avec badge Host/Guest
- **Docs** `docs/PVP_SYSTEM.md` + tests `npm run test:pvp-matchmaking`

### Economy tune — F2P loop (2026-11-14)

#### Added
- **`backend/src/config/economyConfig.js`** : constantes centrales (boosters, combat, dust/craft/upgrade, Battle Pass)
- **`docs/ECONOMY.md`** : sources, sinks, ratios, invariants
- **`npm run test:economy`** : verrouille ratios F2P (pack ≈ 3 wins D, craft/disenchant 5×, soft premium)
- **Migration `107_economy_tune.sql`** : planchers rewards_json missions (bpPoints / ryos)

#### Changed
- Boosters : standard 500→**400** Ryos, élémentaire 800→**650** Ryos (premium 100 KC inchangé)
- Combat défauts : 25/80/10 → **40 XP / 100 Ryos / 12 %** + **50 BP XP** ; planchers par rang
- Dust désenchant : 5/20/100/500 → **10/40/200/1000** (ratio craft **5×**)
- Upgrades early soft (common L1 500/20 → **300/15**)
- Services branchés : `boosterService`, `cardService`, `combatRewardService`, `battlePassService`

### Phase 4 polish — Combat (2026-11-14)

#### Added
- **Récompenses de victoire** : XP (+ talent points via level-up), Ryos, chance de carte collection ; hook Battle Pass stub commenté
- **Missions** : 11 missions Rang D→A, 11 templates ennemis originaux (`105_combat_missions_expand.sql`)
- **Keystones / notables** branchés : 44/50 `effect_code` actifs en combat (dont illusion_master, item_master, void_channel, echo_cast, …) ; 6 reportés (collector, path_weaver, balanced_stance, four_paths, confusion_tax, steady_hands) — voir `docs/TALENT_EFFECTS.md`
- **Summons MVP** : allié unique, auto-attaque début de tour, taunt optionnel
- **UI** : écran `VictoryRewards` (XP / Ryos / carte / level-up)

### Phase 1 - Personnage unique (2026-11-14)

#### Added
- **Backend `playerCharacterService`** : création, XP, level-up (+1 talent point, aucune stat auto), spécialisation, stats calculées (talents + cartes)
- **Routes `/api/player`** : GET `/`, `/stats`, `/clans` ; POST `/create`, `/xp`, `/level-up` ; PUT `/specialization`
- **Frontend** : store Pinia `player`, vues `Profile` / `CharacterCreation`, composants `PlayerProfile`, `PlayerStats`, `LevelUpModal`
- **Redirect onboarding** : joueur authentifié sans personnage → `/character-creation`
- **Tests** : `npm run test:player-character` (helpers purs toujours ; intégration DB si MySQL)

#### Changed
- **Express `app.js`** : ne monte plus les routes legacy archivées ; auth / clock / player / health
- **Auth register/guest** : plus de provision d’escouade / cartes tactiques (différé V2)
- **Navigation** : hub recentré sur Bureau + Profil (autres sections en placeholder)

### Phase 0 - Préparation de Kage Legacy V2 (2026-11-14)

#### Added
- **Arborescence restructurée** : Dossiers backend et frontend organisés
- **Legacy code archivé** : Ancien système d'escouade déplacé vers `/legacy`
- **ESLint et Prettier configurés** : Configuration pour backend (Node.js) et frontend (Vue 3)
- **Scripts de linting et formatting** : `npm run lint` et `npm run format`
- **Migrations DB pour V2** :
  - `100_kage_legacy_v2_init.sql` : Table `player_character` et extension de `sensei`
  - `101_talent_tree.sql` : Tables pour l'arbre de talents
- **Documentation améliorée** :
  - `CHANGELOG.md` : Suivi des modifications
  - `CONTRIBUTING.md` : Conventions de code
  - `legacy/README.md` : Explication de l'archivage

#### Changed
- **Branche de développement** : Création de `cursor/kage-legacy-v2-9fa6`
- **Package.json** : Ajout des scripts `lint` et `format` dans backend et frontend
- **Architecture** : Passage d'un système de gestion d'escouade à un deck-building roguelike

#### Removed
- **Ancien système déplacé** :
  - Routes : squad, market, academy, bureau, operations, missions, league, etc.
  - Services : ninja generation, training, combat (ancien), operations, reconnaissance
  - Components : Squad UI, ninja cards, bureau panels, league views
  - Stores : squad.js

---

## [0.1.0] - Version Legacy (Avant V2)

### Description
Version originale de Kage Legacy : système de gestion d'escouade asynchrone de ninjas.

### Features principales
- Gestion d'une escouade de 3 ninjas
- Recrutement et formation via l'Académie
- Système de combat au tour par tour (Hattrick)
- Marché de joueurs (trading de ninjas)
- Ligues et rivalités entre villages
- Bureau et dispensaire
- Missions et opérations
- Système d'examens (Bird Flight, Chunin)

### Stack technique
- Backend : Express.js, MySQL
- Frontend : Vue 3, Pinia, Tailwind CSS
- Tests : Cypress (E2E)

---

## Format des versions futures

### [X.Y.Z] - YYYY-MM-DD

#### Added
- Nouvelles fonctionnalités

#### Changed
- Modifications de fonctionnalités existantes

#### Deprecated
- Fonctionnalités dépréciées (bientôt supprimées)

#### Removed
- Fonctionnalités supprimées

#### Fixed
- Corrections de bugs

#### Security
- Correctifs de sécurité

---

**Légende des phases V2** :
- Phase 0 : Préparation
- Phase 1 : Personnage unique
- Phase 2 : Système de cartes
- Phase 3 : Arbre de talents
- Phase 4 : Moteur de combat
- Phase 5 : Boosters & Shop
- Phase 6 : Battle Pass
- Phase 7 : Polish & Balancing
- Phase 8 : Alpha fermée
- Phase 9 : Beta & Lancement
