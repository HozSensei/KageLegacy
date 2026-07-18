# Gameplay fun roadmap (juil. 2026)

Implémentation de l'audit fun : points 2 → 3 → 4 → 5 → 1.

## Point 2 — Agence tactique

- **Débrief causal** (`combat/pli/causalDebrief.js`) : jusqu'à 3 causes post-match pour tous les participants (domaines, carte technique, forme, relais…).
- **Preview matchup** (`deckMatchupPreview.js`) : dans le briefing d'opération dès que le deck adverse est visible.
- **Onboarding cycle 1** : checklist Bureau (deck, entraînement, mission, recon, ligue) — **sans** masquage de features.

## Point 3 — Creux mid-cycle

- **Objectifs de cycle** : 1–2 challenges (victoire ligue, missions C+, examen, recon) + prime Ryos.
- **Rumeur mid-cycle** (H36–H70) : 200 Ryos, info domaine imparfaite (≈70 %).

## Point 4 — Pics émotionnels

- **Némésis** : 2 défaites consécutives vs le même Sensei.
- **Upset** : notification spéciale underdog.
- **Vol d'Oiseau** : payload cérémonie + highlights des 2 derniers matchs.

## Point 5 — Legacy

- Suppression `duelResolution.js` (non référencé).
- Constantes combat legacy marquées `@deprecated`.
- Narratif KO aligné deck/forme (plus consignes/chakra).

## Point 1 — Docs

- `docs/game-design-reference.md` : victoire pli = PV → plis.
- Règles joueur FR/EN : débrief causal + preview.
- `specs/composition-triangle.md` : historique uniquement.
- Milestone 9 : note de recalibrage pli.

## Migration

`061_gameplay_fun_roadmap.sql` · `063_onboarding_complete.sql` (flags training / recon / ligue)

## API

- `GET/POST /api/gameplay/onboarding/:step`
- `GET /api/gameplay/cycle-objectives`
- `GET /api/gameplay/midcycle`
- `POST /api/gameplay/midcycle/rumor`

## Tests

`npm run test:causal-debrief --prefix backend`
