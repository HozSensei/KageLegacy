# Règles du jeu

Ce document résume les règles visibles pour un joueur. Les détails mécaniques sont dans [Cartes et combat](CARDS_AND_COMBAT.md). La version joueur complète (héritages, enchaînements, ordre des dégâts, glossaire d’effets) est dans `frontend/src/content/rules.fr.md` et `rules.en.md`, affichée sur `/rules`.

## Monde

Trois villages (Midorihara, Kareno, Oborohama) sont en guerre froide après un pacte trahi. Voir [Lore](LORE.md). Les missions sont des opérations pour son camp ; le village n’accorde aucun bonus de combat.

## Création et progression

La création de personnage demande :

- un nom ;
- une affinité élémentaire : Katon, Suiton, Raiton, Doton ou Futon ;
- éventuellement une faction parmi Midorihara, Kareno et Oborohama.

Le joueur reçoit 22 cartes starter et un deck initial. Le niveau maximal est 80. Chaque niveau demande `100 × niveau` XP et donne un point de talent ; il ne donne aucun bonus automatique de statistique.

Rangs : Aspirant ninja au niveau 1, Genin à 5, Chunin à 20, Jonin à 40, ANBU à 60, Kage à 80.

Le personnage peut personnaliser son [profil](CHARACTER_PROFILE.md). Chaque promotion débloque un surnom et, jusqu'au rang ANBU, de nouveaux portraits. Les portraits des rangs précédents restent sélectionnables.

## Decks

Un deck actif respecte :

- 20 à 30 cartes ;
- au maximum 3 copies d'une définition ;
- au maximum 1 héritage de clan ;
- au maximum 3 cartes légendaires ou mythiques, héritages inclus ;
- exactement deux voies principales distinctes parmi les cartes non neutres, avec au moins 25 % de ces cartes dans chacune (arrondi au supérieur). Seule la voie principale de chaque carte compte.

Les cartes neutres de voie `common` comptent pour la taille du deck, pas pour le 25/75. Ce n’est pas la rareté Commune. Exemple : 30 cartes dont 10 neutres donnent 20 cartes de voie et un minimum de 5 dans chaque voie. Un deck non conforme reste éditable, mais ne peut pas être activé ni lancé en combat.

Un seul deck est actif à la fois. Les passifs des cartes et améliorations du deck actif sont agrégés aux statistiques du personnage.

## Combat PvE

Début standard :

- 100 PV de base ;
- 5 Chakra de base, avant les bonus ;
- 5 cartes au départ, puis conservation de la main et pioche jusqu’à 5 au début de chaque tour ;
- main plafonnée à 10 cartes.

Pendant son tour, le joueur peut :

- jouer plusieurs cartes tant que le Chakra le permet ;
- défausser jusqu’à deux cartes par tour : chaque défausse permet de piocher une autre carte ou de gagner 1 Chakra, ce gain étant limité à une fois par tour ;
- terminer le tour ;
- abandonner le combat.

Le Chakra inutilisé n’est pas reporté. L’interface affiche l’intention ennemie actuelle et le type de la suivante. Une charge ou un changement de phase peut modifier la prévision.

## PvE rapide

Hors mission, un combat rapide peut être lancé contre un template avec une difficulté donnée. Les récompenses par défaut sont : 40 XP, 100 Ryos, 12 % de chance de carte et 50 XP de Battle Pass.

## Missions

Une mission active par rang (D, C, B, A, S). Chaque lancement génère un parcours aléatoire : combats tirés dans un pool du rang, plus un ou deux nœuds « ? » (soin, butin, rien ou embuscade). Le briefing immersif est révélé au départ, pas sur la liste.

Les PV persistent entre combats. Une défaite ou un abandon termine le run sans récompenses de complétion. Les récompenses sont versées à la fin du run, avec un multiplicateur selon les combats gagnés. Les rangs B+ peuvent terminer sur un boss.

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
- Les villages n’accordent aucun bonus de combat. L’espace **Village** regroupe les amis et le classement hebdomadaire. Les membres du village vainqueur à l’ouverture de la semaine gagnent un lot, même s’ils n’ont joué aucun duel.
- Le classement propose les classements par niveau et victoires PvP, avec vue par faction.

## Combat coop en ligne

Dans **Co-op**, créer une salle et partager son code avec un autre joueur. Chacun apporte son deck actif valide. Les deux jouent à tour de rôle, puis l’ennemi agit. Les deux intentions indiquent qui est visé. Chaque joueur conserve sa main et son chakra séparément.

La zone et le bouton **Allié** permettent de jouer certains soins, protections et purifications sur le partenaire. Un effet offensif compatible exige une confirmation explicite. Les cartes au ciblage ambigu sont refusées sans être dépensées. Le combat ne donne pas de récompense et n’a pas de matchmaking.

Les salles de cette première version sont stockées en mémoire sur une seule instance du serveur et ne survivent pas à un redémarrage. Une invitation en attente expire après 30 minutes.

## Duel de decks asynchrone

Affrontez le deck actif d’un ami, d’un joueur de niveau proche ou d’un membre d’un village rival, même s’il est hors ligne. Le vainqueur peut gagner des ryos. Les duels automatiques entre villages alimentent le classement hebdomadaire avec lot collectif. La semaine court du lundi 00 h au lundi suivant 00 h, en UTC. Voir [les règles du Duel de decks](ASYNC_DUELS.md).

## PvP temps réel

Le duel PvP est masqué par défaut. Son code et son historique sont conservés ; le frontend peut être réactivé avec `VITE_PVP_ENABLED=true`.

Les comptes invités expirent après 7 jours et peuvent être convertis en comptes complets.
