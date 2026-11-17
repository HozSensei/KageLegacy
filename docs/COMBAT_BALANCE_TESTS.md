# Tests d’équilibrage combat (PvE)

Filet de régression pour savoir si un combat deck-building est **trop dur** ou **trop facile**, sans HTTP ni DB.

## Triade & éléments (`test:type-advantage`)

Couverture exhaustive (sans DB) de la **triade tactique** et de la **roue élémentaire**.

```bash
npm run test:type-advantage --prefix backend
# racine : npm run test:type-advantage
```

### Multiplicateurs (source : `docs/COMBAT_SYSTEM.md`)

| Système                                                      | Avantage | Désavantage                 | Neutre |
| ------------------------------------------------------------ | -------- | --------------------------- | ------ |
| **Triade** Tai > Gen > Nin > Tai                             | ×**1.2** | — (pas de malus réciproque) | ×1     |
| **Éléments** Katon > Futon > Raiton > Doton > Suiton > Katon | ×**1.5** | ×**0.7**                    | ×1     |

Médecine = toujours neutre. Code : `backend/src/services/deckCombat/typeAdvantage.js` (`getTypeAdvantage`, `getElementAdvantage`). Branché dans `computeCardDamage`. Matrice 3×3 + 5×5 + intégration légère dans `backend/scripts/testTypeAdvantage.js`.

---

## Simulations win-rate

### Lancer

```bash
# Filet de régression : hard = échec, soft = avertissement
npm run test:tcg-balance --prefix backend
# Alias historique : npm run test:combat-balance --prefix backend

# Rapport complet : pas d'échec sur les seuils, mais échec si les assertions de simulation échouent
npm run test:tcg-balance:report --prefix backend

# Soft/design devient bloquant
npm run test:tcg-balance --prefix backend -- --strict
```

Alias racine : `npm run test:combat-balance`.

### Architecture et protocole

| Fichier                                               | Rôle                                                 |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `backend/src/config/combatBalanceConfig.js`           | Profils, rencontres, paramètres, seuils et cibles    |
| `backend/src/services/deckCombat/combatBalanceSim.js` | Sessions sans DB, RNG, politique et boucle de combat |
| `backend/scripts/testCombatBalance.js`                | Assertions, agrégats et rapport                      |

Le simulateur reproduit une partie de la boucle de `combatEngineService` en réutilisant ses fonctions de cartes, statuts, talents et IA, sans persistance ni récompenses. Chaque combat commence à ses PV maximum, indépendamment des autres : ce n'est pas une simulation de parcours de mission avec attrition entre nœuds.

Le filet practice exécute 24 combats par cellule, sauf `beginner` contre B et A ; le rapport en exécute 48 pour chacune des 24 cellules practice. Un scénario starter séparé couvre les huit rencontres dans les deux modes, avec respectivement 24 ou 48 combats par cellule. Toutes les rencontres utilisent `difficulty: 1`. Mulberry32 utilise la seed `0x4b414745 + i * 9973` (sur 32 bits), avec les mêmes seeds par cellule. Chaque seed starter est rejouée deux fois et les résultats individuels sont comparés ; ces répétitions ne sont pas incluses dans les statistiques. Le cap est de 40 tours ; un timeout compte comme défaite, et le rapport en donne le nombre.

### Politique joueur (`greedy_damage_then_block`)

Le bot choisit la carte payable au score heuristique le plus élevé : bonus de létalité, dégâts, armure selon la menace, soin, invocation et pioche. Ce sont des scores, pas une priorité absolue entre catégories. Quand aucune carte n'est payable, il peut défausser une carte pour +1 chakra si une carte restante atteint un score suffisant, sinon il termine son tour. Ce comportement est une référence, pas une politique optimale ni une représentation de tous les joueurs.

### Profils practice historiques

Pour ces trois profils, les stats sont des **hypothèses synthétiques agrégées**, non recalculées depuis les nœuds de talents ou les passifs d'un deck. Leur atteignabilité et leur cohérence avec les prérequis, les points disponibles et les talents indiqués ne sont pas vérifiées. `level` sert ici à calculer le rang via `rankForLevel` ; le niveau n'ajoute pas lui-même de stats. Les codes ci-dessous activent séparément les effets de combat des talents.

