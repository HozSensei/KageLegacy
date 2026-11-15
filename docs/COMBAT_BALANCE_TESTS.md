# Tests d’équilibrage combat (PvE)

Filet de régression pour savoir si un combat deck-building est **trop dur** ou **trop facile**, sans HTTP ni DB.

## Triade & éléments (`test:type-advantage`)

Couverture exhaustive (sans DB) de la **triade tactique** et de la **roue élémentaire**.

```bash
npm run test:type-advantage --prefix backend
# racine : npm run test:type-advantage
```

### Multiplicateurs (source : `docs/COMBAT_SYSTEM.md`)

| Système | Avantage | Désavantage | Neutre |
|---------|----------|-------------|--------|
| **Triade** Tai > Gen > Nin > Tai | ×**1.2** | — (pas de malus réciproque) | ×1 |
| **Éléments** Katon > Futon > Raiton > Doton > Suiton > Katon | ×**1.5** | ×**0.7** | ×1 |

Médecine = toujours neutre. Code : `backend/src/services/deckCombat/typeAdvantage.js` (`getTypeAdvantage`, `getElementAdvantage`). Branché dans `computeCardDamage`. Matrice 3×3 + 5×5 + intégration légère dans `backend/scripts/testTypeAdvantage.js`.

---

## Simulations win-rate

## Lancer

```bash
# CI — hard-fail sur planchers + ordre de difficulté ; soft = warnings
npm run test:combat-balance --prefix backend

# Tableau lisible (exit 0)
npm run test:combat-balance:report --prefix backend

# Soft/design → hard fail (cibles « pas trivial »)
npm run test:combat-balance --prefix backend -- --strict
```

Alias racine : `npm run test:combat-balance`.

## Architecture

| Fichier | Rôle |
|---------|------|
| `backend/src/config/combatBalanceConfig.js` | Profils, encounters, seuils hard/soft, cibles design |
| `backend/src/services/deckCombat/combatBalanceSim.js` | Harness pur (seed RNG, greedy, boucle play/endTurn) |
| `backend/scripts/testCombatBalance.js` | Assertions + mode rapport |

Le simulateur clone la logique de `combatEngineService` (statuts, talents, IA ennemie) **sans** persistance.

## Politique joueur (`greedy_damage_then_block`)

Documentée pour reproductibilité :

1. Parmi les cartes **affordables**, score : kill > dégâts > block si menace > heal > summon > draw
2. Sinon défausse→+1 Chakra si ça débloque une attaque utile
3. Sinon fin de tour

RNG : Mulberry32 seedé (`BALANCE_SIM.baseSeed` + index fight). Même seed ⇒ mêmes tours / HP / dégâts.

## Profils

| Id | Stats (ordre de grandeur) | Talents |
|----|---------------------------|---------|
| `beginner` | ~5 tai / méd | aucun |
| `mid` | ~30–45 | `iron_guard`, `blade_swift` |
| `strong` | ~70–110 | + `combo_master`, `berserker`, `boosted_regen` |

Deck : practice embarqué (`buildPracticeDeckEntries`) pour isoler le scaling stats/talents.

## Encounters couverts

Rang **D** : `ronin_bandit`, `marsh_cutpurse`, `scrapyard_dog`  
Rang **C** : `kurogane_scout`, `tide_sentinel`  
Rang **B** : `ashen_captain`, `ironroot_warden`  
Rang **A** : `duskblade_ronin`

Noms originaux uniquement.

## Métriques

Par cellule (profil × template), sur N fights seedés :

| Métrique | Sens |
|----------|------|
| `winRate` | Victoires / N |
| `avgTurns` | Tours moyens (victoire ou défaite) |
| `avgHpRemainingOnWin` | HP joueur moyens à la victoire |
| `avgDamageTaken` | Dégâts HP cumulés reçus (hors block) |

## Seuils

Deux couches dans `BALANCE_THRESHOLDS` :

- **hard** (`winRateMin`, `avgTurnsMax`) — CI rouge si le contenu devient injouable ou interminable
- **soft** (`winRateMaxSoft`, `avgDamageTakenMinSoft`, …) — signal « trop trivial » ; fail seulement avec `--strict`

Cibles design humaines : `DESIGN_WINRATE_TARGETS` (ex. rang D débutant dans ~40–85 %, pas 0 % ni 100 % trivial).

Assertions d’**ordre** (toujours hard) :

- Même profil : rang supérieur ⇒ plus de tours / plus de dégâts reçus
- Même rang : `strong` clear plus vite que `mid` que `beginner`

## Interpréter les résultats

1. Lancer le rapport et regarder WR / tours / dégâts par rang
2. **WR soft hors borne** ⇒ templates trop faibles (ou practice deck trop fort) sous IA greedy
3. **winRateMin hard fail** ⇒ surge de difficulté (nerf joueur ou buff ennemi accidentel)
4. **Ordre cassé** (A plus rapide que D) ⇒ scaling de rang cassé
5. Après un retune HP/intents/stats : mettre à jour les bornes dans `combatBalanceConfig.js` si le nouveau niveau est *voulu*

### Snapshot retune (greedy + practice)

Retune data : `enemyTemplates.js` (HP / intents ↑ par rang) + practice deck nerfé (19 cartes, dégâts/block/clone ↓).  
`npm run test:combat-balance -- --strict` : **vert**.

#### Avant → après (agrégats rang × profil, 48 fights/cellule)

| Rang / profil | WR avant → après | Tours avant → après | Dmg pris avant → après |
|---------------|------------------|---------------------|------------------------|
| D / beginner | 100% → **60%** | 3.8 → 13.9 | 2 → 91 |
| D / mid | 100% → 100% | 2.1 → 6.0 | 0 → 24 |
| D / strong | 100% → 100% | 1.6 → 4.2 | 0 → 12 |
| C / beginner | 100% → **38%** | 7.6 → 17.3 | 5 → 96 |
| C / mid | 100% → 100% | 3.2 → 7.3 | 1 → 27 |
| C / strong | 100% → 100% | 2.4 → 4.9 | 0 → 12 |
| B / beginner | 100% → **0%** | 9.9 → 9.6 | 18 → 111 |
| B / mid | 100% → **69%** | 4.3 → 13.3 | 7 → 131 |
| B / strong | 100% → 100% | 3.0 → 8.9 | 2 → 72 |
| A / beginner | 100% → **0%** | 13.4 → 9.1 | 45 → 110 |
| A / mid | 100% → **44%** | 6.0 → 13.9 | 18 → 138 |
| A / strong | 100% → 100% | 3.8 → 9.8 | 5 → 81 |

Ordre de difficulté (tours / pression) conservé : D < C < B < A pour mid/strong ; débutant souffre sur B/A.

#### Écarts design assumés (documentés dans la config)

- **C/mid** et **A/B strong** : WR reste ~100 % sous greedy + practice + stack talents. Soft/design max relevés à 1.0 — durcir assez pour faire perdre `strong` écrase `mid` (WR→0). A reste **clairable** pour `strong`, pas trivial pour `mid`.
- Practice deck = baseline harness (pas un deck joueur final) ; le scaling réel viendra des cartes DB / build.

## Étendre

1. Ajouter un template dans `BALANCE_ENCOUNTERS` (+ rang)
2. Ajuster / ajouter une ligne dans `BALANCE_THRESHOLDS`
3. Relancer CI + rapport ; committer la config avec le retune gameplay
