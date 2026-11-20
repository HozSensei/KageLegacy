# Profil personnage

## Contrat API

`GET /api/player` et `PATCH /api/player/character/profile` renvoient `{ character }`. Le profil est disponible aux comptes et invités avec une session. `POST /api/player/create`, `POST /api/auth/register` et `POST /api/auth/guest` acceptent tous `avatarId` à la création ; seuls les portraits Aspirant ninja sont valides. Si le champ est absent ou `null`, le serveur utilise `aspirant-1-1`. `POST /api/player/create` accepte toujours l'ancien champ `avatarUrl`, que l'API conserve au niveau `character.avatarUrl` pour les anciens clients.

`character.profile` contient :

| Champ                 | Contrat                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `avatarId`            | Identifiant du portrait ; `aspirant-1-1` en repli                                   |
| `backgroundId`        | Identifiant du fond illustré (`joueur-1`, `joueur-2`), ou `null`                    |
| `nicknameId`          | Identifiant du surnom équipé, ou `null`                                             |
| `unlockedNicknameIds` | Identifiants des surnoms gagnés, en ordre de progression                            |
| `nicknameCatalog`     | Catalogue des surnoms, au format `{ id, name: { en, fr }, criteria: { minLevel } }` |

Le `PATCH` accepte au moins un des trois champs modifiables : `avatarId`, `backgroundId`, `nicknameId`. Les champs omis restent inchangés. Le fond et le surnom acceptent `null` pour revenir au thème par défaut ou déséquiper le surnom. Pour revenir au portrait par défaut, envoyer `"avatarId": "aspirant-1-1"`. Les identifiants inconnus, portraits de rang supérieur et surnoms non gagnés sont refusés (`400`). Sans session : `401` (sous réserve du fallback démo existant) ; sans personnage : `404`.

Les 32 portraits par collection sont numérotés `<collection>-<planche>-<case>` : planche `1` ou `2`, case `1` à `16` sur chaque grille 4×4 (de gauche à droite puis de haut en bas). Collections : `aspirant`, `genin`, `chunin`, `jonin`, `anbu`. Chaque collection est accessible à partir du rang correspondant ; Kage conserve l'accès à ANBU et aux collections précédentes.

| ID du surnom | Français           | English        | Niveau atteint |
| ------------ | ------------------ | -------------- | -------------: |
| `genin`      | Shinobi en devenir | Rising Shinobi |              5 |
| `chunin`     | Vétéran du terrain | Field Veteran  |             20 |
| `jonin`      | Élite shinobi      | Shinobi Elite  |             40 |
| `anbu`       | Lame silencieuse   | Silent Blade   |             60 |
| `kage`       | Légende du village | Village Legend |             80 |

Les surnoms gagnés restent disponibles après une réinitialisation administrative du niveau. Une telle réinitialisation remet le rang à Aspirant ninja et remplace le portrait équipé uniquement s'il n'appartient plus à un rang accessible.

## Réutilisation côté serveur

Importer `serializeCharacterAppearance` depuis `backend/src/services/characterAppearance.js`. Appeler `serializeCharacterAppearance(row)` avec une ligne de `player_profiles` ou une projection contenant `character_rank`, `character_level`, `character_highest_level`, `character_avatar_id`, `character_background_id`, `character_nickname_id` (alias sans le préfixe `character_` acceptés). La fonction est pure. Elle renvoie `{ avatarId, backgroundId, nicknameId }`, sans données de progression ni d'authentification. Pour inclure les surnoms disponibles, utiliser aussi `unlockedNicknameIdsFor(row)` et `NICKNAME_CATALOG`.

## Mise à niveau MySQL

Le schéma initial `backend/schema.sql` est à jour pour les nouvelles bases. Pour une base existante, `npm run db:migrate` applique automatiquement la mise à niveau du profil et les colonnes de compatibilité ; le conteneur de production l'exécute également dans son entrypoint, avant de démarrer l'API. Sauvegarder la base avant de déployer.

La mise à niveau historique du profil (relançable) ajoute les colonnes d'avatar / fond de carte / surnom / plus haut niveau et étend l'ENUM du rang. Les bases déjà migrées reçoivent `character_background_id` via les colonnes de compatibilité si besoin, puis `npm run db:migrate` retire les anciennes colonnes `character_border_color` / `character_background_color` lorsqu'elles existent encore. Le catalogue d'identifiants de fond est partagé dans `shared/character/cardBackgrounds.js`.

En combat (PvE, coop, PvP, duels asynchrones), l'identité publique du combattant inclut `factionId` lorsqu'il est connu, afin d'afficher le village sur la fiche joueur.

Tests : `npm run test:player-character --prefix backend` (tests purs, puis tests HTTP et d'intégration si une base de test est disponible).
