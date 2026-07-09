# Kage Legacy — Règles du jeu

Document **joueur** : il décrit le fonctionnement du jeu sans exposer les formules exactes du serveur. Il sera mis à jour à chaque évolution notable des mécaniques.

**Dernière mise à jour :** juillet 2026

---

## En bref

**Kage Legacy** est un manager shinobi asynchrone par navigateur. Vous incarnez un **Jonin-Sensei** : vous gérez une escouade de jeunes ninjas, votre budget en **Ryos**, et vous affrontez d'autres Sensei dans une **ligue par pools** sur des **cycles de 72 heures** (temps réel).

---

## 1. Le cycle de 72 heures

Chaque cycle est une « semaine de jeu » synchronisée entre tous les joueurs du serveur.

| Phase | Période | Activités principales |
|-------|---------|------------------------|
| **Préparation** | H0 → H35 | Escouade, tactiques, entraînement, missions, magasin, Académie |
| **Milieu de cycle** | H36 → H70 | Examens Chunin (H36), rapport d'espionnage, gestion continue |
| **Opération** | H71 | Match de ligue simulé ; chronique narrative dévoilée progressivement |
| **Clôture** | H72 | Résolution missions, primes ligue, salaires, stagnation, Vol d'Oiseau, facturation entraînement, nouveau cycle |

### Gel tactique (à partir de H71)

Une fois l'opération lancée, les choix stratégiques sont **verrouillés** jusqu'au cycle suivant : composition d'escouade, consignes de combat, entraînement, missions, hôpital, marché entre joueurs.

### Jalons automatiques

- **H36** : résolution des examens Chunin inscrits ; rapport d'espionnage sur l'adversaire du cycle.
- **H71** : simulation du match de ligue ; début de la chronique narrative.
- **H72** : clôture économique et début du cycle suivant.

---

## 2. Le Sensei (votre compte)

### Ressources

