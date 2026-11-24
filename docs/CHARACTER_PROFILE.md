# Profil personnage

## Contrat API

`GET /api/player` et `PATCH /api/player/character/profile` renvoient `{ character }`. Le profil est disponible aux comptes et invités avec une session. L'inscription (`POST /api/auth/register`, `/guest`, `/google`) crée uniquement le compte : le personnage (nom, village/faction, avatar) se crée ensuite via `POST /api/player/create` (écran wizard obligatoire). Seuls les portraits Aspirant ninja sont valides à la création ; si `avatarId` est absent ou `null`, le serveur utilise `aspirant-1-1`. `POST /api/player/create` accepte toujours l'ancien champ `avatarUrl`, que l'API conserve au niveau `character.avatarUrl` pour les anciens clients.

`character.profile` contient :

| Champ                 | Contrat                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `avatarId`            | Identifiant du portrait ; `aspirant-1-1` en repli                                   |
| `backgroundId`        | Identifiant du fond illustré (`joueur-1` … `joueur-8`), ou `null`                   |
| `backgroundColor`     | Teinte du fond uni `#RRGGBB` (majuscules), ou `null` ; ignorée si un fond illustré est équipé |
| `nicknameId`          | Identifiant du surnom équipé, ou `null`                                             |
| `frameId`             | Identifiant du cadre animé (`frame_ember`, `frame_volt`, …), ou `null`              |
| `unlockedNicknameIds` | Identifiants des surnoms gagnés, en ordre de progression                            |
| `nicknameCatalog`     | Catalogue des surnoms, au format `{ id, name: { en, fr }, criteria: { minLevel } }` |
| `unlockedFrameIds`    | Identifiants des cadres débloqués                                                   |
| `frameCatalog`        | Entrées de cadres possédés                                                          |

Le `PATCH` accepte au moins un des champs modifiables : `avatarId`, `backgroundId`, `backgroundColor`, `nicknameId`, `frameId`. Les champs omis restent inchangés. Le fond illustré, la teinte, le surnom et le cadre acceptent `null` pour revenir au thème par défaut ou déséquiper. Pour revenir au portrait par défaut, envoyer `"avatarId": "aspirant-1-1"`. Les identifiants inconnus, portraits de rang supérieur, couleurs non conformes, surnoms / cadres non gagnés sont refusés (`400`). Sans session : `401` (sous réserve du fallback démo existant) ; sans personnage : `404`.

## Profil public

`GET /api/players/:userId/public` (session requise) renvoie `{ player }` avec `userId`, `name`, `level`, `rank`, `factionId`, `faction`, `profile` (apparence publique uniquement — pas de monnaies ni d’inventaire).

Surfaces UI : classement, duels, coop, village (amis + mur + ninja à l’honneur).

## Honneur du jour & mur

- Points d’honneur UTC : +1 par victoire mission solo, mission coop ou duel de decks. Le ninja à l’honneur d’un village = meilleur score du jour (égalité : premier à l’atteindre). Exposé via `GET /api/deck-duels/factions` (`honorByFaction`) et `GET /api/community/honor`.
- Mur d’activité : `GET /api/community/activity?limit=&cursor=&factionId=&outcome=success|failure` — feed paginé (scroll infini) des succès/échecs de missions.

Les 32 portraits par collection sont numérotés `<collection>-<planche>-<case>` : planche `1` ou `2`, case `1` à `16` sur chaque grille 4×4 (de gauche à droite puis de haut en bas). Collections : `aspirant`, `genin`, `chunin`, `jonin`, `anbu`. Chaque collection est accessible à partir du rang correspondant ; Kage conserve l'accès à ANBU et aux collections précédentes.

| ID du surnom | Français           | English        | Critère |
| ------------ | ------------------ | -------------- | ------- |
| `genin`      | Shinobi en devenir | Rising Shinobi | Niveau 5 |
| `chunin`     | Vétéran du terrain | Field Veteran  | Niveau 20 |
| `jonin`      | Élite shinobi      | Shinobi Elite  | Niveau 40 |
| `anbu`       | Lame silencieuse   | Silent Blade   | Niveau 60 |
| `kage`       | Légende du village | Village Legend | Niveau 80 |
| `welcome`    | Mécène du Village  | Village Patron  | Pack bienvenue (one-shot) |
| `season_N`   | Ombre de la Saison N | Season N Shadow | Battle Pass premium (saison N) |
| `season_N_free` | Éclaireur de la Saison N | Season N Scout | Battle Pass gratuit niveau 4 |
| `ach_combat` / `ach_missions` / `ach_collection` / `ach_mastery` / `ach_progression` | Titres de familles du registre | Achievement family titles | Tous les paliers d’une catégorie claimés |

Les surnoms de rang restent disponibles après une réinitialisation administrative du niveau (via `character_highest_level`). Les titres `welcome` / `season_N` sont stockés dans `player_nickname_unlocks` et restent équipables une fois obtenus. Une réinitialisation admin remet le rang à Aspirant ninja et remplace le portrait équipé uniquement s'il n'appartient plus à un rang accessible.

## Réutilisation côté serveur

Importer `serializeCharacterAppearance` depuis `backend/src/services/characterAppearance.js`. Appeler `serializeCharacterAppearance(row)` avec une ligne de `player_profiles` ou une projection contenant `character_rank`, `character_level`, `character_highest_level`, `character_avatar_id`, `character_background_id`, `character_background_color`, `character_nickname_id` (alias sans le préfixe `character_` acceptés). La fonction est pure. Elle renvoie `{ avatarId, backgroundId, backgroundColor, nicknameId }`, sans données de progression ni d'authentification. Pour inclure les surnoms disponibles, utiliser aussi `unlockedNicknameIdsFor(row)` et `NICKNAME_CATALOG`.

## Mise à niveau MySQL

Le schéma initial `backend/schema.sql` est à jour pour les nouvelles bases. Pour une base existante, `npm run db:migrate` applique automatiquement la mise à niveau du profil et les colonnes de compatibilité ; le conteneur de production l'exécute également dans son entrypoint, avant de démarrer l'API. Sauvegarder la base avant de déployer.

La mise à niveau historique du profil (relançable) ajoute les colonnes d'avatar / fond de carte / surnom / plus haut niveau et étend l'ENUM du rang. Les bases déjà migrées reçoivent `character_background_id` et `character_background_color` via les colonnes de compatibilité si besoin ; `npm run db:migrate` retire encore l'ancienne colonne `character_border_color` si elle existe. Le catalogue d'identifiants de fond est partagé dans `shared/character/cardBackgrounds.js` ; la validation des teintes dans `shared/character/profileColors.js`.

En combat (PvE, coop, duels asynchrones), l'identité publique du combattant inclut `factionId` lorsqu'il est connu, afin d'afficher le village sur la fiche joueur.

Tests : `npm run test:player-character --prefix backend` (tests purs, puis tests HTTP et d'intégration si une base de test est disponible).
