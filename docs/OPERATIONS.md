# Exploitation

## Environnements

Le backend lit d'abord `backend/../../../.env` puis `.env` selon la configuration du point d'entrée. Toujours partir des gabarits fournis et ne jamais committer les valeurs réelles.

Variables principales :

### API et DB

- `NODE_ENV`
- `PORT`
- `CORS_ORIGIN`
- `APP_PUBLIC_URL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Frontend

- `VITE_API_URL`

Pour le build Docker même origine, cette valeur reste vide et Nginx proxy `/api`. Pour le développement PvP, elle doit viser l'API afin que l'URL WebSocket soit construite vers le bon host.

### Runtime

- `ENABLE_SCHEDULER`
- `AUTH_DEMO_FALLBACK`
- `SKIP_V2_SEEDS`
- `ENABLE_DEV_TOOLS`
- `E2E_ALLOW_SEED`
- `COMBAT_BALANCE_REPORT`
- `COMBAT_BALANCE_STRICT`

`AUTH_DEMO_FALLBACK` et les stubs ne doivent pas être activés sur une production utilisateur normale.

### Google Sign-In

- `GOOGLE_CLIENT_ID` — Client ID OAuth 2.0 (type *Web application*) créé dans Google Cloud Console. Le frontend lit la config via `GET /api/auth/providers` ; aucune variable `VITE_*` n’est requise. Sans `GOOGLE_CLIENT_ID`, le bouton Google reste masqué.
- Dans la console Google : origines JavaScript autorisées = URL du frontend ; URI de redirection autorisés = même origine (GIS en mode popup).
- Règle métier : même adresse e-mail Google = même compte (liaison OAuth si le compte existait déjà en email/mot de passe). Un invité sans conflit d’e-mail est converti via Google.

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_BATTLE_PASS`
- `STRIPE_PRICE_ID_WELCOME` (optionnel — pack bienvenue 5 €)
- `STRIPE_PRICE_ID_COIN_SPARK`
- `STRIPE_PRICE_ID_COIN_EMBER`
- `STRIPE_PRICE_ID_COIN_FORGE`
- `STRIPE_PRICE_ID_COIN_VAULT`
- `SHOP_COIN_STUB`
- `BATTLE_PASS_STUB_UNLOCK`

Stripe est monté avec le corps brut sur `/api/stripe/webhook` avant le parseur JSON.

## Docker local

`docker-compose.yml` fournit MySQL 8 sur le port 3306. Le frontend et le backend restent lancés par npm hors conteneur pendant le développement.

## Image de production

`Dockerfile` :

1. compile Vue/Vite ;
2. installe les dépendances backend de production ;
3. copie l'API et les modules PvP partagés ;
4. sert le frontend avec Nginx ;
5. proxy `/api/` vers Node sur le port 3000 ;
6. lance l'entrypoint Docker.

`docker-compose.prod.yml` attend une base MySQL externe et publie `${KAGE_HOST_PORT:-3002}` sur le port 80 de l'image. L'image tirée est `ghcr.io/hozsensei/kage-legacy:main`.

### Release Docker (GHCR)

Le workflow `Docker publish` ne s'exécute plus à chaque merge sur `main`. Il publie uniquement :

- sur push d'un tag semver `vX.Y.Z` (ex. `v1.2.3`) ;
- ou via déclenchement manuel (`workflow_dispatch`).

Tags poussés pour une release `v1.2.3` : `v1.2.3`, `1.2.3`, et `main` (pointeur prod).

Exemple :

```bash
git checkout main && git pull
git tag v1.2.3
git push origin v1.2.3
# Sur le NAS :
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Pour purger d'anciennes versions GHCR : Actions → **GHCR cleanup** → Run workflow avec `confirm=delete-all` (optionnel : `min_versions_to_keep`, `0` = tout supprimer).

Certaines variables historiques (cycle, anchors) peuvent encore figurer dans d’anciens fichiers d’environnement ; elles ne sont pas consommées par le produit actuel.

## WebSocket en production

Nginx actuel ne proxy pas `/ws/pvp`. Une location dédiée avec `Upgrade` et `Connection` est nécessaire pour activer le PvP dans l'image. Le serveur expose déjà le WebSocket sur le même processus Node.

Exemple conceptuel à adapter :

```nginx
location /ws/ {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

## Scheduler

`ENABLE_SCHEDULER=false` désactive le scheduler.

Lorsqu'il est actif, il s'exécute une fois à minuit UTC pour :

- purger les comptes invités expirés ;
- rafraîchir les fenêtres de quêtes Battle Pass ;
- clôturer les semaines de village dues. Le versement est aussi vérifié au démarrage et rattrape les semaines manquées.

Les lots de village sont protégés par un verrou et un registre transactionnels en base. Pour les autres tâches, en multi-instance, conserver un seul scheduler actif sauf si elles disposent de leurs propres garde-fous.

## Déploiement DB

Le dépôt ne supporte que le schéma initial sur base vide. Pour un déploiement déjà existant, toute évolution structurante doit être :

1. auditée ;
2. écrite comme migration opérationnelle séparée ;
3. sauvegardée ;
4. testée sur copie de production ;
5. appliquée avant de déployer le code qui dépend de la nouvelle colonne.

Les changements récents incluent notamment `stat_type='common'` et `held_effect_json` dans `card_definitions`. Le migrateur comporte un rattrapage additif ciblé pour le [Duel de decks](ASYNC_DUELS.md) et ses lots de village ; il ne constitue pas un système général de migrations incrémentales.

Pour une base existante, le [profil personnage](CHARACTER_PROFILE.md#mise-à-niveau-mysql) nécessite l'exécution du script SQL dédié avant le déploiement.

## Stripe

Le webhook gère `checkout.session.completed` et exige un paiement `paid`. La confirmation de retour sert aussi de secours.

Le service réalise l'accomplissement de façon idempotente par identifiant Stripe. Vérifier également en production :

- URL publique HTTPS ;
- origine CORS ;
- secret webhook distinct ;
- redirects de succès/annulation ;
- correspondance du montant enregistré avec le prix Stripe configuré.

## Sauvegardes et secrets

- sauvegarder MySQL avant seed, reset ou changement de schéma ;
- ne jamais exposer les variables Stripe ou DB côté frontend ;
- restreindre l'accès au endpoint admin ;
- utiliser des comptes DB à privilèges limités dans l'image.
