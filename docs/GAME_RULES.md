# Règles du jeu

Ce document résume les règles visibles pour un joueur. Les détails mécaniques sont dans [Cartes et combat](CARDS_AND_COMBAT.md).

## Création et progression

La création de personnage demande :

- un nom ;
- une affinité élémentaire : Katon, Suiton, Raiton, Doton ou Futon ;
- éventuellement une faction parmi Midorihara, Kareno et Oborohama.

Le joueur reçoit 22 cartes starter et un deck initial. Le niveau maximal est 80. Chaque niveau demande `100 × niveau` XP et donne un point de talent ; il ne donne aucun bonus automatique de statistique.

Rangs : Genin, Chunin à 20, Jonin à 40, ANBU à 60, Kage à 80.

## Decks

Un deck actif respecte :

- 20 à 30 cartes ;
- au maximum 3 copies d'une définition ;
- au maximum 1 héritage de clan ;
- au maximum 3 cartes légendaires ou mythiques, héritages inclus.

Un seul deck est actif à la fois. Les passifs des cartes et améliorations du deck actif sont agrégés aux statistiques du personnage.

## Combat PvE

Début standard :

- 100 PV de base ;
- 3 Chakra de base ;
- 5 cartes piochées ;
- main plafonnée à 10 cartes.

Pendant son tour, le joueur peut :

- jouer plusieurs cartes tant que le Chakra le permet ;
- défausser une carte une fois par tour pour gagner du Chakra ;
- réserver une carte une fois par tour ;
- terminer le tour ;
- abandonner le combat.

Une carte réservée revient en plus de la pioche du tour suivant. Une partie du Chakra inutilisé peut être reportée selon la limite du moteur.

## PvE rapide

Hors mission, un combat rapide peut être lancé contre un template avec une difficulté donnée. Les récompenses par défaut sont : 40 XP, 100 Ryos, 12 % de chance de carte et 50 XP de Battle Pass.

## Missions

Un run alterne combats et événements. Les PV persistent entre combats. Une défaite ou un abandon termine le run sans récompenses de complétion.

Les récompenses sont distribuées à la fin du run, avec un multiplicateur dépendant du nombre de combats gagnés. Le dernier combat d'un run assez long peut devenir un boss selon la définition de mission.

## Collection et amélioration

Une carte peut être améliorée jusqu'au niveau 2, sauf cas plus restrictifs prévus par les données. Les améliorations coûtent Ryos, poussière et/ou essence.

Désenchanter donne de la poussière selon la rareté :

- commune : 10 ;
- rare : 40 ;
- légendaire : 200 ;
- mythique : 1000.

## Boutique

Les boosters standard et élémentaires s'achètent en Ryos. Le booster premium utilise les Kage Coins. Chaque booster contient 5 cartes, avec au moins une rare pour le premium.

Les packs de Kage Coins et le Battle Pass Premium sont achetés via Stripe en production.

## Battle Pass

La saison active possède 50 niveaux avec une voie gratuite et une voie premium. Les paliers se réclament séparément. Premium multiplie l'XP gagnée par 1,2.

À partir du niveau 30, il est possible d'acheter des niveaux à 150 Kage Coins chacun, jusqu'à 20 en une fois.

## Talents

Les 72 talents sont répartis en quatre piliers verticaux de six paliers : Taijutsu, Ninjutsu, Genjutsu et Médecine. Chaque talent accepte un à trois rangs. Un point achète un rang ; les paliers suivants exigent un nombre minimal de points investis dans la voie et, pour certains talents, le nœud lié du palier précédent. Aucun talent ne modifie la réserve ou la capacité de Chakra. Le niveau 80 empêche de remplir les quatre piliers.

Le reset rembourse chaque rang investi. Il est gratuit une fois tous les 10 niveaux atteints, sinon il coûte 2000 Ryos.

## Succès, factions et classement

- Les succès suivent les actions de combat, mission, collection, talent et PvP. Leurs récompenses se réclament par palier.
- Les factions sont cosmétiques et n'accordent aucun bonus de combat.
- Le classement propose les classements par niveau et victoires PvP, avec vue par faction.

## PvP

Le PvP nécessite un deck valide. Les joueurs sont rapprochés selon leur niveau et leur fenêtre de recherche. Il ne fournit ni ELO, ni saison, ni récompense directe actuellement.

Les comptes invités expirent après 7 jours et peuvent être convertis en comptes complets.
