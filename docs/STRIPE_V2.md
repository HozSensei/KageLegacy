# Stripe V2 — Kage Coins & Battle Pass Premium

Checkout Session one-shot pour les packs Kage Coins et le déblocage premium du Battle Pass (5 € / 500 KC).

## Variables d’environnement

```bash
# Obligatoires pour le paiement réel
STRIPE_SECRET_KEY=sk_test_...          # ou sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URL publique du frontend (success / cancel redirects)
APP_PUBLIC_URL=http://localhost:5173
# CORS_ORIGIN=https://votre-domaine.example   # fallback si APP_PUBLIC_URL absent

# Battle Pass Premium (optionnel) — sinon price_data 5,00 €
STRIPE_PRICE_ID_BATTLE_PASS=price_...

# Packs KC (optionnel) — sinon price_data selon le catalogue shop
# STRIPE_PRICE_ID_COIN_SPARK=price_...
# STRIPE_PRICE_ID_COIN_EMBER=price_...
# STRIPE_PRICE_ID_COIN_FORGE=price_...
# STRIPE_PRICE_ID_COIN_VAULT=price_...

# Fallback stub sans Stripe (dev / admin)
# SHOP_COIN_STUB=true
# BATTLE_PASS_STUB_UNLOCK=true
```

Sans `STRIPE_SECRET_KEY` : les endpoints `method=stripe` tombent en stub en non-production (ou si `ENABLE_DEV_TOOLS=true` / flags stub / admin). En production stricte → 503.

## Endpoints

| Méthode | Route                                    | Rôle                                                                |
| ------- | ---------------------------------------- | ------------------------------------------------------------------- |
| `POST`  | `/api/shop/coin-packs/:packId/purchase`  | body `{ method: "stripe" \| "stub" }` → URL Checkout ou crédit stub |
| `POST`  | `/api/shop/battle-pass/unlock`           | `{ method: "stripe" \| "kage_coins" \| "stub" }`                    |
| `POST`  | `/api/battle-pass/unlock-premium`        | idem                                                                |
| `GET`   | `/api/shop/checkout/confirm?session_id=` | fulfillment post-redirect (idempotent)                              |
| `POST`  | `/api/stripe/webhook`                    | raw body + `Stripe-Signature`                                       |

Métadonnées session : `product=kage_coins` (+ `pack_id`, `coins_granted`) ou `product=battle_pass_premium` (+ `season_id`).

## Mode test

1. Clés **test** dans `.env` (`sk_test_…`, `whsec_…`).
2. Webhook local : `stripe listen --forward-to localhost:3000/api/stripe/webhook` puis coller le secret affiché dans `STRIPE_WEBHOOK_SECRET`.
3. Événement à écouter : `checkout.session.completed` (crédite les Kage Coins ou débloque le Battle Pass premium).
4. Cartes test Stripe : `4242 4242 4242 4242`, date future, CVC quelconque.
5. Après paiement, le front `/shop` confirme via `session_id` si le webhook n’a pas encore tourné (idempotence DB : `shop_coin_pack_purchases.stripe_session_id`, `battle_pass_stripe_purchases`).

## Catalogue prix (défaut)

| Produit                     | Montant | Contenu              |
| --------------------------- | ------- | -------------------- |
| Éclat de Chakra (`spark`)   | 1 €     | 100 KC               |
| Braise du Village (`ember`) | 5 €     | 500 + 50 KC          |
| Forge des Ombres (`forge`)  | 10 €    | 1000 + 150 KC        |
| Coffre du Kage (`vault`)    | 50 €    | 5000 + 1000 KC       |
| Battle Pass Premium         | 5 €     | piste premium saison |

Voir aussi `.env.example` et `backend/src/services/shopStripeService.js`.
