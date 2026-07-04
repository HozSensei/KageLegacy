# 🏆 Milestone 8 : Système de Ligues, Classement & Scoutisme

Ce document spécifie la structure compétitive par Pools de 6 joueurs, les règles de calcul des points de championnat, le système d'espionnage asynchrone et les scripts de transition de saison.

---

## 🗺️ 1. Les Pools de Frontière (Structure des Ligues)

Pour maximiser l'esprit communautaire et la rivalité, les joueurs ne sont pas noyés dans une seule liste globale. Ils sont répartis dans des micro-ligues fermées appelées **Pools**.

### A. Caractéristiques d'une Pool
* **Taille :** Chaque Pool est composée de strictement **6 escouades**.
* **Hiérarchie :** Le système est pyramidal (Division I = Élite, Division II = 2 Pools, Division III = 4 Pools, Division IV = 8 Pools, etc.).
* **Lore :** Lors du matchmaking de début de saison, le serveur essaie de répartir les joueurs afin que chaque Pool contienne des représentants de villages cachés différents (Brume, Cendres, Falaise...) pour simuler un conflit géopolitique.

### B. Le Calendrier d'une Saison
Une saison dure exactement **10 cycles** (soit 10 matchs réels d'Opérations de Frontière sur environ 1 mois).
* Le serveur génère dès l'Heure 0 de la saison un calendrier complet en format "Aller-Retour" où chaque joueur affronte les 5 autres membres de sa Pool.

---

## 🧮 2. Le Classement de Ligue et le Tableau de Renommée

Le jeu gère deux types de classements en parallèle dans la base de données.

### A. Le Classement Interne de la Pool (La Compétition Directe)
À la fin de chaque match de cycle (Heure 72), la table `Classement_Pool` est mise à jour selon le barème classique :
* 🟢 **Victoire (par K.O. ou aux Points) :** 3 Points
* 🟡 **Match Nul (Égalité parfaite de score) :** 1 Point
* 🔴 **Défaite (Retraite forcée ou moins de PV) :** 0 Point

*Critères de départage en cas d'égalité de points :* 1) Nombre de victoires par K.O., 2) Ratio de PV/Chakra restants en fin de match.

### B. Le Tableau de Renommée (Classement Mondial)
C'est la page des scores du serveur entier. Elle classe les joueurs selon un ordre de priorité strict :
1. **Priorité 1 :** Le niveau de la Division actuelle du joueur (un joueur en Division I sera toujours mieux classé qu'un joueur en Division II).
2. **Priorité 2 :** Les `reputation_points` historiques accumulés grâce au **"Vol d'Oiseau"** (Milestone 7).

---

## 🦅 3. Le Système de Scoutisme (Rapport d'Espionnage)

À l'Heure 36 (Milieu de cycle), le serveur met à jour le calendrier et débloque le **Rapport d'Espionnage** du prochain adversaire sur l'interface Vue 3 pour permettre la préparation tactique.

### L'API de Scoutisme renvoie les données suivantes (Sans dévoiler les stats exactes) :
* **Historique de Forme :** Les scores et types de victoires (KO ou Points) des 3 derniers matchs de l'adversaire.
* **Le Profil du Mentor :** La spécialité d'entraînement du Jonin-Sensei adverse.
* **L'Analyse des Renseignements :** Une moyenne textuelle des statistiques de son escouade calculée sur son dernier match :
  * *Tendance Offensive :* Identifie sa stat d'attaque la plus utilisée (ex: *"Forte tendance au Ninjutsu"*).
  * *Tendance Défensive :* Identifie si l'équipe utilise un profil Tank (ex: *"Présence d'une garde physique lourde"*).
  * *Vitesse Globale :* Donne une estimation de son initiative (ex: *"Escouade très rapide"* ou *"Escouade lourde et lente"*).

---

## 🔄 4. Script de Fin de Saison (Promotions & Relégations)

Au terme du 10ème match de la saison, le serveur exécute le script de transition :

* 🚀 **Le Champion :** Le 1er de la Pool obtient son ticket pour la division supérieure (`division_level - 1`). Il sera injecté dans une Pool du niveau du dessus à la saison suivante.
* 📉 **Le Relégué :** Le 6ème (dernier) de la Pool descend automatiquement en division inférieure (`division_level + 1`).
* **Le Reset de Saison :** Les points de la table `Classement_Pool` sont remis à 0, les équipes migrées sont réparties, et un nouveau calendrier de 10 matchs est généré.

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

* [ ] Crée les structures de tables SQL pour `Pool`, `Match_Calendrier` et `Classement_Pool`.
* [ ] Code le script d'initialisation de saison (Algorithme de Round-Robin) pour générer les 10 matchs aller-retour fermés pour 6 joueurs.
* [ ] Développe l'API Backend de Scoutisme qui analyse les logs de match précédents d'un joueur pour en extraire des tendances moyennes (Ninjutsu, Vitesse, Tank).
* [ ] Implémente le script de fin de saison (à exécuter au cycle 10) gérant la logique de montée et descente de division des joueurs et le nettoyage des tables de classement.
