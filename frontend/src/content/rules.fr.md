# Kage Legacy — Règles du jeu

**Kage Legacy** est un manager shinobi asynchrone par navigateur. Vous incarnez un **Jonin-Sensei** : vous gérez une escouade de jeunes ninjas, votre budget en **Ryos**, et vous affrontez d'autres Sensei dans une **ligue par pools** sur des **cycles de 72 heures** (temps réel).

*Dernière mise à jour : juillet 2026*

---

## 1. Le cycle de 72 heures

Chaque cycle est une « semaine de jeu » synchronisée entre tous les joueurs du serveur.

| Phase | Période | Activités principales |
|-------|---------|------------------------|
| **Préparation** | H0 → H35 | Escouade, tactiques, entraînement, missions, magasin, Académie, **mission de reconnaissance (H0–H36)** |
| **Milieu de cycle** | H36 → H70 | Tendances adverses, espionnage, gestion continue |
| **Opération** | H71 | Match de ligue simulé ; chronique narrative dévoilée progressivement |
| **Clôture** | H72 | Résolution missions, primes ligue, salaires, stagnation, Vol d'Oiseau, facturation entraînement, nouveau cycle |

### Gel tactique

| Jalon | Effet |
|-------|--------|
| **H54** | **Composition figée** (3 ninjas actifs) ; entraînement gelé ; tendances H36 déjà disponibles ; **rapport complet** sur l'unité adverse |
| **H54 → H70** | Consignes, cartes tactiques et objets encore modifiables |
| **H71** | Gel total jusqu'au cycle suivant |

### Espionnage

| Jalon | Contenu |
|-------|---------|
| **H36** | **Tendances** sur les derniers matchs de ligue de l'adversaire (nombre de matchs indiqué ; peu fiable au 1er ou 2e match) — nécessite une **reconnaissance** réussie ce cycle |
| **H54** | **Rapport complet** figé sur la composition adverse (qualité partielle/complet selon votre reconnaissance) |
| **H54 → H71** | Le rapport ne change plus ; comparez tendances vs unité repérée pour détecter une formation atypique |

La mission de **reconnaissance** (H0–H36) conditionne l'accès et la qualité de l'intel — ce n'est pas un combat contre l'adversaire de ligue, mais une mission sur le terrain pour récolter des renseignements.

Examens Chunin, soins et missions doivent être **réglés avant H54** pour éviter un trou dans la composition figée.

### Jalons automatiques

