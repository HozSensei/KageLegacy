# Cartes et combat

## Les quatre voies

| Voie     | Identité attendue                                             |
| -------- | ------------------------------------------------------------- |
| Taijutsu | Harcèlement : coût modéré à faible, multicoups et chaînes     |
| Ninjutsu | Burst : dégâts concentrés, coût plus élevé et impact immédiat |
| Genjutsu | Contrôle : esquive, Faiblesse, Vulnérable et préparation      |
| Médecine | Support : soin, régénération, purification, armure ciblée     |

Les effets secondaires restent possibles, mais ne doivent pas effacer cette identité.

## Prototype d’équilibrage des duos

L’audit historique compare différents coûts avec l’ancienne boucle de pioche. Les **5 chakras** sont désormais la base du solo. La validation en jeu exige exactement deux voies principales distinctes, chacune à au moins 25 % hors neutres, arrondi au supérieur. L’audit fixe deux neutres par deck et arrondit le quota minoritaire vers le haut. Il compare 25/75, 50/50 et 75/25 de 20 à 30 cartes ; les monos servent uniquement à isoler une voie. Le Genjutsu doit pouvoir conclure avec des dégâts préparés ; la Médecine sert surtout à donner à l’autre voie le temps de jouer son tour fort.

Lancer `npm --prefix backend run audit:card-balance -- --simulate --summary`. Retirer `--summary` pour voir la fiche de chaque carte et les résultats par taille. `soloReview` couvre les valeurs et effets solo des 250 cartes aux niveaux 0, + et ++ ; le scénario `solo_live` simule la main persistante et inclut les passifs du deck. Les autres scénarios conservent l’ancienne boucle pour la comparaison historique. Le simulateur joue au coup par coup, sans exploiter les intentions à l’avance, et les deux adversaires de référence ne suffisent pas à valider le niveau de difficulté.

Le scénario `prototype` conserve les coûts Taijutsu. Côté Ninjutsu, les amorces bon marché qui piochent ou rendent du chakra perdent 2 dégâts (minimum 1), les attaques standard visent 3 chakras et le burst 4–5 selon son coût de base. Les attaques monocoup devenues plus chères gagnent des dégâts de base ; certains bursts gagnent en plus un bonus contre une cible déjà Vulnérable. Les multicoups n’obtiennent pas ce bonus plat, qui risquerait d’être multiplié par les frappes. Les passifs et les données catalogue ne changent pas.

Au niveau 0, le duo Taijutsu/Ninjutsu 50/50 passe de 22,47 à 25,41 dégâts immédiats par tour par rapport au `+2` uniforme, contre 28,04 à 5 chakras sans retarifage. C’est un compromis de départ, pas une validation de la méta : l’IA joue carte par carte contre deux adversaires PvE. Il reste à tester des séquences planifiées et des combats où contrôle et survie peuvent changer l’issue.

En combat, l’aperçu « Combo prêt » indique qu’une carte jouable peut déclencher un enchaînement existant après la voie précédente. Il ne prédit pas les dégâts finaux. Il est disponible en PvE et pour l’hôte PvP ; l’invité ne reçoit pas actuellement la voie précédente dans son état public.

## Règles actives du solo : main persistante et intentions

Les nouveaux combats de mission et les duels rapides utilisent **5 chakras de base**, avant les bonus du personnage. Les cartes non jouées restent en main et la pioche de début de tour complète jusqu’à cinq. Une main de plus de cinq cartes reste intacte, dans la limite habituelle. Le joueur a deux défausses volontaires par tour : piocher une autre carte ou gagner 1 chakra, au plus une fois par tour. Pas de réserve ni de report de chakra.

Le serveur mémorise la prochaine intention même si l’ennemi utilise un tirage pondéré. L’interface n’en révèle que le type, sans recommander d’action. Les charges et les changements de phase suivent leurs propres règles et peuvent remplacer le plan prévu. Les ennemis, la progression et les récompenses de chaque combat sont conservés.

Après résolution des améliorations, chaque carte de combat reçoit un rôle et les ajustements solo de `soloCardBalance.js`. Le Ninjutsu reprend ses paliers d’amorce, d’attaque directe et de burst. Le Taijutsu conserve ses coûts et reçoit quelques renforts sur les chaînes et ripostes ; le Genjutsu et la Médecine reçoivent des retouches de contrôle et de purification ciblées. Le coût, les valeurs et les conditions visibles dans la main sont celles du combat ; la collection et le PvP conservent les données catalogue. Aucune migration n’est nécessaire et les combats déjà ouverts gardent leurs règles.

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

En PvE, les passifs de statistiques sont agrégés depuis le deck engagé, quantités et améliorations comprises, indépendamment de la main. Les héritages à effet en main ne sont pas des bonus permanents : le Chakra et l’armure de début de tour sont appliqués après la pioche en solo à main persistante, et les bonus d’attaque, d’esquive et de soin s’appliquent lorsque l’héritage est en main au moment de la résolution.

Le budget inclusif des statistiques passives est contrôlé aux niveaux 0, 1 et 2 :

| Rareté     | Points de voies |
| ---------- | --------------: |
| Commune    |           0 à 5 |
| Rare       |          5 à 10 |
| Légendaire |         10 à 15 |
| Mythique   |         15 à 20 |

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

Le catalogue contient 80 cartes de chaîne : 20 par voie. Chaque effet est inscrit explicitement sur sa carte sous `combo_previous`; rien ne se déclenche par défaut selon la combinaison jouée.

Selon la carte, la condition peut fournir : dégâts, soins, Armure, intensité d'effet, pioche, Chakra ou réduction du coût suivant. Les cartes croisées doivent expliciter leur voie précédente et peuvent proposer une récompense supérieure aux chaînes mono-voie. Une carte sans champ `combo_previous` ne reçoit aucun bonus de chaîne.

## Réduction du prochain coût

`reduce_next_card_cost` réduit le coût Chakra de la prochaine carte jouée avec succès.

- les réductions s'additionnent ;
- le coût final est au minimum zéro ;
- l'effet persiste au tour suivant si aucune carte n'est jouée ;
- la réduction est consommée par la prochaine carte, même gratuite ;
- un jeu refusé ne la consomme pas.

## Héritages

Les six héritages ont un `heldEffect` actif en main ou en réserve :

| Héritage  | Effet                      |
| --------- | -------------------------- |
| Shizumori | +15 % esquive              |
| Benigiri  | +20 % dégâts Ninjutsu      |
| Kazamine  | +20 % dégâts Taijutsu      |
| Kumatani  | +6 armure au début du tour |
| Yukisawa  | +2 Chakra au début du tour |
| Nagihara  | +20 % soins                |

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