| Profil     | Niveau / rang | Stats : tai / nin / gen / méd / maxHp / maxChakra | Codes de talents                                                          | Cartes practice améliorées                                                                |
| ---------- | ------------- | ------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `beginner` | 8 / Genin     | 5 / 0 / 0 / 5 / 0 / 0                             | aucun                                                                     | aucune, L0                                                                                |
| `mid`      | 32 / Chunin   | 45 / 30 / 20 / 35 / 25 / 0                        | `iron_guard`, `blade_swift`                                               | `practice-fist` L1                                                                        |
| `strong`   | 55 / Jonin    | 110 / 80 / 60 / 70 / 60 / 0                       | `iron_guard`, `blade_swift`, `combo_master`, `berserker`, `boosted_regen` | `practice-fist`, `practice-strike`, `practice-guard`, `practice-wall`, `practice-heal` L2 |

Les trois profils utilisent le même deck practice de `buildPracticeDeckEntries` : trois exemplaires de chacune des six cartes `fist`, `strike`, `guard`, `wall`, `heal`, `focus`, et un `clone`, soit 19 cartes. Ce deck embarqué n'est pas un deck de collection valide ordinaire (minimum 20 cartes) ; le démarrage actuel du moteur demande un deck jouable et ne l'utilise pas comme secours. Le simulateur applique à toutes les copies des slugs sélectionnés des bonus **fictifs** : +1 à L1 ou +2 à L2 sur dégâts, armure ou soin. Il utilise `applyUpgradeBonuses`, mais ni ces bonus ni les upgrades du deck de secours ne sont des cartes possédées ou des données de catalogue. Les autres cartes restent L0 ; le niveau affiché ne décrit donc pas tout le deck.

### Profil starter issu des seeds

`starter` représente un nouveau personnage niveau 1, Genin, sans talent dépensé : une copie de chacun des 22 slugs de `backend/src/config/starterLoadout.js`, tous au niveau d'amélioration 0. C'est l'état accordé à une collection initialement vide si le catalogue a été entièrement seedé. `validateDeck` confirme 22 cartes, deux légendaires et aucune carte de clan ; la fixture vérifie aussi l'unicité et la quantité possédée. Elle n'est ni substituée au filet historique ni soumise à ses seuils, qui ont été conçus pour les profils practice.

Sans DB, `backend/scripts/testCombatBalance.js` recherche chaque slug dans `ALL_CARDS` de `seedCards.js`, reconstruit les colonnes utilisées par `upsertCardDefinition` et appelle `serializeCardDefinition`, qui applique `applyUpgradeBonuses`. Les tests contrôlent notamment effets, invocation, exhaust et données runtime, ainsi que les bonus actifs et passifs L1/L2 seedés de `poing-rapide` et l'agrégation des stats après un L1. Ces upgrades sont des tests de mapping : **les combats starter n'utilisent aucune amélioration**. Les passifs sont additionnés par copie avec le filtre de clés de `deckService`, puis celui de `mergeStatBonuses`, comme `getComputedStats` : tai 8, nin 10, gen 9, médecine 6, maxHp 12, maxChakra 0. Cela donne 112 PV et 3 chakra, sans bonus de talent. Les anciennes clés comme `vitesse`, `intelligence` et `dexterity` ne figurent pas dans les stats finales de `playerCharacterService`.

Le mapping est une reconstruction des données seedées, pas une lecture de la base : les modifications de catalogue en DB ou une collection préexistante ne sont pas représentées. L'ordre initial suit les slugs de la config et non nécessairement le tri SQL de la collection ; les résultats par seed ne reproduisent donc pas une partie réelle donnée. Le simulateur appelle les mêmes effets combat que le moteur, y compris ses limites : `exile_enemy_card` est un stub PvE et la propriété seed `abilities: ['taunt']` du clone n'est pas interprétée comme `taunt` par le moteur actuel. Les descriptions des cartes ne sont pas une garantie de leur comportement.

### Rencontres couvertes

- D : `ronin_bandit`, `marsh_cutpurse`, `scrapyard_dog`.
- C : `kurogane_scout`, `tide_sentinel`.
- B : `ashen_captain`, `ironroot_warden`.
- A : `duskblade_ronin`.

Il s'agit d'un échantillon de templates, sans boss multiphase ; pas d'affirmation sur tous les ennemis d'un rang.

### Métriques et seuils

`winRate` est le nombre de victoires divisé par le nombre de combats ; `avgTurns` inclut les défaites. `avgHpRemainingOnWin` est la moyenne des PV restants des victoires uniquement, pondérée par le nombre de victoires entre templates ; `—` signifie aucune victoire. `avgDamageTaken` cumule les pertes de PV après armure des attaques ennemies et des statuts poison/brûlure, sans soustraire les soins : il peut dépasser les PV maximum.

