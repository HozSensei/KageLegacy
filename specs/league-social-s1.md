# Vague S1 — Social de ligue

**Statut :** implémenté (juil. 2026)

## Périmètre

1. **Mur de ligue** — fil de **saison** entière, **sans quota**, **pagination**, reset à la fin de saison (promotion / relégation / nouveau `season_number`).
2. **H2H + némésis + défi recon** — classement et prochain match ; défis aussi vers **autres ligues** (division proche), **acceptation requise**.
3. **Invite polish** — compteur humains / bots + copie / partage du lien.

Hors scope : match de la journée, réactions emoji, quotas mur.

## Règles mur

| Règle | Valeur |
|-------|--------|
| Portée | `pool_id` + `season_number` |
| Longueur | 1–280 caractères |
| Quota | Aucun |
| Modération | Liste minimale FR/EN : mot → 1ʳᵉ lettre + `*` (ex. `merde` → `m****`) |
| Pagination | 20 posts / page (`beforeId`) |
| Auteurs | Humains membres de la pool |
| Reset | Nouvelle saison → mur vide (filtre `season_number`) |

## Défi recon

- Même pool **ou** autre ligue (division ± tolérance), via `listExternalOpponents`.
- Flux : envoi → notif → **acceptation** défenseur → combat H36.
- Fenêtre CTA : H0–H35.

## API

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/league` | Standings enrichis (h2h, némésis, `canChallengeRecon`) + `pool.roster` |
| `GET` | `/api/league/wall?beforeId=&limit=` | Page mur |
| `POST` | `/api/league/wall` | `{ body }` |
| `GET` | `/api/league/invite` | URL + roster |
| `GET` | `/api/league/challenge-targets` | Cibles hors pool (division proche) |
| `POST` | `/api/reconnaissance/challenges` | Défi (existant) |

## Fichiers clés

- `backend/migrations/062_league_wall_social.sql`
- `backend/src/services/leagueWallService.js`
- `backend/src/services/leagueSocialService.js`
- `frontend/src/components/league/LeagueWallPanel.vue`
- `frontend/src/views/LeagueView.vue`

## Tests

`npm run test:league-wall --prefix backend`
