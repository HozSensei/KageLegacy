# Tests d’équilibrage combat (PvE)

Filet de régression pour savoir si un combat deck-building est **trop dur** ou **trop facile**, sans HTTP ni DB.

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

### Snapshot branche (greedy + practice)

Sous politique optimale, les WR mesurés sont proches de **100 %** sur D→A pour les trois profils. La difficulté se lit surtout en **tours** et **dégâts reçus** (A > B > C > D). Les soft/design signalent donc un contenu encore **trop facile** vs les cibles (débutant D pas « challengeant »). Les hard + ordre restent verts pour attraper les régressions « trop dur ».

## Étendre

1. Ajouter un template dans `BALANCE_ENCOUNTERS` (+ rang)
2. Ajuster / ajouter une ligne dans `BALANCE_THRESHOLDS`
3. Relancer CI + rapport ; committer la config avec le retune gameplay