- **H0 → H36** : mission de reconnaissance (1 combat d'entraînement par cycle, voir § Ligue).
- **H36** : **tendances adverses** (si reconnaissance effectuée).
- **H72** : verdicts examens Chunin, Vol d'Oiseau, clôture du cycle.
- **H54** : gel de la composition + **rapport d'espionnage complet** figé.
- **H71** : simulation du match de ligue ; gel final des consignes ; début de la chronique narrative.
- **H72** : clôture économique et début du cycle suivant.

---

## 2. Le Sensei (votre compte)

### Ressources

- **Ryos** : monnaie du village. Revenus (ligue, missions, Vol d'Oiseau…) et dépenses (salaires, entraînement, achats…) s'y cumulent.
- **Réputation** : prestige lié notamment au Vol d'Oiseau.
- **Chakra de match** : réserve limitée permettant d'intercepter des coups fatals pendant l'opération. Chaque interception consomme une part substantielle de cette réserve.

### Identité du Sensei

Votre **nom de Sensei** et votre identité visuelle (Pack Élite) définissent votre présence en ligue. Il n'y a pas de spécialité à choisir à la création du compte : la préparation passe par l'escouade, les consignes et les cartes tactiques.

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
- La composition est modifiable jusqu'à **H54** (gel des 3 ninjas actifs).
- Un ninja est **indisponible** s'il est en mission, en vente sur le marché P2P, ou si la fenêtre tactique est fermée.

### Deck d'opération (combat par plis)

Chaque match se joue en **14 plis** : deck mélangé de **9 cartes techniques** (3 par ninja actif : 1× principale, 2× secondaire) et **5 éléments de deck** (cartes tactiques d'escouade).

- **PV max** = note globale du ninja × 10 (moyenne des 6 stats).
- Chaque pli : les deux camps retournent une carte ; comparaison domaine vs domaine (+20 % si avantage de type).
- **Victoire** : plus de PV d'équipe en fin de match ; égalité → plis gagnés.
- **Objets match** : retirés du combat ; seules les **cartes tactiques** servent d'éléments de deck (plus d'équipement match par ninja).
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

### Cartes tactiques

Chaque ninja actif peut équiper **une carte tactique** (inventaire → équipement). Les cartes remplacent l'ancien « cercle de composition » (Assaut / Mur / Flux) : elles apportent des effets situationnels en combat.

| Règle | Détail |
|-------|--------|
| **Charges** | 3 charges par carte ; une charge est consommée **uniquement si la carte se déclenche**. |
| **Proc** | **1 déclenchement maximum par ninja et par match.** |
| **Épuisement** | À 0 charge, la carte disparaît de l'inventaire (à re-looter). |
| **Synergie** | Cartes d'**attaque** → consigne Offensive ; cartes de **défense** → Défensive ; cartes de **soutien** → Protection. |

Exemples : parade si ciblé deux fois au même tour (Défensive), chip de dégâts à l'attaque (Offensive), soin d'allié blessé (Protection).

---

## 5. Progression des grades

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

## 6. Entraînement

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

## 7. Missions (rangs D → A)

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

## 8. Économie

### Revenus principaux

| Source | Nature |
|--------|--------|
| **Ligue** | Prime selon victoire, nul ou défaite |
| **Missions** | Missions idle par rang (D–A) |
| **Vol d'Oiseau** | Prime de départ du Chunin |

### Dépenses principales

| Poste | Moment |
|-------|--------|
| **Salaires** | H72 — escouade active uniquement |
| **Entraînement** | H72 — préparation des actifs (payant) ; global gratuit pour toute l'équipe |
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

Le rapport se déroule en **deux temps** :

1. **H36 — Tendances** : habitudes sur les derniers matchs de ligue (échantillon indiqué ; fiabilité faible au 1er ou 2e match).
2. **H54 — Unité repérée** : rapport figé sur les 3 ninjas adverses (partiel ou complet selon votre reconnaissance).

Entre H36 et H54, ajustez votre composition selon les tendances. Après H54, seules consignes, cartes et objets restent modifiables.

### Mission de reconnaissance (H0 → H36)

Combat d'entraînement pour **tester votre composition** pendant la phase de préparation, avant le gel tactique de l'opération. **Une mission par cycle** par Sensei.

| Mode | Fonctionnement |
|------|----------------|
| **Matchmaking** | Adversaire humain de division et puissance proches ; sinon un **bot** de la ligue. |
| **Défi direct** | Depuis le menu Ligue : défier un membre de votre pool ou d'une autre ligue (division proche). Le défenseur doit **accepter**. |

**Conséquences** : moteur de combat réel (objets, cartes tactiques, environnement) ; les K.O. peuvent **baisser la forme** comme en match de ligue. **Butin** : Ryos + objet consommable aléatoire + chance de carte tactique (y compris en défaite). N'affecte **pas** le classement de ligue.

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
- des événements spéciaux : **critiques**, **ratés**, **Genjutsu** (paralysie ou confusion), **soins** des ninjas en consigne Protection.

Le **Sensei** peut tenter d'**intercepter un coup fatal** sur un de ses ninjas : cela consomme du chakra de match et dépend de l'Intelligence moyenne de l'escouade.

### Conditions de victoire

1. **K.O. immédiat** : si tous les actifs d'une équipe sont à terre (PV ou chakra épuisé), l'adversaire gagne sur-le-champ.

2. **Fin des douze tours** : si aucune équipe n'est totalement éliminée, le serveur calcule un **score de force restante** pour chaque camp, en pondérant les PV et le chakra restants. Il faut un **écart net** entre les deux scores pour qu'un vainqueur soit désigné ; sinon, **match nul**.

La **possession** (temps d'initiative) sert à la narration et au débrief — elle **ne détermine pas** le vainqueur.

### Conséquences (à H72)

| Résultat | Points ligue | Prime Ryos (base) | Butin bonus |
|----------|--------------|-------------------|-------------|
| Victoire | 3 | 1 600 | Ryos supplémentaires + objet aléatoire + chance de carte |
| Nul | 1 chacun | 800 | Idem (probabilités réduites) |
| Défaite | 0 | 100 (consolation) | Idem (probabilités réduites) |

---

## 14. Écrans du jeu

| Écran | Rôle |
|-------|------|
| **Bureau** | Hub : budget, examens, Vol d'Oiseau, hôpital, Académie, Sceau de Chakra |
| **Escouade** | Composition, consignes, dossier d'opération (postures), échanges actif/banc |
| **Entraînement** | Focus par stat, prévision de coût |
| **Missions** | Missions idle |
| **Ligue** | Classement, calendrier, espionnage, mission de reconnaissance |
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
| 2026-07-10 | Consignes renommées (Défensive / Protection), guide postures & cartes tactiques ; retrait du cercle Assaut/Mur/Flux |
