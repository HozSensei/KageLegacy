# Cartes et combat

## Les quatre voies

| Voie | Identité attendue |
|---|---|
| Taijutsu | Harcèlement : coût modéré à faible, multicoups et chaînes |
| Ninjutsu | Burst : dégâts concentrés, coût plus élevé et impact immédiat |
| Genjutsu | Contrôle : esquive, Faiblesse, Vulnérable et préparation |
| Médecine | Support : soin, régénération, purification, armure ciblée |

Les effets secondaires restent possibles, mais ne doivent pas effacer cette identité.

## Voie `common`

Objets, invocations et héritages n'appartiennent à aucune des quatre voies. Ils utilisent `common`.

Le scaling `common` emploie la valeur maximale parmi Taijutsu, Ninjutsu, Genjutsu et Médecine :

```text
stat_common = max(taijutsu, ninjutsu, genjutsu, medicine)
```

Une carte `common` interrompt la chaîne de combos. Un élément thématique ne lui donne pas de voie de combo.

## Types de carte

- `attack` : dégâts actifs ;
- `defense` : armure et contre-mesures ;
- `skill` : états, pioche, économie ou manipulation ;
- `summon` : allié remplaçant l'allié courant ;
- `item` : carte commune utilitaire.

## Rareté et passifs

Le budget inclusif des statistiques passives est contrôlé aux niveaux 0, 1 et 2 :

| Rareté | Points de voies |
|---|---:|
| Commune | 0 à 5 |
| Rare | 5 à 10 |
| Légendaire | 10 à 15 |
| Mythique | 15 à 20 |

Les bornes sont inclusives. Ce budget ne transforme pas PV max, Chakra max ou armure initiale en points de voie sans règle explicite. Une amélioration reste soumise à la borne de rareté.

## Scaling

Dégâts et autres figures structurées utilisent la formule de base :

```text
valeur = arrondi(valeur_base × (1 + statistique / 100))
```

Dégâts : art principal ou meilleur art pour `common`.

Armure et soin : Médecine pour les cartes des quatre voies, meilleur art pour `common`.

## Ordre de résolution des dégâts

Dans le moteur actuel, une attaque est résolue ainsi :

1. dégât de base et bonus plats de talents ;
2. conditions `bonus_if` et bonus de combo ;
3. scaling de la voie ;
4. bonus tenu d'héritage pour la voie ;
5. Force plate ;
6. avantage de voie, avantage élémentaire et statuts sortants ;
7. multiplicateurs de talents ;
8. modificateur de zone (`×1,35`, même dans un combat mono-cible) ;
9. critique ;
10. Vulnérable adverse ;
11. absorption par allié, barrière, armure puis PV.

Un critique est tiré une fois par carte : tous les coups d'une carte multicoup bénéficient du même résultat.

## Triade et éléments

Triade :

- Taijutsu bat Genjutsu ;
- Genjutsu bat Ninjutsu ;
- Ninjutsu bat Taijutsu ;
- Médecine est neutre.

Avantage : `×1,2`; désavantage : `×0,9`; neutre : `×1`.

Éléments : Katon > Futon > Raiton > Doton > Suiton > Katon.

Avantage : `×1,5`; désavantage : `×0,7`; neutre : `×1`.

## Combos

Un combo inspecte la voie de la carte immédiatement précédente, jouée avec succès pendant le même tour.

- une carte des quatre voies peut ouvrir ou satisfaire un combo ;
- `common` interrompt la chaîne ;
- le compteur est remis à zéro au début du tour ;
- un jeu refusé ne modifie pas la chaîne ;
- les combos croisés sont autorisés à être plus puissants que les combos mono-voie, car ils exigent davantage de préparation.

`combo_previous` peut actuellement fournir dégâts, pioche, Chakra et réduction du coût suivant. D'autres effets conditionnels par voie précédente sont résolus par leurs propres branches de résolution.

## Réduction du prochain coût

`reduce_next_card_cost` réduit le coût Chakra de la prochaine carte jouée avec succès.

- les réductions s'additionnent ;
- le coût final est au minimum zéro ;
- l'effet persiste au tour suivant si aucune carte n'est jouée ;
- la réduction est consommée par la prochaine carte, même gratuite ;
- un jeu refusé ne la consomme pas.

## Héritages

Les six héritages ont un `heldEffect` actif en main ou en réserve :

| Héritage | Effet |
|---|---|
| Shizumori | +15 % esquive |
| Benigiri | +20 % dégâts Ninjutsu |
| Kazamine | +20 % dégâts Taijutsu |
| Kumatani | +6 armure au début du tour |
| Yukisawa | +2 Chakra au début du tour |
| Nagihara | +20 % soins |

Chakra et armure sont accordés une fois au début du tour du porteur. Les bonus en pourcentage sont dynamiques et cessent si la carte quitte la main ou la réserve. Une carte jouée ne s'applique pas son propre effet.

La même copie référencée deux fois n'est comptée qu'une fois. La contribution d'esquive tenue par héritage est plafonnée à 75 %.

## Statuts importants

Faiblesse réduit les dégâts sortants de 25 %. Vulnérable augmente les dégâts reçus de 50 %. Les autres états comprennent notamment Poison, Brûlure, Régénération, esquive, contre, Armure, Soins et bonus par voie.

Poison et régénération se résolvent au début du tour ; Brûlure se résout en fin de tour. La valeur d'un statut peut s'accumuler ; la durée retenue est la plus longue.

Les immunités de boss s'appliquent aux états protégés. Un type d'effet inconnu est actuellement enregistré comme `stub_effect` et ne produit aucun effet.

## Invocations

Une seule invocation est active. En jouer une nouvelle remplace l'ancienne. L'invocation attaque au début du tour dans le moteur PvE. Les capacités textuelles d'une invocation ne sont actives que si le moteur possède leur implémentation ; la seule source fiable est le code de résolution.

## Boss

Les boss utilisent des phases selon leurs points de vie. Une entrée de phase peut changer les intentions, ajouter un bouclier/barrière, poser des immunités, retirer des statuts ou modifier les caractéristiques. Les dégâts traversent d'abord l'allié taunt, puis la barrière, l'armure et les PV.

Le filet d'équilibrage standard couvre huit rencontres non boss. Les boss et les capacités particulières demandent donc des tests dédiés.
