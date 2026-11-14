# Économie — Kage Legacy V2

Source de vérité code : [`backend/src/config/economyConfig.js`](../backend/src/config/economyConfig.js).

## Objectifs

1. **F2P viable** — un joueur sans Kage Coins progresse (cartes, XP, Battle Pass free track).
2. **Premium accélère** — BP premium (+20 % XP) et parchemins KC, sans gate de puissance exclusive.
3. **Anti-inflation** — sinks (boosters Ryos, craft, upgrades) restent plus chers que les sources de combat du même palier.

## Monnaies

| Monnaie | Type | Sources | Sinks |
|---------|------|---------|-------|
| **Ryos** | Soft | Missions combat, BP free, loot legacy | Boosters standard/élémentaire, upgrades |
| **Dust** | Soft craft | Désenchantement, BP | Craft, upgrades |
| **Essence** | Soft rare | Désenchant haut niveau, BP | Upgrades légendaire/mythique |
| **Kage Coins** | Premium | Achat IRL / BP premium track | Booster premium, unlock BP, buy levels |

## Boosters (shop)

| Type | Coût | Notes |
|------|------|-------|
| Standard | **400 Ryos** | Pack F2P — ~3 victoires rang D |
| Élémentaire | **650 Ryos** | Soft premium Ryos, filtre élément |
| Premium | **100 Kage Coins** | 1 rare+ garantie — accélération payante |

Taux de rareté (poids / 1000) : inchangés, voir `boosterService.js`.

## Récompenses combat (missions deck)

Défauts + planchers par rang (`COMBAT_REWARDS_BY_RANK`). Au chargement, `bpPoints` est relevé au plancher du rang si le seed est trop bas.

| Rang | XP perso | Ryos | Card % | BP XP |
|------|----------|------|--------|-------|
| D | 50 | 150 | 12 | 100 |
| C | 90 | 280 | 16 | 200 |
| B | 160 | 520 | 22 | 350 |
| A | 260 | 850 | 30 | 500 |
| Défaut | 40 | 100 | 12 | 50 |

Fin de parcours (`grantRunRewards`) : × `COMBAT_RUN_BONUS_MULT_DEFAULT` (1.8) + petit bonus par combat.

**Ratio clé** : 1 parchemin standard ≈ **2–4** victoires D (cible 3).

## Dust / craft / upgrade

| Rareté | Disenchant | Craft | Ratio |
|--------|------------|-------|-------|
| Common | 10 | 50 | **5×** |
| Rare | 40 | 200 | **5×** |
| Legendary | 200 | 1000 | **5×** |
| Mythic | 1000 | 5000 | **5×** |

Borne tests : ratio ∈ **[4, 6]**.

Upgrades (sink mid/late) — early soft sur common :

| Rareté | Niveau 1 | Niveau 2 |
|--------|----------|----------|
| Common | 300 Ryos + 15 dust | 1500 + 80 |
| Rare | 1200 + 80 | 5000 + 400 |
| Legendary | 4500 + 400 (+0 ess.) | 18000 + 1800 + 10 ess. |
| Mythic | 18000 + 1800 + 20 ess. | — |

## Battle Pass

| Paramètre | Valeur |
|-----------|--------|
| Premium unlock | 500 Kage Coins |
| Buy level | 150 KC / niveau (max 20, à partir du niv. 30) |
| XP premium | **×1.2** (plafond design 1.25) |
| Base XP / niveau | 1000 (+50 tous les 10 niveaux) |
| Quêtes | Daily 200 / Weekly 1000 / Milestone 5000 |

La piste free suffit pour compléter la saison en cadence casual (~1 h/jour). Premium accélère et double les rewards de track, sans cartes de puissance exclusives hors cosmétique / mythique de fin de saison.

## Boucle F2P typique (early)

1. Missions D → ~150 Ryos + 100 BP XP + chance carte.
2. ~3 wins → 1 parchemin standard (5 cartes).
3. Doublons → dust (10 / common) → craft ciblé (50) ou upgrade L1 (15 dust).
4. Quêtes BP daily → 600 XP/jour → ~1.5 jours / niveau BP early.

## Invariants verrouillés

Script : `npm run test:economy` (`backend/scripts/testEconomy.js`).

- Packs F2P = Ryos only ; premium pack = KC only.
- Élémentaire > standard en Ryos.
- 2–4 wins D pour 1 standard.
- Craft/disenchant ∈ [4, 6] pour chaque rareté.
- Multiplicateur XP BP premium ≤ 1.25.
- Récompenses rang strictement croissantes (D→A).

## Tuning

Modifier **uniquement** `economyConfig.js`, puis :

```bash
cd backend && npm run test:economy && npm run test:boosters
```

Les services `boosterService`, `cardService` / `collectionService`, `combatRewardService`, `battlePassService` lisent cette config.