- **Ryos** : monnaie du village. Revenus (ligue, missions, Vol d'Oiseau…) et dépenses (salaires, entraînement, achats…) s'y cumulent.
- **Réputation** : prestige lié notamment au Vol d'Oiseau.
- **Chakra de match** : réserve limitée permettant d'intercepter des coups fatals pendant l'opération. Chaque interception consomme une part substantielle de cette réserve.

### Spécialité

À la création du compte, vous choisissez une **spécialité** (profil / identité du Sensei). Elle influence surtout le rôle narratif et cosmétique ; les effets mécaniques restent modestes.

### Dette et gel administratif

Si votre solde de Ryos devient **négatif** (salaires impayés, dépenses excessives), un **gel administratif** bloque les nouvelles dépenses : magasin, marché entre joueurs, examen Chunin, hôpital, etc. Remettez votre trésorerie à l'équilibre pour reprendre vos achats.

Un léger découvert peut exister ; la dette persistante entraîne des **intérêts** à la clôture du cycle, ce qui augmente la pression économique sans game over immédiat.

### Compte invité

Un **compte invité** permet d'essayer le jeu pendant une durée limitée, puis de le convertir en compte permanent.

---

## 3. Les ninjas

### Grades

Trois grades structurent la carrière : **Genin**, **Chunin**, **Jonin** (atteint via le départ en Vol d'Oiseau, pas en restant dans l'escouade).

Chaque grade impose des **plafonds** sur les statistiques : un Genin ne peut pas s'entraîner indéfiniment ; il doit passer l'examen Chunin pour débloquer un plafond supérieur.

### Les six statistiques

| Catégorie | Stats |
|-----------|-------|
| **Combat** | Taijutsu, Ninjutsu, Genjutsu, Médecine |
| **Support** | Vitesse, Intelligence |

En match, la **robustesse physique** dépend surtout du Taijutsu ; la **réserve de chakra** combine le grade et le Ninjutsu. L'**initiative** et certaines techniques du Sensei s'appuient sur la Vitesse et l'Intelligence.

### Forme hebdomadaire

Chaque ninja possède une **forme** du cycle (de la meilleure à la pire : Divin → Excellent → Passable → Lamentable). Elle modifie **toutes** les stats de façon proportionnelle : une bonne forme amplifie les performances ; une mauvaise forme les pénalise fortement.

Après un match, les ninjas mis K.O. voient leur forme **baisser d'un palier**. À H72, PV et chakra sont entièrement restaurés.

### Traits de caractère

Chaque ninja a un **trait** qui influence son comportement en opération :

| Trait | Comportement (résumé) |
|-------|------------------------|
| **Égoïste** | Plus agressif quand ses alliés sont affaiblis ; ignore parfois le ciblage défensif |
| **Altruiste** | Peut encaisser un coup fatal à la place d'un allié |
| **Fainéant** | Résiste au premier Genjutsu subi ; peut rater l'entraînement |
| **Téméraire** | Très rapide au premier tour ; dépense plus de chakra |
| **Discipliné** | Comportement standard, prévisible |

### Éléments (affinité)

Cinq éléments forment un **cercle d'avantages** : Katon bat Futon, Futon bat Doton, Doton bat Raiton, Raiton bat Suiton, Suiton bat Katon.

En duel, l'élément favorable **renforce** les dégâts ; l'élément défavorable les **atténue**. L'écart n'est jamais décisif à lui seul, mais il peut faire basculer un échange serré.

### Clans et lignées

Sept lignées existent : Roturier, Nara, Uchiwa, Hyuga, Sarutobi, Akimichi, Yamanaka.

- Les **roturiers** sont les plus fréquents à l'Académie.
- Les **clans du village** sont plus rares et orientent les stats.
- Les **lignées nobles** sont les plus rares et les plus chères ; elles biaisent fortement la spécialisation.

Chaque clan influence la **voie** (art principal) et quelques bonus de stats à la génération.

### Voie, potentiel et âge

- **Voie** : spécialisation de combat (Taijutsu, Ninjutsu, Genjutsu, Médecine). La majorité des points bonus se concentre sur cette voie.
- **Potentiel** : Ordinaire, Prometteur ou Prodige. Plus le potentiel est élevé, plus le ninja part avec un profil marqué et progresse efficacement.
- **Âge** (15–18 ans) : les plus jeunes apprennent **plus vite** à l'entraînement ; les aînés progressent plus lentement.

### Moral

Le moral (échelle interne) influence la stabilité de l'escouade. Il baisse notamment en cas d'échec à l'examen Chunin, de salaires impayés, de **stagnation** (voir §5), ou d'achat d'un ninja sur le marché entre joueurs.

---

## 4. L'escouade

### Composition

- **3 ninjas actifs** (postes de terrain) + un **banc** de remplaçants.
- La composition est modifiable jusqu'à H71.
- Un ninja est **indisponible** s'il est en mission, en vente sur le marché P2P, ou si la fenêtre tactique est fermée.

### Consignes individuelles

Chaque actif reçoit une consigne de combat :

| Consigne | Rôle tactique |
|----------|---------------|
| **Normal** | Comportement équilibré ; l'attaquant est tiré au sort |
| **Offensive** | Priorité à l'attaque (meilleure stat de combat) |
| **Tank** | Forte probabilité d'être ciblé en défense |
| **Protect** | Peut soigner un allié désigné lorsqu'il est gravement blessé |

### Compositions d'équipe (meta)

Le moteur détecte un **archétype** selon les consignes des trois actifs encore debout :

| Composition | Condition | Style |
|-------------|-----------|-------|
| **Assaut** | Majorité Offensive | Burst, pression directe |
| **Mur** | Majorité Tank | Absorption des dégâts |
| **Flux** | Majorité Protect | Genjutsu, soins, usure |
| **Équilibrée** | Mélange sans majorité | Hors du cercle, pas de bonus de matchup |

**Cercle tactique :** Assaut bat Mur · Mur bat Flux · Flux bat Assaut. L'archétype favorisé dans un duel reçoit un **léger bonus** offensif et défensif ; l'escouade équilibrée reste neutre face aux trois pures.

---

## 5. Progression des grades

### Départ

Vous commencez avec **6 ninjas** : un Chunin actif au centre, cinq Genin (dont deux actifs et trois au banc). Chaque trait de caractère est représenté une fois dans l'escouade de départ.

### Examen Chunin

- **Inscription** : avant H36 (pendant la phase de préparation).
- **Résolution** : automatique à H36.
- **Prérequis** : niveau suffisant en stat de combat et en Intelligence.
- **Coût** : frais d'inscription en Ryos, **plus élevés** si le candidat est déjà très avancé (le serveur indexe le prix sur le profil du ninja).
- **Succès** : passage au grade Chunin et plafonds relevés.
- **Échec** : le ninja reste Genin ; son moral chute.

### Vol d'Oiseau (Chunin → départ)

- **Inscription** : pendant le cycle, avant H72.
- **Résolution** : à H72.
- **Prérequis** : stats de combat et d'Intelligence élevées (seuils supérieurs à l'examen Chunin).
- **Coût d'inscription** : gratuit.
- **Prime** : importante, calculée à partir du niveau global du Chunin partant (+ réputation).
- **Relève** : un **Genin roturier** de remplacement arrive (bonne forme et moral élevé).
- **Héritage** : le Chunin laisse un **Parchemin mural d'héritage** — bonus permanent et cumulable selon sa stat dominante (réduction sur magasin, entraînement, hôpital ou objets de match, selon le profil du départ).

