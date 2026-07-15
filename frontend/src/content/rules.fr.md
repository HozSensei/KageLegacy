# Kage Legacy — Règles du jeu

**Kage Legacy** est un manager shinobi asynchrone par navigateur. Vous incarnez un **Jonin-Sensei** : vous gérez une escouade de jeunes ninjas, votre budget en **Ryos**, et vous affrontez d'autres Sensei dans une **ligue par pools** sur des **cycles de 72 heures** (temps réel).

Ce guide est organisé en **deux parties** :

1. **L'interface** — ce que fait chaque écran, regroupé comme dans le menu de navigation.
2. **Les systèmes de jeu** — les règles détaillées (cycle, progression, combat, économie…).

*Dernière mise à jour : juillet 2026*

---

# Partie 1 — L'interface

Le menu latéral regroupe les écrans en **cinq sections** : Centre de commande, Escouade & progression, Missions & ligue, Économie, et Compte & outils. La barre de progression en haut de l'écran indique l'heure du cycle en cours (H0 → H72).

## Centre de commande

### Bureau

**Route :** `/bureau` — **Hub principal** du jeu.

C'est votre tableau de bord quotidien. Vous y trouvez :

| Zone | Rôle |
|------|------|
| **Trésorerie** | Solde de Ryos, réputation, chakra de match, prévision salaires + entraînement à H72 |
| **Escouade active** | Aperçu des 3 ninjas de terrain et accès rapide à leur fiche |
| **Sceau de Chakra** | Rituel quotidien gratuit (minuit UTC) — voir § Académie et Sceau de Chakra |
| **Examen Chunin** | Inscrire un Genin éligible avant H72 |
| **Vol d'Oiseau** | Inscrire un Chunin prêt au départ avant H72 |
| **Stagnation** | Avertissements sur les ninjas éligibles à une montée non inscrits |
| **Académie** | Vitrine des 3 aspirants Genin en rotation — recrutement payant |
| **Dispensaire** | Soins des ninjas en forme Lamentable (hôpital) |

Le Bureau concentre les actions de **gestion du cycle** : budget, recrutement, soins et inscriptions de carrière. Consultez-le en début de cycle et avant les jalons H54 / H71.

### Journal du cycle

**Route :** `/journal`

Fil d'activité chronologique de votre cycle : gains d'entraînement, résultats de missions, clôture économique, messages de ligue, etc. Utile pour retracer ce qui s'est passé sans rouvrir chaque écran.

### Profil

**Route :** `/profil`

Identité publique du Sensei : nom, mur d'héritage (parchemins laissés par les Chunin partis en Vol d'Oiseau), cosmétiques Pack Élite. Les autres joueurs peuvent consulter votre profil via `/sensei/:id`.

---

## Escouade & progression

### Escouade

**Route :** `/squad`

Écran central de la **préparation tactique** :

| Fonction | Détail |
|----------|--------|
| **Composition** | 3 ninjas actifs + banc de remplaçants ; échanges actif ↔ banc jusqu'à H54 |
| **Deck d'opération** | Pour chaque actif : carte technique + domaines primaire/secondaire (6 cartes par ninja) — voir § Deck d'opération |
| **Consignes** | Normal, Offensive, Défensive, Protection — héritage d'interface, alignées avec le deck |
| **Dossier d'opération** | Posture de cycle (Équilibrée, Offensive, Défensive, Protection) à partir de H36 |
| **Briefing** | Rappel de l'adversaire de ligue et du prochain match |
| **Marché P2P** | Mettre un ninja du banc en vente ou le libérer |

Un ninja est **indisponible** s'il est en mission, listé sur le marché entre joueurs, ou si la fenêtre tactique est fermée (H71+).

### Entraînement

**Route :** `/training`

Configurez les plans d'entraînement du cycle :

| Levier | Portée | Coût |
|--------|--------|------|
| **Préparation** | Un type par ninja actif (3 choix) | Payant en Ryos à H72 |
| **Entraînement global** | Un type pour toute l'escouade | Gratuit |

Six types disponibles (Chakra, Physique, Médical, Genjutsu, Ninjutsu, Équilibre). L'écran affiche la **prévision de coût** et les gains attendus. L'entraînement est **gelé à H54** (composition figée). Détails mécaniques : voir § Entraînement.

### Clan

**Route :** `/clan`

