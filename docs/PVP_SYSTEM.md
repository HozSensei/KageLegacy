# Système PvP — Architecture Host

## Résumé

Le PvP de **Kage Legacy V2** ne réutilise **pas** le moteur PvE comme autorité continue. Une fois le match trouvé :

| Rôle | Qui | Responsabilité |
|------|-----|----------------|
| **Host** | Un des deux joueurs (désigné à la création du match) | Source de vérité du duel : applique les cartes, enchaîne les tours, diffuse l’état |
| **Guest** | L’autre joueur | Envoie des **intentions** (jouer / fin de tour / défausse / abandon) ; reçoit l’état synchronisé ; **challenge checksum** en fin de match |
| **Serveur** | API + WebSocket | File d’attente, création match, désignation Host/Guest, **validation bootstrap**, relay signaling, **sanity-checks** + guest challenge fin de match |

## Ce que le serveur FAIT

1. **Matchmaking** — file `pvp_queue`, jumelage ± niveau (défaut **±3**, configurable **±5**)
2. **Création de match** — table `pvp_matches`, seed déterministe, snapshot bootstrap (decks + stats)
3. **Validation bootstrap** — decks / HP / niveaux / userIds cohérents avant duel
4. **Désignation Host / Guest** — déterministe (plus petit `userId` → Host)
5. **Signaling WebSocket** (`/ws/pvp`) — abonnements, relay `action` Guest→Host, relay `state_sync` Host→Guest
6. **Fin de match** — sanity-checks (HP, tours, durée, gagnant), checksums Host/Guest, **void si mismatch**
7. **Rate-limit** — file d’attente + report (anti-spam in-memory)
8. **Logs d’anomalies** — lignes `[pvp-anomaly] {…}` (stdout)

## Ce que le serveur NE FAIT PAS

- Recalculer chaque carte jouée comme en combat PvE authoritative
- Être la source de vérité continue du HP / main / chakra pendant le duel
- Résoudre les critiques / pioches en live (c’est le **Host client**)
- Détecter un Host qui ment **de façon cohérente** sur tout le duel (state_sync + report alignés)

## Flux

```
Joueur A ──POST /api/pvp/queue──► Serveur
Joueur B ──POST /api/pvp/queue──► Serveur
                    │
                    ▼
         findBestMatch(± niveau)
                    │
                    ▼
         designateHost(A, B) + bootstrap decks/stats
         + validateBootstrap (niveaux/decks/HP)
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
   Host (client)          Guest (client)
   moteur duel            intentions
   shared/pvp/duelEngine  ──WS action──► Host
         │
         └──WS state_sync──► Guest
                    │
                    ▼
         Host POST /api/pvp/matches/:id/report
         (checksum + summary) — sanity-checks serveur
                    │
         Guest POST …/report { confirmOnly, checksum }
                    │
         checksums égaux → completed
         checksums ≠     → cancelled (void_checksum_mismatch)
```

## Anti-triche MVP (`trust_host` renforcé)

Mode documenté : **`trust_host`** + **guest challenge**

| Contrôle | Effet |
|----------|--------|
| Bootstrap validé | Rejette decks / stats / niveaux incohérents à la création |
| Sanity result | Rejette HP absurdes, tours hors plage, durée trop courte/longue, gagnant hors participants, perdant HP>0 sans forfeit |
| Checksum FNV-1a 64-bit | Empreinte hex 16 du résumé canonique (sans mains secrètes) |
| Guest challenge | Guest renvoie une empreinte indépendante depuis la vue publique ; mismatch → **match void** |
| Rate-limit | Queue ~8/min, report ~12/min par user |
| Anomaly logs | `[pvp-anomaly]` JSON (bootstrap_rejected, result_rejected, checksum_host_guest_mismatch, rate_limit_*) |

### Ce qui reste trust-host

- Pendant le duel, le Host peut biaiser HP / critiques / pioches **tant que** state_sync et report restent cohérents entre eux
- Le Guest ne reconstruit pas un journal d’actions complet : le challenge compare le **résumé observable**, pas un replay serveur
- Pas de ranking / sanctions automatiques encore (void + flag + log seulement)
- Rate-limit in-memory (reset au redémarrage process ; pas multi-instance)

Hooks futurs : rejeu seed + log d’actions, consensus plus fort, ELO / ban flags persistants.

## API REST

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/pvp/config` | Fenêtre de niveau, mode anti-triche, path WS, capacités serveur |
| POST | `/api/pvp/queue` | Entrer en file (`levelWindow`, `deckId`) — rate-limité |
| GET | `/api/pvp/queue` | Statut file / match actif |
| DELETE | `/api/pvp/queue` | Quitter la file |
| GET | `/api/pvp/matches/:id` | Détail + bootstrap |
| POST | `/api/pvp/matches/:id/ready` | Prêt → démarre quand les deux sont prêts |
| POST | `/api/pvp/matches/:id/report` | Fin de match / checksum / guest challenge |
| POST | `/api/pvp/matches/:id/cancel` | Annuler (pending/ready) |

Match void : `status=cancelled`, `endReason=void_checksum_mismatch`, `voided=true`, flags dans `resultSummary`.

## WebSocket `/ws/pvp`

Messages principaux :

- `subscribe` `{ matchId }` → `subscribed` (rôle host|guest + match)
- `action` `{ action }` — Guest → relayé au Host comme `peer_action`
- `state_sync` `{ state, checksum }` — Host → Guest comme `state`
- `match_end` — notification bilatérale (Guest déclenche challenge)
- `peer_joined` / `peer_disconnected`

Auth : cookie de session `kage_session` (même mécanisme que l’API).

## Schéma DB (migration `109_pvp_system.sql`)

- `pvp_queue` — joueurs en attente
- `pvp_matches` — host/guest, seed, bootstrap_json, checksums, statut

Namespace clair `pvp_*` — pas de collision avec shop / missions / economy.

Void = `cancelled` + `end_reason='void_checksum_mismatch'` (pas de nouvelle ENUM pour limiter les collisions de migrations).

## Code partagé

```
shared/pvp/
  config.js          — fenêtre de niveau, mode anti-triche
  matchmaking.js     — isLevelInWindow, findBestMatch, designateHost
  duelEngine.js      — simu Host (client)
  checksum.js        — résumé + fingerprint 64-bit
  antiCheat.js       — validateBootstrap, validateMatchResultReport, guest challenge
  seededRng.js       — PRNG déterministe

backend/src/services/pvp/
  matchmakingService.js
  pvpMatchService.js
  pvpDuelBootstrap.js
  pvpBootstrapValidation.js
  pvpRateLimit.js
  pvpAnomalyLog.js
  pvpHostSession.js
  config.js
```

## Frontend

- `/pvp` — file d’attente
- `/pvp/duel/:id` — arène avec badge **Host** / **Guest**
- Store Pinia `pvp` + composant `PvpArena`
- Guest : `maybeGuestChallenge` après fin de match (empreinte indépendante)

## Limites MVP

- Pas de WebRTC datachannel (WS relay suffisant)
- Moteur duel simplifié (attaque / armure / soin / chakra) vs full PvE (talents, invocations…)
- Trust-host cohérent : un Host malveillant alignant sync + report peut encore biaiser le résultat
- Pas de ranking / ELO / récompenses saison encore
- Rate-limit non distribué

## Tests

```bash
npm run test:pvp-matchmaking --prefix backend
```

Couvre la fenêtre de niveau, le choix du meilleur adversaire, la désignation Host, les validations anti-triche (bootstrap, résultats impossibles, guest challenge checksum).
