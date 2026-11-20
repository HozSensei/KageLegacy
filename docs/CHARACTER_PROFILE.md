# Profil personnage

## Contrat API

`GET /api/player` et `PATCH /api/player/character/profile` renvoient `{ character }`. Le profil est disponible aux comptes et invités avec une session. `POST /api/player/create`, `POST /api/auth/register` et `POST /api/auth/guest` acceptent tous `avatarId` à la création ; seuls les portraits Aspirant ninja sont valides. Si le champ est absent ou `null`, le serveur utilise `aspirant-1-1`. `POST /api/player/create` accepte toujours l'ancien champ `avatarUrl`, que l'API conserve au niveau `character.avatarUrl` pour les anciens clients.

`character.profile` contient :

| Champ | Contrat |
| --- | --- |
| `avatarId` | Identifiant du portrait ; `aspirant-1-1` en repli |
| `borderColor` | `#RRGGBB` en majuscules, ou `null` |
| `backgroundColor` | `#RRGGBB` en majuscules, ou `null` |
| `nicknameId` | Identifiant du surnom équipé, ou `null` |
| `unlockedNicknameIds` | Identifiants des surnoms gagnés, en ordre de progression |
| `nicknameCatalog` | Catalogue des surnoms, au format `{ id, name: { en, fr }, criteria: { minLevel } }` |

Le `PATCH` accepte au moins un des quatre champs modifiables : `avatarId`, `borderColor`, `backgroundColor`, `nicknameId`. Les champs omis restent inchangés. Les couleurs et le surnom acceptent `null` pour revenir au thème par défaut ou déséquiper le surnom. Pour revenir au portrait par défaut, envoyer `"avatarId": "aspirant-1-1"`. Les identifiants inconnus, portraits de rang supérieur, couleurs non conformes et surnoms non gagnés sont refusés (`400`). Sans session : `401` (sous réserve du fallback démo existant) ; sans personnage : `404`.

Les 32 portraits par collection sont numérotés `<collection>-<planche>-<case>` : planche `1` ou `2`, case `1` à `16` sur chaque grille 4×4 (de gauche à droite puis de haut en bas). Collections : `aspirant`, `genin`, `chunin`, `jonin`, `anbu`. Chaque collection est accessible à partir du rang correspondant ; Kage conserve l'accès à ANBU et aux collections précédentes.

| ID du surnom | Français | English | Niveau atteint |
| --- | --- | --- | ---: |
| `genin` | Shinobi en devenir | Rising Shinobi | 5 |
| `chunin` | Vétéran du terrain | Field Veteran | 20 |
| `jonin` | Élite shinobi | Shinobi Elite | 40 |
| `anbu` | Lame silencieuse | Silent Blade | 60 |
| `kage` | Légende du village | Village Legend | 80 |

Les surnoms gagnés restent disponibles après une réinitialisation administrative du niveau. Une telle réinitialisation remet le rang à Aspirant ninja et remplace le portrait équipé uniquement s'il n'appartient plus à un rang accessible.

## Réutilisation côté serveur

Importer `serializeCharacterAppearance` depuis `backend/src/services/characterAppearance.js`. Appeler `serializeCharacterAppearance(row)` avec une ligne de `player_profiles` ou une projection contenant `character_rank`, `character_level`, `character_highest_level`, `character_avatar_id`, `character_border_color`, `character_background_color`, `character_nickname_id` (alias sans le préfixe `character_` acceptés). La fonction est pure. Elle renvoie `{ avatarId, borderColor, backgroundColor, nicknameId }`, sans données de progression ni d'authentification. Pour inclure les surnoms disponibles, utiliser aussi `unlockedNicknameIdsFor(row)` et `NICKNAME_CATALOG`.

## Mise à niveau MySQL

Le schéma initial `backend/schema.sql` est à jour pour les nouvelles bases. Pour une base MySQL 8.0 existante, sauvegarder la base, tester la mise à niveau sur une copie, arrêter les applications qui écrivent dans la base, puis appliquer le script avant de démarrer le nouveau backend :

```sh
mysql -h db-host -u migration-user -p nom_de_la_base < backend/etc/upgrade-character-profile.sql
```

Ne pas réimporter `schema.sql` et ne pas utiliser `db:migrate` pour ce changement. Le script est relançable : il applique les modifications de schéma ensemble, puis initialise le plus haut niveau connu au niveau actuel des personnages existants. Les anciens Genin de niveau 1 à 4 (et profils Genin sans personnage) deviennent Aspirant ninja. Les autres rangs, noms, niveaux, XP, URL d'avatar et comptes existants sont conservés. Les nouvelles colonnes de `player_profiles` sont `character_avatar_id` (défaut `aspirant-1-1`), `character_border_color`, `character_background_color`, `character_nickname_id` (nullables), et `character_highest_level` (défaut `1`). Le script ne peut pas reconstituer un niveau atteint puis réinitialisé avant la mise à niveau.

Vérifier la présence des colonnes et que les anciens Genin de niveau inférieur à 5 ont été reclassés avant de relancer les écrivains. En cas de restauration vers l'ancien schéma, utiliser la sauvegarde (le DDL MySQL n'est pas annulable par `ROLLBACK`).

Tests : `npm run test:player-character --prefix backend` (tests purs, puis tests HTTP et d'intégration si une base de test est disponible).