Les seuils sont vérifiés par rencontre et par agrégat rang/profil : `winRateMin` et `avgTurnsMax` sont hard ; maxima de WR, minimums de dégâts/tours et `DESIGN_WINRATE_TARGETS` sont soft sauf en `--strict`. Les assertions hard d'ordre comparent notamment D/C pour `beginner`, D/A pour `mid` et `strong`, ainsi que les durées entre profils sur D et A : elles ne garantissent pas l'ordre de tous les rangs ni de chaque template. Un seuil dépassé indique un écart sur cet échantillon, pas sa cause certaine.

### Résultats — 17 novembre 2026

Filet practice : 48 combats par cellule, 1 152 au total, 0 timeout. Agrégats équipondérés par template :

| Rang | Profil   | Victoires | Tours moyens | Dégâts PV moyens |
| ---- | -------- | --------: | -----------: | ---------------: |
| D    | beginner |    48,6 % |         14,0 |            106,5 |
| D    | mid      |     100 % |          5,7 |             25,6 |
| D    | strong   |     100 % |          3,2 |              6,9 |
| C    | beginner |    32,3 % |         17,4 |            113,9 |
| C    | mid      |     100 % |          6,8 |             29,3 |
| C    | strong   |     100 % |          3,9 |              9,3 |
| B    | beginner |       0 % |          9,6 |            111,1 |
| B    | mid      |    80,2 % |         12,6 |            126,7 |
| B    | strong   |     100 % |          7,0 |             46,7 |
| A    | beginner |       0 % |          9,2 |            110,2 |
| A    | mid      |    64,6 % |         13,6 |            131,0 |
| A    | strong   |     100 % |          7,7 |             50,9 |

Le test à 24 combats échoue sur `beginner` contre `marsh_cutpurse` : 8/24 victoires (33,3 %) pour un minimum hard de 40 %. Il signale aussi `mid`/A à 58,3 %, au-dessus de la cible design de 55 %. Dans le rapport à 48, `marsh_cutpurse` atteint 19/48 (39,6 %) ; les agrégats `mid`/B (80,2 %, cible max 75 %) et `mid`/A (64,6 %, cible max 55 %) sont hors cible. Les deux modes utilisent des tailles d'échantillon différentes : leurs constats ne sont pas directement interchangeables. Les 100 % de `strong` ne démontrent pas que tout le contenu est trivial pour un joueur réel.

### Résultats starter — 17 novembre 2026

Rapport : 48 combats par rencontre, 384 au total hors répétitions, aucun timeout. Tous les combats rejoués avec la même seed donnent le même résultat individuel.

| Rang | Victoires | Tours moyens | PV moyens à la victoire | Dégâts PV moyens |
| ---- | --------: | -----------: | ----------------------: | ---------------: |
| D    |     100 % |          6,4 |                    71,9 |             47,0 |
| C    |     100 % |          8,0 |                    71,4 |             48,8 |
| B    |    17,7 % |         10,3 |                    10,4 |            122,4 |
| A    |       0 % |          9,8 |                       — |            123,2 |

Par rencontre B, `ashen_captain` donne 2/48 victoires et `ironroot_warden` 15/48 ; A donne 0/48. Le test à 24 donne D/C 100 %, B 16,7 % et A 0 %. Sur `marsh_cutpurse`, starter gagne 48/48 contre 19/48 pour `beginner` practice : les profils et decks diffèrent, malgré les mêmes seeds ; cela ne démontre ni que le combat est trivial pour un humain, ni que le filet historique peut être supprimé.

### Recommandations et limites

1. Examiner `marsh_cutpurse` pour débutant et la facilité apparente de D/C avec le starter, notamment le poison, avec davantage de seeds, des intervalles d'incertitude et plusieurs politiques avant tout retune. Ne pas abaisser le seuil du filet historique pour rendre le test vert.
2. Étudier B/A pour `mid` et l'écart de puissance avec `strong` à partir de builds atteignables et de plusieurs politiques ; les valeurs 100 % et les cibles B/A dépassées sont des signaux, pas une preuve suffisante pour modifier les ennemis.
3. Étendre au-delà du starter à des decks et talents réellement atteignables en vérifiant points, prérequis, collection, passifs et upgrades ; comparer aussi à une DB seedée. Distinguer combats isolés et runs avec PV persistants ; couvrir d'autres templates et boss avant de généraliser.
4. La boucle du simulateur est une copie susceptible de diverger du moteur. En particulier, certaines annonces d'intention lors de phases de boss dans les fonctions de carte/allié utilisent encore `Math.random` : le déterminisme du rapport actuel ne doit pas être extrapolé aux boss. Ajouter des tests de parité et injecter le RNG de bout en bout avant de les inclure.
5. Conserver les seuils comme garde-fous indépendants des résultats ; les revoir seulement avec une décision de design motivée et documentée, pas pour masquer une régression.