Hub **coopératif sans bonus de combat** (jusqu'à 12 Senseis) :

- **Créer ou rejoindre** un clan.
- **Tableau d'affichage Académie** : recommander un aspirant de votre vitrine (1 fois par cycle).
- **Puits de Chakra** : chaque Sceau quotidien alimente un seuil collectif → Sceau bonus pour tous les membres.

Détails : voir § Clans de joueurs.

---

## Missions & ligue

### Missions

**Route :** `/missions`

Envoie de **missions idle** (rangs D, C, B, A) aux ninjas **du banc uniquement** :

- Une mission par rang et par cycle (jusqu'à 4 simultanées).
- Probabilités de réussite affichées selon la note globale du ninja.
- Résolution automatique à **H72** ; récompenses à **collecter manuellement**.

Un panneau de **reconnaissance** est aussi accessible depuis cet écran. Détails : voir § Missions idle.

### Reconnaissance

**Route :** `/reconnaissance`

Combat d'entraînement pour **tester votre composition** entre **H0 et H36** :

| Mode | Fonctionnement |
|------|----------------|
| **Matchmaking** | Adversaire humain de division proche, sinon bot de ligue |
| **Défi direct** | Défier un membre de votre pool ou d'une autre ligue (acceptation requise) |

Une mission par cycle. Le résultat conditionne la **qualité de l'espionnage** (H36 / H54). Détails : voir § Reconnaissance.

### Espionnage

**Route :** `/espionnage`

Rapport d'intel sur l'**adversaire de ligue** du cycle :

| Jalon | Contenu |
|-------|---------|
| **H36** | Tendances sur les derniers matchs (nécessite une reconnaissance ce cycle) |
| **H54** | Rapport complet figé sur les 3 ninjas adverses (partiel ou complet selon reconnaissance) |

Comparez tendances (H36) et unité repérée (H54) pour détecter une formation atypique. Détails : voir § Le cycle de 72 heures.

### Ligue

**Route :** `/league`

Vue compétitive de votre **pool** (6 Sensei) :

- Classement, calendrier des 10 cycles de saison.
- Points (victoire 3, nul 1, défaite 0) et promotions / relégations en fin de saison.
- **Lien d'invitation** vers votre pool.
- Accès rapide à l'espionnage et aux défis de reconnaissance.

Détails structure : voir § Ligue.

### Opération

**Route :** `/operation`

Match de ligue du cycle (**H71 → H72**) :

- **Chronique narrative** dévoilée progressivement (même rythme pour les deux adversaires).
- **Débrief mécanique** : plis gagnés, scores PV, environnement.
- Mode **spectateur** pour les matchs d'autres pools.

Détails combat : voir § Opération de frontière.

---

## Économie

### Magasin

**Route :** `/market`

**Magasin du village** — achats avec vos Ryos :

- Objets utilitaires (bureau, match, cycle) par catégories.
- **Offres de cartes tactiques** : 10 tirages aléatoires par réassort, nouveau bonus % à l'achat.
- Promotions aléatoires chaque cycle ; catalogue personnel réassorti périodiquement.

Fermé en cas de **dette** ou pendant le gel **H71+**. Détails : voir § Économie.

### Perfectionnement

**Route :** `/refinement`

**Atelier de perfectionnement** — retirage payant du **bonus %** d'une carte tactique possédée :

- Coût selon la rareté de la carte ; réduction possible via l'héritage magasin.
- Bloqué si trésorerie négative ou carte listée sur le marché P2P.
- Accessible aussi depuis l'**Inventaire**.

Détails cartes : voir § Cartes technique ninja.

### Échanges

**Route :** `/exchanges`

**Marché entre joueurs** (P2P) :

- Vente de ninjas au banc ou d'objets / cartes non équipés.
- Nombre limité d'annonces actives ; commission au vendeur.
- Marché **global** (tous les Sensei humains du serveur).

Fermé à partir de **H71** et en cas de dette.

### Inventaire

**Route :** `/inventory`

Gestion de votre **stock** :

| Catégorie | Usage |
|-----------|--------|
| **Cartes technique** | Assignation par ninja actif pour le deck d'opération |
| **Consommables bureau** | Utilisation immédiate sur un ninja |
| **Équipement cycle** | 1 par ninja pour tout le cycle |
| **Objets match** | 1 slot par ninja ; effet en opération si conditions remplies |

Actions : équiper, utiliser, lister sur le marché P2P, ouvrir le perfectionnement.

---

## Compte & outils

### Notifications

Icône **cloche** dans l'en-tête : fin de mission, résultats d'examen, clôture de cycle, début d'opération, rapport d'espionnage, Puits de clan, etc. Chaque notification propose un lien vers l'écran concerné.

### Outils Élite

**Route :** `/elite/outils` — réservé aux abonnés **Pack Élite**.

Simulateur de deck, préremplissage espionnage, calculateur ROI entraînement — **sans avantage compétitif direct** en match.

### Règles du jeu

**Route :** `/rules` — ce document, accessible aussi depuis le menu profil (thème, langue, déconnexion).

---

# Partie 2 — Les systèmes de jeu

## Le cycle de 72 heures

Chaque cycle est une « semaine de jeu » synchronisée entre tous les joueurs du serveur.

| Phase | Période | Activités principales |
|-------|---------|------------------------|
| **Préparation** | H0 → H35 | Escouade, deck, entraînement, missions, magasin, Académie, reconnaissance (H0–H36) |
| **Milieu de cycle** | H36 → H70 | Tendances adverses, espionnage, gestion continue |
| **Opération** | H71 | Match de ligue simulé ; chronique narrative dévoilée progressivement |
| **Clôture** | H72 | Résolution missions, primes ligue, salaires, stagnation, Vol d'Oiseau, facturation entraînement, nouveau cycle |

### Gel tactique

| Jalon | Effet |
|-------|--------|
| **H54** | **Composition figée** (3 ninjas actifs) ; entraînement gelé ; tendances H36 déjà disponibles ; **rapport complet** sur l'unité adverse |
| **H54 → H70** | Deck, consignes, cartes tactiques et objets encore modifiables |
| **H71** | Gel total jusqu'au cycle suivant |

### Espionnage (jalons)

| Jalon | Contenu |
|-------|---------|
| **H36** | **Tendances** sur les derniers matchs de ligue de l'adversaire — nécessite une **reconnaissance** réussie ce cycle |
| **H54** | **Rapport complet** figé sur la composition adverse (qualité partielle/complet selon votre reconnaissance) |
| **H54 → H71** | Le rapport ne change plus ; comparez tendances vs unité repérée pour détecter une formation atypique |

La mission de **reconnaissance** (H0–H36) conditionne l'accès et la qualité de l'intel — ce n'est pas un combat contre l'adversaire de ligue, mais une mission sur le terrain pour récolter des renseignements.

Examens Chunin, soins et missions doivent être **réglés avant H54** pour éviter un trou dans la composition figée.

### Jalons automatiques

- **H0 → H36** : fenêtre de reconnaissance.
- **H36** : tendances adverses (si reconnaissance effectuée) ; résolution des missions de reconnaissance en cours.
- **H54** : gel de la composition + rapport d'espionnage complet figé.
- **H71** : simulation du match de ligue ; gel final ; début de la chronique narrative.
- **H72** : verdicts examens Chunin, Vol d'Oiseau, clôture économique, nouveau cycle.

---

## Le Sensei (votre compte)

### Ressources

- **Ryos** : monnaie du village. Revenus (ligue, missions, Vol d'Oiseau…) et dépenses (salaires, entraînement, achats…) s'y cumulent.
- **Réputation** : prestige lié notamment au Vol d'Oiseau.
- **Chakra de match** : réserve limitée permettant d'intercepter des coups fatals pendant l'opération. Chaque interception consomme une part substantielle de cette réserve.

### Identité du Sensei

Votre **nom de Sensei** et votre identité visuelle (Pack Élite) définissent votre présence en ligue. Il n'y a pas de spécialité à choisir à la création du compte : la préparation passe par l'escouade, les consignes et les cartes tactiques.

### Dette et gel administratif

Si votre solde de Ryos devient **négatif** (salaires impayés, dépenses excessives), un **gel administratif** bloque les nouvelles dépenses : magasin, marché entre joueurs, examen Chunin, hôpital, perfectionnement, etc. Remettez votre trésorerie à l'équilibre pour reprendre vos achats.

Un léger découvert peut exister ; la dette persistante entraîne des **intérêts** à la clôture du cycle, ce qui augmente la pression économique sans game over immédiat.

### Compte invité

Un **compte invité** permet d'essayer le jeu pendant une durée limitée, puis de le convertir en compte permanent.

---

## Les ninjas

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

Le moral (échelle interne) influence la stabilité de l'escouade. Il baisse notamment en cas d'échec à l'examen Chunin, de salaires impayés, de **stagnation** (voir § Progression des grades), ou d'achat d'un ninja sur le marché entre joueurs.

---

## L'escouade et le deck d'opération

### Composition

- **3 ninjas actifs** (postes de terrain) + un **banc** de remplaçants.
- La composition est modifiable jusqu'à **H54** (gel des 3 ninjas actifs).

### Deck d'opération (combat par plis)

Chaque match se joue en **18 plis** : deck mélangé de **6 cartes par ninja actif** — **1 carte technique inventaire** + **2× carte stat primaire** + **3× carte stat secondaire** (domaines taijutsu, ninjutsu, genjutsu, médecine) + **relais** si emplacements vides.

- **PV max** = note globale du ninja × 10 (moyenne des 6 stats).
- Chaque pli : les deux camps retournent une carte ; comparaison domaine vs domaine (+20 % si avantage de type).
- **Victoire** : plus de PV d'équipe en fin de match ; égalité → plis gagnés.
- **Objets match** : retirés ; **cartes technique** assignées par ninja ; consommables bureau et équipement cycle hors combat.
- **Reconduction** : chaque nouvelle journée, le deck est **recopié** (cartes des ninjas actifs avec charges restantes).
- Les **consignes** restent modifiables en interface mais ne pilotent plus le moteur de combat (remplacées par le deck).

### Consignes individuelles (héritage interface)

| Consigne | Rôle en match | Quand l'utiliser |
|----------|---------------|----------------|
| **Normal** | Comportement équilibré ; l'attaquant adverse vous cible selon les règles standard. | Ninja polyvalent, ou lorsque vous ne voulez pas forcer un rôle. |
| **Offensive** | Priorité à l'attaque : le ninja choisit sa meilleure stat de combat pour frapper. | Spécialiste de dégâts, burst, pression rapide ; escouade qui veut finir tôt. |
| **Défensive** | Forte probabilité d'**être ciblé** quand l'adversaire attaque — le ninja sert de bouclier. | Absorber la pression pour protéger un allié fragile ; cartes de parade ou de réduction de dégâts. |
| **Protection** | Peut **soigner un allié désigné** lorsqu'il est gravement blessé. | Soutien, médecin, maintien de la ligne ; cartes de soin. |

> **Vocabulaire :** en interface et dans ce guide, **Défensive** remplace l'ancien terme « Tank » (provocation) et **Protection** remplace « Protect » (soutien allié). Les valeurs techniques du serveur restent inchangées.

### Quand composer votre escouade

- **2 Offensive + 1 Défensive** : pression directe avec un bouclier.
- **1 Offensive + 1 Défensive + 1 Protection** : équilibre classique — burst, absorption, soin.
- **2 Protection + 1 Défensive** : match lent, survie et usure (genjutsu, soins).
- **3 Normal** : pas de rôle assumé — viable mais sans synergie de ciblage.

Les **traits** modifient ce tableau : un **Égoïste** ignore parfois le ciblage défensif et ne se mettra jamais en consigne Défensive.

### Dossier d'opération (postures)

À partir de **H36**, l'**espionnage** révèle des indices sur l'adversaire (voies, consignes repérées, vitesse, élément). Dans l'écran **Escouade**, le **dossier d'opération** vous permet de choisir une **posture** avant le gel tactique (**H71**).

| Posture | Intention | Quand la choisir |
|---------|-----------|------------------|
| **Équilibrée** | Pas de pari marqué sur le cycle. | Adversaire peu lisible, escouade mixte, ou vous affinez encore consignes et cartes. |
| **Offensive** | Gagner l'initiative et finir vite. | Votre escouade est montée Offensive ; l'espionnage signale aussi une disposition offensive adverse (miroir) ou une escouade lente. |
| **Défensive** | Tenir la ligne sous la pression. | Vous avez au moins un ninja en consigne Défensive ; l'adversaire montre **2 consignes Offensive** ou plus. |
| **Protection** | Survivre au tempo, soigner, protéger. | Vous avez des consignes Protection et des cartes de soin ; l'adversaire est **rapide** ou à **fort potentiel** (échanges longs risqués). |

**Important :** la posture **ne donne pas de bonus caché** en match. Elle enregistre votre **plan de cycle** et adapte les **conseils** du dossier (croisement avec l'espionnage). Pour que le plan soit réel, alignez **posture + consignes + cartes tactiques** sur chaque ninja.

---

## Cartes technique ninja

Chaque ninja actif compose **6 cartes** dans le deck d'opération : **1 carte technique inventaire** + **2 exemplaires** de la stat primaire + **3 exemplaires** de la stat secondaire.

| Règle | Détail |
|-------|--------|
| **Porteur** | La carte est jouée par le **ninja assigné**. |
| **Puissance** | Stat principale (+ moyenne secondaire : domaine, vitesse ou intelligence) × **bonus % unique** tiré à l'acquisition. |
| **Bonus variable** | Communes 1–20 % · avec synergie 5–25 % · rares 15–35 % · légendaires 30–50 %. |
| **Prérequis** | Certaines cartes exigent l'élément du porteur (ex. Lame suiton → Suiton). |
| **Charges** | 5 charges ; une consommée quand la carte est **tirée** dans un pli (usage quasi systématique chaque cycle). |
| **Marché P2P** | L'**exemplaire** est transféré tel quel : **même bonus %**, mêmes charges — pas de nouveau tirage à l'achat. |
| **Atelier de perfectionnement** | Retirage payant du bonus % sur une carte possédée (coût selon rareté ; réduction héritage magasin). |
| **Magasin** | 10 offres tirées **au hasard** dans le catalogue à chaque réassort (répétitions possibles) ; **nouveau tirage** du bonus à l'achat. |
| **Effets** | Certaines cartes ont un **effet de pli** (dégâts bonus, réduction, soin, malus adverse au pli suivant) — décrit sur la carte. |
| **Éléments** | 16 cartes exigent l'élément du porteur — **4 Suiton, 4 Futon, 4 Raiton, 4 Doton, 3 Katon** (répartition équilibrée). |

Exemples : **Lame de chakra** (+15 %, sans prérequis), **Lame suiton** (+30 %, porteur Suiton), **Scalpel de chakra** (médecine offensive).

---

## Progression des grades

### Départ

Vous commencez avec **6 ninjas** : un Chunin actif au centre, cinq Genin (dont deux actifs et trois au banc). Chaque trait de caractère est représenté une fois dans l'escouade de départ.

### Examen Chunin

- **Inscription** : avant H72 (pendant tout le cycle).
- **Résolution** : automatique à H72.
- **Prérequis** : **note moyenne globale** ≥ 8 (somme des 6 stats ÷ 6, arrondi).
- **Inscription** : **gratuite**.
- **Réussite** : prime 300–1 000 Ryos, +1 à +5 réputation, objet, forme remontée d'un palier, moral +2 à +5.
- **Succès** : passage au grade Chunin et plafonds relevés.
- **Échec** : le ninja reste Genin ; son moral chute.

### Vol d'Oiseau (Chunin → départ)

- **Inscription** : pendant le cycle, avant H72.
- **Résolution** : à H72.
- **Prérequis** : **note moyenne globale** ≥ 14 (même calcul que l'examen Chunin).
- **Coût d'inscription** : gratuit.
- **Prime** : importante, calculée à partir du niveau global du Chunin partant (+ réputation).
- **Relève** : un **Genin roturier** de remplacement arrive (bonne forme et moral élevé).
- **Héritage** : le Chunin laisse un **Parchemin mural d'héritage** — bonus permanent et cumulable selon sa stat dominante (réduction sur magasin, entraînement, hôpital ou objets de match, selon le profil du départ).

### Stagnation

À H72, un ninja **éligible** à une montée de grade (examen ou Vol d'Oiseau) mais **non inscrit** subit une pénalité après **un cycle de grâce** : d'abord un avertissement sans malus, puis sa forme descend d'un palier et son moral baisse. Le jeu pousse à faire évoluer la carrière ou à accepter le coût de garder un vétéran.

---

## Entraînement

Deux leviers complémentaires :

| | **Préparation** (actifs) | **Entraînement global** (toute l'équipe) |
|---|--------------------------|-------------------------------------------|
| **Coût** | Payant en Ryos à H72 | **Gratuit** |
| **Gain moyen** | Capital 0,4 / ninja / cycle | Capital 0,2 / ninja / cycle |
| **Choix** | Un type par titulaire (3 actifs) | Un type pour toute l'équipe |

### Types groupés (6)

Chakra (IQ, ninjutsu, genjutsu) · Physique (taijutsu, vitesse) · Médical · Genjutsu · Ninjutsu · Équilibre (toutes les stats).

### Capital de stat et chance

Chaque ninja tire une **part** du pot (variance légère cycle par cycle). Les **prodiges** progressent plus vite (×1,25) ; les **prometteurs** ×1,1.

### Cumul

Un titulaire peut cumuler **préparation + global** (ex. les deux en Chakra) pour accélérer la montée en grade (~5 cycles ordinaire → Chunin, ~2–3 prodige).

- Progression appliquée à **H72** ; préparation facturée si trésorerie suffisante.
- L'âge modère l'efficacité ; une stat au **plafond du grade** ne progresse plus.
- Le **Bureau** affiche la prévision (salaires + préparation, global gratuit).

---

## Missions idle

Les missions sont réservées aux ninjas **au banc** (hors escouade active).

### Règles générales

- **Une mission par rang** par cycle (maximum quatre : D, C, B, A).
- Résolution automatique à **H72** avec **jet de réussite**.
- Les récompenses doivent être **collectées manuellement** après résolution.
- Tous les rangs sont **envoyables** ; l'interface affiche les probabilités selon la **note globale** du ninja (moyenne des 6 stats, arrondie).

### Rangs

| Rang | Ryos (succès) | Note cible (50 % réussite) | Risques si échec |
|------|---------------|----------------------------|------------------|
| **D** | 300–500 | 4 | Aucun |
| **C** | 600–800 | 6 | Blessure légère possible |
| **B** | 1 000 | 8 | Blessure grave ou mort possible |
| **A** | 1 500–2 000 | 10 | Blessure grave ou mort élevés |

Les pourcentages de **réussite**, **blessure** et **mort** évoluent avec l'écart entre la note du ninja et la note cible du rang. En cas de **succès** : Ryos, loot bonus et **gain de stat** (complément à l'entraînement). En cas d'**échec** : 0 Ryos, pas de loot.

### Progression via missions

Chaque réussite accorde un petit gain sur une stat (ex. +0,25 à +1,0 selon le rang). Les **remplaçants au banc** bénéficient d'un **bonus** (×1,5 sur D/C) pour compenser l'entraînement global plus lent.

### Conséquences des blessures

- **Légère** : forme Lamentable.
- **Grave** : forme Lamentable + plusieurs cycles sans soin à l'hôpital.
- **Mort** : le ninja est définitivement perdu.

### Butin

Sur **succès** uniquement : objets utilitaires (pansements, kits, fumigènes, parchemins…) ou, plus rarement, recrutement prodige sur les rangs B/A.

Spec détaillée : [`specs/mission-rank-system.md`](../../../specs/mission-rank-system.md).

---

## Reconnaissance

Combat d'entraînement pour **tester votre composition** pendant la phase de préparation, avant le gel tactique de l'opération. **Une mission par cycle** par Sensei.

| Mode | Fonctionnement |
|------|----------------|
| **Matchmaking** | Adversaire humain de division et puissance proches ; sinon un **bot** de la ligue. |
| **Défi direct** | Depuis le menu Ligue : défier un membre de votre pool ou d'une autre ligue (division proche). Le défenseur doit **accepter**. |

**Conséquences** : moteur de combat réel (objets, cartes tactiques, environnement) ; les K.O. peuvent **baisser la forme** comme en match de ligue. **Butin** : Ryos + objet consommable aléatoire + chance de carte tactique (y compris en défaite). N'affecte **pas** le classement de ligue.

**Résolution** : à **H36**. Le résultat détermine la qualité de l'espionnage (tendances H36, rapport H54).

---

## Économie

### Revenus principaux

| Source | Nature |
|--------|--------|
| **Ligue** | Prime selon victoire, nul ou défaite |
| **Missions** | Missions idle par rang (D–A) |
| **Vol d'Oiseau** | Prime de départ du Chunin |
| **Reconnaissance** | Butin de combat (Ryos, objets, cartes) |

### Dépenses principales

| Poste | Moment |
|-------|--------|
| **Salaires** | H72 — escouade active uniquement |
| **Entraînement** | H72 — préparation des actifs (payant) ; global gratuit pour toute l'équipe |
| **Examen Chunin** | À l'inscription |
| **Hôpital** | À la demande |
| **Académie** | À l'achat d'un aspirant |
| **Magasin du village** | Pendant le cycle |
| **Perfectionnement** | À la demande (retirage bonus carte) |
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

## Académie et Sceau de Chakra

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

## Hôpital

- Soigne les ninjas en forme **Lamentable** (hors convalescence prolongée après blessure grave).
- Coût en Ryos selon le **grade** du ninja.
- Les parchemins d'héritage peuvent réduire le coût.
- Fermé pendant le gel H71+.

---

## Clans de joueurs (coopération)

Hub **sans bonus de combat** — jusqu'à **12 Senseis** par clan.

### Tableau d'affichage Académie

- Chaque membre peut **recommander un aspirant** de sa vitrine sur le tableau du clan (une fois par cycle).
- Visible par les alliés jusqu'à expiration de l'aspirant.
- Chaque allié recrute avec **ses propres Ryos**.

### Puits de Chakra collectif

- Chaque Sceau de Chakra quotidien brisé ajoute une **goutte** au puits du clan.
- À un seuil collectif, tous les membres reçoivent un **Sceau de Chakra bonus** (dans la limite du stock personnel).

---

## Ligue

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

### Invitation

Un Sensei peut générer un **lien d'invitation** vers sa pool pour recruter des alliés dans sa ligue.

---

## Opération de frontière (match de ligue)

### Déroulement visible

- **Chronique narrative** : récit romancé débloqué progressivement après H71 (les deux adversaires lisent la même histoire au même rythme).
- **Débrief mécanique** : plis gagnés, scores PV, environnement — ton analytique personnalisé.
- **Spectateur** : possibilité de suivre des matchs d'autres pools.

### Structure d'un match

- **Dix-huit plis maximum** (6 cartes × 3 ninjas actifs, mélangées).
- Chaque pli : révélation simultanée des cartes, comparaison de puissance, dégâts sur le propriétaire perdant.
- **Environnement** aléatoire (météo, terrain) avec modificateurs sur les domaines concernés ; les objets « counter terrain » sont retirés.

### Résolution des plis

Chaque pli oppose deux cartes (domaine vs domaine) :

- bonus de type +20 % (Taijutsu > Genjutsu > Ninjutsu > Taijutsu) ;
- Intelligence/Vitesse en support selon le domaine ;
- effets Tai (+10 % équipe au pli suivant) et Gen (−10 % adverse) ;
- Médecine : soin si victoire, 50 % dégâts si défaite ;
- cartes **relais** si le propriétaire est K.O. (proxy aléatoire, stat dominante) **ou** si le deck est incomplet (technique non assignée, domaines non enregistrés).

### Conditions de victoire

1. **K.O. immédiat** : si tous les actifs d'une équipe sont à terre (PV ou chakra épuisé), l'adversaire gagne sur-le-champ.

2. **Fin des plis** : si aucune équipe n'est totalement éliminée après les 18 plis joués, le vainqueur est celui qui a le plus de **PV d'équipe restants** ; à égalité, celui qui a remporté le plus de **plis**.

Le ratio de **plis gagnés** alimente la narration et le débrief — il **ne détermine pas** seul le vainqueur (les PV restants priment).

### Conséquences (à H72)

| Résultat | Points ligue | Prime Ryos (base) | Butin bonus |
|----------|--------------|-------------------|-------------|
| Victoire | 3 | 1 600 | Ryos supplémentaires + objet aléatoire + chance de carte |
| Nul | 1 chacun | 800 | Idem (probabilités réduites) |
| Défaite | 0 | 100 (consolation) | Idem (probabilités réduites) |

---

## Historique des mises à jour

| Date | Changement |
|------|------------|
| 2026-07-09 | Création du document (règles joueur, sans formules exactes) |
| 2026-07-10 | Consignes renommées (Défensive / Protection), guide postures & cartes tactiques ; retrait du cercle Assaut/Mur/Flux |
| 2026-07-15 | Refonte en deux parties : interface par menus, puis systèmes de jeu |