### Stagnation

À H72, un ninja **éligible** à une montée de grade (examen ou Vol d'Oiseau) mais **non inscrit** subit une pénalité : sa forme descend d'un palier et son moral baisse. Le jeu pousse à faire évoluer la carrière ou à accepter le coût de garder un vétéran.

---

## 6. Entraînement

- Chaque ninja peut recevoir un **focus** (stat ciblée) pour le cycle en cours.
- Seuls les ninjas pour lesquels vous avez **explicitement** choisi un focus sont entraînés.
- La progression est appliquée à **H72** ; le coût en Ryos est facturé à ce moment si votre trésorerie le permet.
- L'âge du ninja modère l'efficacité : les plus jeunes progressent plus vite.
- Une stat déjà au **plafond du grade** ne progresse plus tant que le ninja n'a pas monté de grade.
- Le **Bureau** affiche une prévision des dépenses (par ninja, total cycle, solde estimé après clôture).

---

## 7. Missions (contrats idle)

Les missions sont réservées aux ninjas **au banc** (hors escouade active).

### Règles générales

- **Une mission par palier de danger** par cycle (maximum trois contrats différents).
- Résolution automatique à **H72**.
- Les récompenses doivent être **collectées manuellement** après résolution.

### Paliers

| Palier | Récompense | Risques | Prérequis |
|--------|------------|---------|-----------|
| **Routine** | Ryos modestes | Aucun | Tous les ninjas |
| **Infiltration** | Ryos moyens | Blessure légère possible | Vitesse ou Intelligence suffisante |
| **Cyclone** | Ryos élevés | Blessure grave ou mort possible | Au moins une stat de combat élevée |

### Conséquences des blessures

- **Légère** : impact sur la forme.
- **Grave** : forme au plus bas + plusieurs cycles de convalescence sans soin à l'hôpital.
- **Mort** : le ninja est définitivement perdu.

### Butin

Les missions peuvent rapporter des **objets utilitaires** (pansements, kits, fumigènes, parchemins…) ou, plus rarement, des profils exceptionnels.

---

## 8. Économie

### Revenus principaux

| Source | Nature |
|--------|--------|
| **Ligue** | Prime selon victoire, nul ou défaite |
| **Missions** | Contrats idle selon le palier |
| **Vol d'Oiseau** | Prime de départ du Chunin |

### Dépenses principales

| Poste | Moment |
|-------|--------|
| **Salaires** | H72 — escouade active uniquement |
| **Entraînement** | H72 — ninjas avec focus actif |
| **Examen Chunin** | À l'inscription |
| **Hôpital** | À la demande |
| **Académie** | À l'achat d'un aspirant |
| **Magasin du village** | Pendant le cycle |
| **Marché entre joueurs** | À l'achat (commission au vendeur) |

Les salaires augmentent avec le **niveau global** du ninja : une escouade expérimentée coûte cher à maintenir.

### Objets (trois catégories)

| Type | Usage |
|------|-------|
| **Bureau** | Consommé immédiatement depuis le Bureau (soins, cartes, parchemins…) |
| **Match** | Un slot par ninja ; effet déclenché en opération si les conditions sont remplies |
| **Cycle** | Effet sur tout le cycle (météo, salaires, forme…) |

### Magasin du village

- Catalogue **personnel**, réassort périodique (tous les quelques cycles de ligue).
- Promotions aléatoires chaque cycle.
- Fermé en cas de dette ou pendant le gel H71+.

### Marché entre joueurs (Échanges)

- Vente de ninjas au banc ou d'objets non équipés.
- Nombre limité d'annonces actives simultanées.
- Commission prélevée sur la vente (légèrement plus élevée pour les lignées nobles).
- Marché **global** : tous les Sensei humains du serveur ; la ligue reste le cadre compétitif.
- Fermé à partir de H71.

---

## 9. Académie et Sceau de Chakra

### Académie (recrutement)

- **Trois aspirants Genin** sont visibles en permanence au Bureau.
- Toutes les **24 heures (UTC)**, l'aspirant le plus ancien disparaît ; les autres glissent ; un nouveau arrive.
- Recrutement possible tant que l'opération n'est pas gelée (avant H71).
- Chaque aspirant affiche sa voie, son potentiel, sa lignée et un **prix** selon la rareté du profil.
- Un seul recrutement payant par fenêtre de rotation (prendre ou laisser).

### Sceau de Chakra (rituel quotidien)

- **Un sceau gratuit par jour** (minuit UTC), avec un stock maximum limité.
- Ouverture au Bureau : loot aléatoire (commun → rare → épique → jackpot très rare).
- Le **jackpot** (Sceau d'Or) garantit que le **prochain** aspirant de l'Académie sera un Prodige ou une lignée noble.

---

## 10. Hôpital

- Soigne les ninjas en forme **Lamentable** (hors convalescence prolongée après blessure grave).
- Coût en Ryos selon le **grade** du ninja.
- Les parchemins d'héritage peuvent réduire le coût.
- Fermé pendant le gel H71+.

---

## 11. Clans de joueurs (coopération)

Hub **sans bonus de combat** — jusqu'à **12 Senseis** par clan.

### Tableau d'affichage Académie

- Chaque membre peut **recommander un aspirant** de sa vitrine sur le tableau du clan (une fois par cycle).
- Visible par les alliés jusqu'à expiration de l'aspirant.
- Chaque allié recrute avec **ses propres Ryos**.

### Puits de Chakra collectif

- Chaque Sceau de Chakra quotidien brisé ajoute une **goutte** au puits du clan.
- À un seuil collectif, tous les membres reçoivent un **Sceau de Chakra bonus** (dans la limite du stock personnel).

---

## 12. Ligue

### Structure

- **Pools** de 6 Sensei (humains et/ou bots).
- **Saison** : 10 cycles en round-robin (chacun affronte chacun).
- **5 divisions** : la 1ʳᵉ est l'élite, la 5ᵉ la plus basse.

### Intégration d'un nouveau joueur

- Tout nouvel humain commence en **division basse**.
- S'il rejoint une pool avec un **bot**, il prend sa place dans le calendrier en cours.
- Sinon, une nouvelle pool est créée (1 humain + bots de remplissage).

### Points et classement

| Résultat match | Points |
|----------------|--------|
| Victoire | 3 |
| Nul | 1 |
| Défaite | 0 |

En cas d'égalité de points : victoires, puis matchs joués.

### Fin de saison (cycle 10)

- **1er** : promotion de division.
- **6ᵉ** : relégation.
- Nouvelle pool et nouveau calendrier.

### Espionnage (à partir de H36)

Rapport sur l'adversaire du cycle : tendances offensives, tanks, vitesse, élément dominant, indice sur l'environnement probable. Les informations restent **partielles** — pas de lecture exacte des stats adverses.

### Invitation

Un Sensei peut générer un **lien d'invitation** vers sa pool pour recruter des alliés dans sa ligue.

---

## 13. Opération de frontière (match de ligue)

### Déroulement visible

- **Chronique narrative** : récit romancé débloqué progressivement après H71 (les deux adversaires lisent la même histoire au même rythme).
- **Débrief mécanique** : possession, scores, environnement, équipement — ton plus analytique, personnalisé par joueur.
- **Spectateur** : possibilité de suivre des matchs d'autres pools.

### Structure d'un match

- **Douze tours maximum**.
- Chaque tour : initiative → choix de l'attaquant → cible → résolution du duel.
- **Environnement** aléatoire (météo, terrain) avec modificateurs ; certains objets de cycle compensent les conditions défavorables.

### Résolution des duels (sans formules)

Chaque échange oppose attaquant et défenseur. Le serveur combine :

- les stats pertinentes (combat, vitesse, intelligence) ;
- un **facteur aléatoire** (dés) pour éviter l'issue purement déterministe ;
- des modificateurs : éléments, forme, composition d'équipe, traits, équipement ;
- des événements spéciaux : **critiques**, **ratés**, **Genjutsu** (paralysie ou confusion), **soins** des Protect.

Le **Sensei** peut tenter d'**intercepter un coup fatal** sur un de ses ninjas : cela consomme du chakra de match et dépend de l'Intelligence moyenne de l'escouade.

### Conditions de victoire

1. **K.O. immédiat** : si tous les actifs d'une équipe sont à terre (PV ou chakra épuisé), l'adversaire gagne sur-le-champ.

2. **Fin des douze tours** : si aucune équipe n'est totalement éliminée, le serveur calcule un **score de force restante** pour chaque camp, en pondérant les PV et le chakra restants. Il faut un **écart net** entre les deux scores pour qu'un vainqueur soit désigné ; sinon, **match nul**.

La **possession** (temps d'initiative) sert à la narration et au débrief — elle **ne détermine pas** le vainqueur.

### Conséquences (à H72)

| Résultat | Points ligue | Prime Ryos |
|----------|--------------|------------|
| Victoire | 3 | Élevée |
| Nul | 1 chacun | Modérée |
| Défaite | 0 | Aucune |

---

## 14. Écrans du jeu

| Écran | Rôle |
|-------|------|
| **Bureau** | Hub : budget, examens, Vol d'Oiseau, hôpital, Académie, Sceau de Chakra |
| **Escouade** | Composition, consignes, échanges actif/banc |
| **Entraînement** | Focus par stat, prévision de coût |
| **Missions** | Contrats idle |
| **Ligue** | Classement, calendrier, espionnage |
| **Magasin** | Achats d'objets du village |
| **Échanges** | Marché entre joueurs |
| **Inventaire** | Objets et équipement match/cycle |
| **Clan** | Tableau Académie, Puits de Chakra |
| **Opération** | Chronique et débrief du match |

---

## 15. Notifications

Une cloche dans l'interface signale les événements importants : fin de mission, résultats d'examen, clôture de cycle, messages de ligue, etc.

---

## Historique des mises à jour

| Date | Changement |
|------|------------|
| 2026-07-09 | Création du document (règles joueur, sans formules exactes) |
| 2026-07-09 | Renommage dispensaire → hôpital ; intégration dans l'interface joueur |
