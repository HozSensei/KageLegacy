# Système PvP — Architecture Host

## Résumé

Le PvP de **Kage Legacy V2** ne réutilise **pas** le moteur PvE comme autorité continue. Une fois le match trouvé :

| Rôle | Qui | Responsabilité |
|------|-----|----------------|
| **Host** | Un des deux joueurs (désigné à la création du match) | Source de vérité du duel : applique les cartes, enchaîne les tours, diffuse l’état |
| **Guest** | L’autre joueur | Envoie des **intentions** (jouer / fin de tour / défausse / abandon) ; reçoit l’état synchronisé |
| **Serveur** | API + WebSocket | File d’attente, création match, désignation Host/Guest, bootstrap initial, **relay** signaling, validation sommaire de fin de match |

## Ce que le serveur FAIT

1. **Matchmaking** — file `pvp_queue`, jumelage ± niveau (défaut **±3**, configurable **±5**)
2. **Création de match** — table `pvp_matches`, seed déterministe, snapshot bootstrap (decks + stats)
3. **Désignation Host / Guest** — déterministe (plus petit `userId` → Host)
4. **Signaling WebSocket** (`/ws/pvp`) — abonnements, relay `action` Guest→Host, relay `state_sync` Host→Guest
5. **Fin de match** — enregistre winner, checksums, résumé (`trust_host` MVP)

## Ce que le serveur NE FAIT PAS

- Recalculer chaque carte jouée comme en combat PvE authoritative
- Être la source de vérité continue du HP / main / chakra pendant le duel
- Résoudre les critiques / pioches en live (c’est le **Host client**)

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
         (checksum + summary)
```

## Anti-triche MVP

Mode documenté : **`trust_host`**

- Le Host reporte le résultat + empreinte (`checksum`) d’un résumé d’état
- Le Guest peut enregistrer son propre checksum (hooks futurs de comparaison)
- Pas de resimulation serveur carte-par-carte
- Hooks prêts pour validation future (rejeu seed + log d’actions, consensus des deux checksums, etc.)

## API REST

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `/api/pvp/config` | Fenêtre de niveau, mode anti-triche, path WS |
| POST | `/api/pvp/queue` | Entrer en file (`levelWindow`, `deckId`) |
| GET | `/api/pvp/queue` | Statut file / match actif |
| DELETE | `/api/pvp/queue` | Quitter la file |
| GET | `/api/pvp/matches/:id` | Détail + bootstrap |
| POST | `/api/pvp/matches/:id/ready` | Prêt → démarre quand les deux sont prêts |
| POST | `/api/pvp/matches/:id/report` | Fin de match / checksum |
| POST | `/api/pvp/matches/:id/cancel` | Annuler (pending/ready) |

## WebSocket `/ws/pvp`

Messages principaux :

- `subscribe` `{ matchId }` → `subscribed` (rôle host|guest + match)
- `action` `{ action }` — Guest → relayé au Host comme `peer_action`
- `state_sync` `{ state, checksum }` — Host → Guest comme `state`
- `match_end` — notification bilatérale
- `peer_joined` / `peer_disconnected`

Auth : cookie de session `kage_session` (même mécanisme que l’API).

## Schéma DB (migration `109_pvp_system.sql`)

- `pvp_queue` — joueurs en attente
- `pvp_matches` — host/guest, seed, bootstrap_json, checksums, statut

Namespace clair `pvp_*` — pas de collision avec shop / missions / economy.

## Code partagé

```
shared/pvp/
  config.js          — fenêtre de niveau, mode anti-triche
  matchmaking.js     — isLevelInWindow, findBestMatch, designateHost
  duelEngine.js      — simu Host (client)
  checksum.js        — résumé + fingerprint
  seededRng.js       — PRNG déterministe
```

## Frontend

- `/pvp` — file d’attente
- `/pvp/duel/:id` — arène avec badge **Host** / **Guest**
- Store Pinia `pvp` + composant `PvpArena`

## Limites MVP

- Pas de WebRTC datachannel (WS relay suffisant)
- Moteur duel simplifié (attaque / armure / soin / chakra) vs full PvE (talents, invocations…)
- Trust-host : un Host malveillant peut biaiser le résultat — acceptable MVP, validation renforcée plus tard
- Pas de ranking / ELO / récompenses saison encore

## Tests

```bash
npm run test:pvp-matchmaking --prefix backend
```

Couvre la fenêtre de niveau, le choix du meilleur adversaire, et la désignation Host.
