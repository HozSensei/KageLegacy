# Décisions de conception

## Identité des voies

- Taijutsu : harcèlement, multicoups, faible coût, chaînes.
- Ninjutsu : burst, coups coûteux et impactants.
- Genjutsu : contrôle, esquive, états, préparation.
- Médecine : soin, purification, régénération et survie.

Le catalogue doit soutenir les decks mono-voie et duo-voie. Les transitions duo-voie peuvent être plus fortes, car elles exigent de contrôler la composition de main et l'ordre des cartes.

## `common`

Objets, invocations et héritages utilisent `common`. Leur scaling emploie la plus forte des quatre voies. Ils interrompent les chaînes car ils ne représentent aucune voie.

## Rareté passive

Bornes inclusives :

- commune : 0–5 ;
- rare : 5–10 ;
- légendaire : 10–15 ;
- mythique : 15–20.

La règle s'applique aux niveaux 0, 1 et 2. Elle mesure les points de voies, indépendamment des bonus hors art comme PV max et Chakra max.

## Combos

Le combo regarde la carte immédiatement précédente et est remis à zéro au début du tour. Les cartes `common` interrompent la chaîne.

Un combo mono-voie renforce l'identité de la voie. Un combo croisé récompense une transition lisible, notamment :

- Genjutsu → Taijutsu ou Ninjutsu ;
- Médecine → Taijutsu ou Ninjutsu ;
- Taijutsu → Genjutsu ;
- Ninjutsu → Médecine ;
- Médecine → Genjutsu.

Le bonus croisé ne doit pas être ajouté mécaniquement partout. Il doit correspondre à une fenêtre de jeu utile et rester proportionnel à la rareté, au coût et aux autres effets de la carte.

## Réduction du prochain coût

Effet interne : `reduce_next_card_cost`.

- entier positif ;
- cumulable ;
- coût final minimum zéro ;
- persiste au tour suivant ;
- consommé par la prochaine carte jouée avec succès ;
- utilisable comme effet direct ou conditionnel.

## Héritages en main ou réserve

Un héritage porte un `heldEffect` :

| Carte     | Effet                      |
| --------- | -------------------------- |
| Shizumori | +15 % esquive              |
| Benigiri  | +20 % dégâts Ninjutsu      |
| Kazamine  | +20 % dégâts Taijutsu      |
| Kumatani  | +6 armure au début du tour |
| Yukisawa  | +2 Chakra au début du tour |
| Nagihara  | +20 % soins                |

La solution évite une cinquième voie active et redonne aux lignées une identité de carte conservée. Une carte réservée compte, une carte jouée ou défaussée ne fournit plus son bonus après résolution.

## État du chantier catalogue

Premier recalibrage livré :

- aucune carte offensive active dans Médecine ;
- 46 cartes `common` (objets, invocations et héritages) ;
- déplacements initiaux depuis Ninjutsu vers support et contrôle ;
- premières chaînes de harcèlement Taijutsu ;
- premiers combos de burst Ninjutsu ;
- budgets passifs appliqués automatiquement ;
- six effets d'héritage actifs ;
- vagues d’expansion empilées (dont vague 4 : +32 Taijutsu / Médecine / Commun), catalogue à 282 cartes avec illustrations par slug.

La vague ajoute 10 Taijutsu, 6 Ninjutsu, 12 Genjutsu, 10 Médecine et 6 cartes `common`. Elle vise les manques de spécialisation plutôt qu'une inflation uniforme : contrôle/esquive Genjutsu, support Médecine et chaînes Taijutsu.

Les valeurs ultérieures doivent rester guidées par les simulations, la jouabilité mono/duo et les seuils de rareté. Ne pas ajouter de nouvelles cartes comme moyen de contourner un problème d'identité des cartes existantes.

## Garde-fous

- aucune nouvelle carte pendant le recalibrage du socle ;
- cohérence des effets nouveaux entre les modes de combat actifs (PvE, coop, duels asynchrones) ;
- descriptions FR/EN alignées avec les données ;
- contrôles catalogue reproductibles ;
- décisions chiffrées motivées par des rapports, pas par l'ajustement d'un test isolé ;
- séparation claire entre mécanique actuelle, chantier futur et hypothèse de design.
