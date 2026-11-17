# Battle Pass

Le Battle Pass propose une piste gratuite et une piste premium. Sa saison active, ses niveaux, son XP et ses récompenses sont stockés en base et servis par les routes `/api/battle-pass`.

## Ce qui est pris en charge

- Progression de niveau et quêtes.
- Récompenses en Ryos, poussière, essence, Kage Coins, cartes et boosters.
- Déblocage de la piste premium par Kage Coins ou Stripe quand celui-ci est configuré.
- Achat limité de niveaux, selon les constantes de `backend/src/config/economyConfig.js`.

## Source de vérité

- Règles et coûts : `backend/src/config/economyConfig.js`.
- Récompenses de la saison seedée : `backend/scripts/data/battlePassSeason1.js`.
- Attribution et claims : `backend/src/services/battlePassService.js`.

Les cosmétiques ne font pas partie du Battle Pass actuel. Les anciennes récompenses cosmétiques éventuellement présentes dans une saison historique sont filtrées et ne sont plus attribuées.

## Prudence

Les rewards doivent être attribuées de manière atomique et idempotente avant toute ouverture à des joueurs réels. Consulter [`AUDIT_2026-11-17.md`](./AUDIT_2026-11-17.md) pour les risques identifiés.
