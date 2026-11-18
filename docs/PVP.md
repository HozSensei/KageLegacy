# PvP

## Architecture

Le PvP est host-authoritative avec un modèle de confiance `trust_host`.

Le serveur :

- gère la file et les invitations ;
- crée le match ;
- choisit Host et Guest ;
- valide le snapshot de deck ;
- relaie les actions et états ;
- compare les checksums ;
- enregistre le résultat confirmé.

La résolution des cartes est exécutée par le client Host avec `shared/pvp/duelEngine.js`. Les modules partagés réutilisent les règles pures du combat backend.

## Préconditions

- compte authentifié ;
- deck jouable de 20 à 30 cartes ;
- session WebSocket active pour le duel.

La fenêtre de niveau par défaut est ±3. Les valeurs autorisées côté configuration sont 3 et 5, tandis que l'API accepte une valeur comprise entre 0 et 20 et applique la plus restrictive des deux joueurs.

## File et invitations

Endpoints principaux sous `/api/pvp` :

- configuration ;
- entrée, consultation et sortie de file ;
- création et acceptation d'invitation ;
- bootstrap du match ;
- ready, report et cancel.

Les codes d'invitation contiennent 8 caractères et expirent après 30 minutes.

## Transport

HTTP fournit la découverte et le cycle de match. Le WebSocket `/ws/pvp` fournit :

- `ping` ;
- `subscribe` ;
- `action` ;
- `state_sync` ;
- `match_end`.

L'authentification WebSocket lit le cookie de session `kage_session`.

## Résultats

Le Host rapporte le gagnant. Le Guest confirme à partir du checksum. Un écart de checksum place le match en `voided`. Le délai de confirmation est de 5 minutes.

Les limites sont en mémoire et par processus :

- file : 8/min ;
- création d'invitation : 5/min ;
- acceptation : 8/min ;
- report : 12/min.

Elles ne sont donc pas globales sur plusieurs instances de l'API.

## Progression

Entrer en file progresse les quêtes Battle Pass de participation. Un match `completed` alimente les succès PvP et le classement des victoires.

Il n'existe actuellement ni ELO, ni saison PvP, ni récompense de match.

## Limites connues

### WebSocket et proxy

Le serveur expose `/ws/pvp`, mais la configuration Nginx actuelle proxy seulement `/api/`. Vite proxy aussi seulement `/api`. En production dans l'image Docker, le WebSocket peut donc rester inaccessible sans configuration de proxy supplémentaire avec les en-têtes Upgrade.

Le client utilise l'origine de `VITE_API_URL` si celle-ci est fournie. En développement local, configurer cette variable est recommandé pour le PvP.

### Confiance Host

Le serveur ne rejoue pas les cartes pour vérifier chaque action. La sécurité repose sur le client Host, le checksum et les validations du résumé. Ce mode n'est pas adapté à un classement PvP compétitif anti-triche.

### Abandons et parité

Les abandons sont marqués `forfeited` et ne comptent pas comme des matchs terminés pour les victoires. Le moteur PvP est aligné sur le cœur des cartes, mais certaines données PvE — par exemple l'affinité adverse ou l'exhaust — peuvent ne pas être transmises dans le bootstrap.

Avant une promotion compétitive du PvP, traiter le proxy WebSocket, l'autorité serveur et la parité des données comme des prérequis.
