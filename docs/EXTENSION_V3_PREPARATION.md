# Préparation de l'extension V3

## Périmètre et état

Le dossier fourni décrit 206 cartes numérotées de 207 à 412. Ce sont des propositions de design : aucune carte V3 n'est intégrée au catalogue, ajoutée au seed ou enregistrée en base dans cette préparation. Les dix nouveaux effets ne sont pas implémentés. Le dossier comprend une grille d'illustrations pour les cartes 207 à 222 et des prompts pour les autres, pas 206 illustrations finalisées.

Le diagnostic en lecture seule décrit dans `backend/scripts/diagnoseExternalCatalog.md` permet de réexaminer les fichiers externes. Sur les fichiers fournis, les 206 objets JSON et JS sont identiques et aucune collision avec les slugs du catalogue seed en code n'a été détectée. Ces contrôles ne portent pas sur une base existante. Les dix effets proposés sont absents de l'inventaire PvE : 105 cartes comportent au moins un de ces effets. Le diagnostic n'est pas une validation exhaustive des cartes ni de leur équilibre.

## Points de conception à décider

Les contrats de `MECANIQUES_V3.md` sont une base, mais ne précisent pas suffisamment tous les cas pour modifier le moteur sans inventer des règles :

| Effet | Décisions et intégration nécessaires |
| --- | --- |
| `mark_target` | Durée et renouvellement de la marque, consommation par carte ou par coup, interaction avec alliés, provocations et immunités. |
| `consume_status` | Priorité entre brûlure et poison, interprétation des valeurs des cartes, traitement des immunités et bonus par coup ou par carte. Les statuts actuels ont une valeur et une durée plutôt que des charges séparées. |
| `retain_card` | Choix et validation de la carte conservée, comportement si plusieurs effets s'appliquent, reprise de session et synchronisation PvP. La fin de tour actuelle défausse toute la main. |
| `echo_next` | Définition des dégâts de base, arrondi, multicoups, durée et interaction avec le talent d'écho existant. |
| `combo_chain` | Placement du bonus dans le calcul et application par coup ou par carte ; le compteur de cartes jouées existe déjà. |
| `convert_block` | Conversion automatique ou au choix, bornes du pourcentage et traitement des dégâts et protections. |
| `delayed_strike` | Ordre exact au début du tour, cumul et cible, effets d'une victoire ou d'une mort intermédiaire, et définition des immunités applicables. |
| `element_resonance` | Portée temporelle de la carte précédente, cartes sans élément, calcul des bonus, hybrides et première attaque des invocations ; certaines valeurs proposées demandent vérification. |
| `purify_to_block` | Priorité du malus retiré, liste des malus et éventuelle mise à l'échelle des quatre points d'armure. |
| `summon_support` | Expiration et cumul des bonus, plafond et interaction avec le remplacement automatique de l'allié par une carte invocation. |

## Points techniques transverses

- `backend/src/services/deckCombat/cardEffects.js` résout actuellement les dégâts, l'armure et les soins avant les effets additionnels. Les bonus influençant ces calculs ne peuvent donc pas tous être ajoutés en fin de résolution.
- Les dégâts spéciaux doivent respecter le parcours de protection de `backend/src/services/deckCombat/bossPhases.js`. Les immunités existantes concernent notamment les statuts ; elles ne constituent pas une immunité générique aux dégâts.
- Un effet inconnu produit actuellement un événement `stub_effect`, masqué dans le journal de combat frontend. Ne pas intégrer les définitions avant que leurs effets soient réellement pris en charge et contrôlés.
- `shared/pvp/duelEngine.js` utilise aussi la résolution de cartes, mais possède son propre cycle de tour. Prévoir explicitement la parité et les tests PvP ou une restriction adaptée avant de rendre les cartes accessibles.
- Les états persistants, leur expiration et leur affichage demandent de vérifier l'orchestration des tours, la sérialisation, les simulations et le journal de combat. La conservation nécessite en outre une interaction et une validation côté serveur.

## Étapes avant livraison

1. Arbitrer les règles ci-dessus, notamment calculs, cibles, durées et périmètre PvP.
2. Implémenter et tester les mécaniques par groupes, en couvrant protections de boss, multicoups, statuts, fin de combat et tours PvE/PvP.
3. Contrôler les paramètres, améliorations, passifs, descriptions FR/EN et illustrations ; rejouer le diagnostic sur la version finale et vérifier les éventuelles collisions en base.
4. Exécuter les tests du moteur, du système de cartes et les simulations d'équilibrage, puis seulement envisager l'intégration du catalogue et son seed.
