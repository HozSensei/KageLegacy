# Profil personnage

## Contrat API

`GET /api/player` et `PATCH /api/player/character/profile` renvoient `{ character }`. Le profil est disponible aux comptes et invités avec une session. `POST /api/player/create`, `POST /api/auth/register` et `POST /api/auth/guest` acceptent tous `avatarId` à la création ; seuls les portraits Aspirant ninja sont valides. Si le champ est absent ou `null`, le serveur utilise `aspirant-1-1`. `POST /api/player/create` accepte toujours l'ancien champ `avatarUrl`, que l'API conserve au niveau `character.avatarUrl` pour les anciens clients.

`character.profile` contient :

| Champ                 | Contrat                                                                             |
| --------------------- | ----------------------------------------------------------------------------------- |
| `avatarId`            | Identifiant du portrait ; `aspirant-1-1` en repli                                   |
| `borderColor`         | `#RRGGBB` en majuscules, ou `null`                                                  |
| `backgroundColor`     | `#RRGGBB` en majuscules, ou `null`                                                  |
| `nicknameId`          | Identifiant du surnom équipé, ou `null`                                             |
| `unlockedNicknameIds` | Identifiants des surnoms gagnés, en ordre de progression                            |
| `nicknameCatalog`     | Catalogue des surnoms, au format `{ id, name: { en, fr }, criteria: { minLevel } }` |

Le `PATCH` accepte au moins un des quatre champs modifiables : `avatarId`, `borderColor`, `backgroundColor`, `nicknameId`. Les champs omis restent inchangés. Les couleurs et le surnom acceptent `null` pour revenir au thème par défaut ou déséquiper le surnom. Pour revenir au portrait par défaut, envoyer `"avatarId": "aspirant-1-1"`. Les identifiants inconnus, portraits de rang supérieur, couleurs non conformes et surnoms non gagnés sont refusés (`400`). Sans session : `401` (sous réserve du fallback démo existant) ; sans personnage : `404`.

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

Importer `serializeCharacterAppearance` depuis `backend/src/services/characterAppearance.js`. Appeler `serializeCharacterAppearance(row)` avec une ligne de `player_profiles` ou une projection contenant `character_rank`, `character_level`, `character_highest_level`, `character_avatar_id`, `character_border_color`, `character_background_color`, `character_nickname_id` (alias sans le préfixe `character_` acceptés). La fonction est pure. Elle renvoie `{ avatarId, borderColor, backgroundColor, nicknameId }`, sans données de progression ni d'authentification. Pour inclure les surnoms disponibles, utiliser aussi `unlockedNicknameIdsFor(row)` et `NICKNAME_CATALOG`.

## Mise à niveau MySQL

Le schéma initial `backend/schema.sql` est à jour pour les nouvelles bases. Pour une base existante, `npm run db:migrate` applique automatiquement la mise à niveau du profil ; le conteneur de production l'exécute également dans son entrypoint, avant de démarrer l'API. Sauvegarder la base avant de déployer et vérifier dans les logs du conteneur la ligne `Profil de personnage migré` au premier démarrage concerné.

La mise à niveau est relançable et utilise un DDL atomique : elle ajoute les colonnes `character_avatar_id` (défaut `aspirant-1-1`), `character_border_color`, `character_background_color`, `character_nickname_id` (nullables), et `character_highest_level` (défaut `1`), puis étend l'ENUM du rang en ajoutant « Aspirant ninja » à la fin pour conserver les ordinaux existants. Elle initialise le plus haut niveau connu au niveau actuel des personnages, et reclasse les Genin de niveau 1 à 4 (ainsi que les profils sans personnage) en Aspirant ninja. Les autres rangs, noms, niveaux, XP, URL d'avatar et comptes existants sont conservés. Le script manuel `backend/etc/upgrade-character-profile.sql` est conservé pour les installations qui doivent appliquer cette mise à niveau avant de pouvoir déployer une image contenant le changement.

Vérifier la présence des colonnes après le démarrage. En cas de restauration vers l'ancien schéma, utiliser la sauvegarde (le DDL MySQL n'est pas annulable par `ROLLBACK`).

Tests : `npm run test:player-character --prefix backend` (tests purs, puis tests HTTP et d'intégration si une base de test est disponible).
