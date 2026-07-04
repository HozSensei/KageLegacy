# 🦅 Kage Legacy : Le Manager d'Escouade Shinobi

**Kage Legacy** est un jeu de gestion et de stratégie asynchrone par navigateur développé en *Vibe Coding*. Inspiré des mécaniques légendaires de *Hattrick*, le jeu plonge le joueur dans un univers de dark fantasy asiatique où la tactique, la formation et la gestion humaine l'emportent sur la puissance brute.

---

## 📜 Le Concept

Dans **Kage Legacy**, vous n'êtes pas un manager invisible : vous incarnez un **Jonin-Sensei**, un avatar permanent et le mentor de votre propre escouade.

### 🔄 La Boucle de Jeu (Cycle de 72h)
Le temps du jeu est calqué sur un rythme asynchrone commun à tous les joueurs. Toutes les 72 heures, une "Semaine Ninja" se termine et l'escouade vit les événements suivants :
* **L'Entraînement :** Progression automatique des statistiques des ninjas selon le focus choisi.
* **Les Épreuves de Promotion (Mid-week) :** Passage automatique des examens pour les Genins qualifiés.
* **L'Opération de Frontière :** Le point culminant du cycle. Une simulation de combat textuelle (Live Text) automatique contre l'escouade d'un autre joueur pour le contrôle du territoire.

### 🦅 Le Vol d'Oiseau (Cycle de vie)
Vous recrutez des **Genins anonymes de 15 ans** générés procéduralement avec des caractéristiques et des traits de clans uniques (ex: *Uchiwa*, *Nara*). Vous les entraînez, les équipez via le Marché Noir, et les faites grimper les échelons. 
Dès qu'un de vos élèves atteint le rang d'élite (**Jonin**), il quitte définitivement l'escouade. Vous touchez une prime massive en Ryos et de la Réputation pour recruter la relève. *Aucun héros unique (pas de Naruto/Sasuke jouables) pour garantir un équilibre parfait.*

---

## 🛠️ Architecture & Spécifications Techniques

Le projet est propulsé par une architecture moderne, légère et robuste :

* **Back-End :** Node.js / Express
* **Front-End :** Vue 3 / Tailwind CSS (Interface réactive orientée "Tableau de bord de bureau")
* **Base de Données :** MySQL / [ORM au choix, ex: Prisma ou Sequelize]
* **Moteur de Match :** Simulateur découpé en tours (possessions) gérant l'Initiative proportionnelle (RNG juste via la Vitesse et le QI), la gestion du Chakra (Endurance), les PV de match, les techniques (Taijutsu, Ninjutsu, Genjutsu) et les interventions défensives du Jonin-Sensei.

---

## 🗺️ Plan de Route Détaillé (Spécifications Techniques)

### 🛑 Milestone 1 : Structure BDD & Modèles de Données
Mise en place de la base de données (MySQL) et des schémas d'entités requis pour l'escouade.
* **Modèle `User / Sensei` :** `id`, `username`, `password`, `ryos_balance`, `reputation_points`, `avatar_specialty` (ex: Genjutsu), `chakra_pool`.
* **Modèle `Ninja` (Générés procéduralement) :**
  * *Profil :* `id`, `name`, `age` (démarre à 15), `grade` (Genin, Chunin, Jonin), `clan_trait_id`, `element_affinity` (Katon, Suiton, Raiton, Doton, Futon), `salary_cost`.
  * *Combat (Notes de 1 à 20) :* `taijutsu`, `ninjutsu`, `genjutsu`.
  * *Support (Notes de 1 à 20) :* `vitesse` (Initiative), `intelligence` (QI tactique).
  * *Variables d'État (Match & Semaine) :* `current_pv`, `current_chakra`, `weekly_forme` (de Lamentable à Divin), `moral`.
* **Modèle `Escouade` :** Table d'association liant strictement `user_id` + `ninja_chunin_id` + `ninja_genin_1_id` + `ninja_genin_2_id`.

### 🖥️ Milestone 2 : L'Interface "Bureau du Sensei" (Vue 3 / Tailwind)
Création du tableau de bord principal du joueur.
* **Vue "Bureau" :** Interface centrale affichant le profil du Sensei et les cartes/tableaux des 3 ninjas actifs. Surlignage visuel des bonus liés aux Clans.
* **Script de Seeding :** Développer un script CLI/Backend capable de générer 10 à 15 ninjas procéduraux cohérents (stats adaptées à leur clan et affinité) pour peupler instantanément l'interface de test.

### 🕒 Milestone 3 : Le Moteur d'Horloge Asynchrone (Cycle de 72h)
Configuration de l'automatisation temporelle du serveur, résistante à l'absence des joueurs.
* **Cron Job d'Entraînement :** Script s'exécutant toutes les 72h. Applique une progression de micro-points (ex: +0.2) sur la statistique choisie par le joueur. Si le joueur est absent, le focus précédent est automatiquement reconduit.
* **Script d'Examen (Mid-Week) :** Simulation asynchrone vérifiant si un Genin inscrit réunit les prérequis (ex: une stat de combat à 10 + QI à 10) pour passer Chunin. En cas d'échec, malus temporaire de Moral/Forme.

### 💰 Milestone 4 : Économie Asynchrone (Missions & Marché Noir)
Système financier et d'équipement géré par cycle de 72h pour éviter la répétitivité quotidienne.
* **Missions Longues (Idle) :** Menu permettant d'envoyer les ninjas inactifs sur des contrats. Les Ryos s'accumulent en base de données et attendent la prochaine connexion du joueur pour être récoltés.
* **Ravitaillement du Marché Noir :** Génération automatique d'un catalogue d'objets (Kunais, Gilets tactiques, Pilules de Chakra) au début de chaque cycle de 72h. Les objets appliquent des modificateurs fixes (`+2 Taijutsu`) ou des effets passifs (ex: *Fumigène : permet de fuir un duel manqué*).

### ⚔️ Milestone 5 : Le Simulateur d'Opération de Frontière (Moteur de Match)
Développement de l'algorithme de combat par tours (10 à 15 possessions par match) basé sur la survie.
1. **Algorithme d'Initiative (RNG Juste) :** Calcul de la somme $[Vitesse + Intelligence]$ de l'escouade. Si l'équipe A possède 60% du total global, elle a 60% de chances de débloquer le jet de dé d'attaque à chaque tour (évite le déterminisme).
2. **Gestion des Tactiques & Consignes :** 
   * *Global :* Modificateurs d'équipe (ex: *Embuscade* donne +25% d'Initiative mais fatigue accrue).
   * *Individuel :* Rôles (ex: Le *Tank* augmente de 70% ses chances d'être la cible du duel pour protéger ses alliés).
3. **Résolution du Duel :** Confrontation pure entre l'Attaquant choisi et le Défenseur ciblé. Formule :
   $$\text{Score} = \text{Stat Combat} + \text{Bonus Objet} + \text{Modificateur Affinité/Terrain} + \text{Dé (RNG)}$$
4. **Interception du Sensei :** Si les PV d'un Genin tombent à un niveau critique, test d'intelligence sur le Jonin-Sensei. En cas de succès, le Sensei utilise son `chakra_pool` pour annuler les dégâts via une *Substitution*.
5. **Résolution du Match :** Un ninja tombe KO si ses PV de match ou son Chakra tombent à 0. Si les 3 ninjas de champ sont KO, le Sensei sonne la retraite (Défaite par KO). Sinon, victoire aux points de vie restants à la fin des tours. Les ninjas KO subissent un effondrement de leur `weekly_forme` pour le cycle suivant.

### 📝 Milestone 6 : Le Moteur de Chronique (Live Text)
Traduction des calculs bruts du moteur de match en récit immersif.
* **Dictionnaire d'Actions :** Création d'une structure de données associant des phrases de "lore" aux ID d'événements du moteur (ex: Succès Ninjutsu Katon vs Échec Défense Doton = *"Le bouclier de terre adverse est pulvérisé par les flammes..."*).
* **Débriefing du Sensei :** Génération d'un rapport analytique post-match pointant précisément la faille (ex: "Votre équipe a manqué d'Initiative, augmentez la Vitesse", "Votre Jonin a manqué de Chakra").

### 🦅 Milestone 7 : Le "Vol d'Oiseau" (Équilibrage à long terme)
Gestion de la fin de vie des ninjas pour assurer le roulement et éviter le Pay-to-Win.
* **Script de Diplôme :** Détection automatique lorsqu'un Chunin atteint les statistiques limites de l'élite. Il est promu Jonin et est définitivement retiré de l'escouade active.
* **Calcul des Gains :** Le joueur reçoit un montant massif de Ryos et de Réputation indexé sur les statistiques finales du ninja sortant.
* **Injection de la Relève :** Reset d'un slot d'escouade et proposition automatique d'un nouvel Aspirant de 15 ans à recruter.

### 🏆 Milestone 8 : Système de Ligues, Classement & Scoutisme
Mise en place de la structure compétitive (les Pools) et des fonctionnalités d'espionnage.

* **Modèles de Données (BDD) :**
  * **Modèle `Pool` :** `id`, `name` (ex: "Division IV - Pool B"), `division_level` (Int : 1 pour l'élite, 2, 3, 4...).
  * **Modèle `Match_Calendrier` :** `id`, `pool_id`, `cycle_number` (de 1 à 10), `home_team_id`, `away_team_id`, `status` (En attente / Terminé), `winner_id` (null si match nul), `victory_type` (KO ou PV).
  * **Modèle `Classement_Pool` :** Table de jointure calculant pour chaque cycle : `pool_id`, `user_id`, `points` (3 pour Victoire, 1 pour Nul, 0 pour Défaite), `victories_ko`, `pv_ratio`.
* **Générateur de Saison (Le Calendrier) :** 
  * [ ] Coder un script d'initialisation qui s'exécute en début de saison (tous les 10 cycles). Il répartit 6 joueurs par `Pool` (idéalement de villages différents) et génère automatiquement le calendrier des 10 matchs aller-retour.
* **Le "Tableau de Renommée" (Classement Général) :**
  * [ ] Créer une vue globale triant tous les joueurs du serveur selon deux priorités : d'abord leur `division_level` actuel, puis leurs `reputation_points` historiques accumulés grâce au "Vol d'Oiseau".
* **Le Système de Scoutisme (Espionnage) :**
  * [ ] Développer l'API de profil adverse : lorsqu'un joueur clique sur son prochain opposant, le backend renvoie l'historique de ses 3 derniers matchs et un résumé de ses statistiques globales moyennes lors du dernier cycle (ex: *"Tendance : Ninjutsu élevé, Vitesse moyenne"*).
* **Script de Fin de Saison (Promotions / Relégations) :**
  * [ ] Au cycle 10, le script fige le classement. Le 1er de la Pool voit son équipe affectée à une `Pool` de `division_level - 1`. Le dernier de la Pool descend à `division_level + 1`.
 
---

## 🚀 Installation & Développement

*(Section à compléter au fil du développement de la structure du projet)*

```bash
# Cloner le projet
git clone [https://github.com/](https://github.com/)[ton-username]/kage-legacy.git
