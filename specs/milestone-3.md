# 🕒 Milestone 3 : Le Moteur d'Horloge Asynchrone (Cycle de 72h)

Ce document spécifie la gestion du temps partagé (cycles de 72h), les scripts automatisés de fin de cycle (Cron Jobs), et l'algorithme des Épreuves de Promotion de milieu de cycle.

---

## 📅 1. Le Rythme du Serveur (Horloge Synchrone)

Le jeu fonctionne sur un rythme global fixe de 72 heures réelles pour simuler une "Semaine Ninja". Tous les joueurs du serveur vivent les mêmes échéances au même moment :
* **Heure 0 :** Début du cycle (Rapport du match précédent disponible, Marché Noir réapprovisionné, entraînement actif, tactiques modifiables).
* **Heure 36 (Milieu de cycle) :** Calcul automatique des Épreuves de Promotion (Examens Chunin) et génération des Rapports d'Espionnage pour le prochain match.
* **Heure 71 (Début de l'Opération live) :** Gel des tactiques. Simulation intégrale de l'Opération de Frontière (Milestone 5). Génération de la chronique narrative et début de sa révélation progressive (Milestone 6). Les deux joueurs d'un duel découvrent l'histoire au même rythme.
* **Heure 71 → 72 (Heure live) :** Révélation irrégulière des segments narratifs sur la vue `/operation`. Les résultats mécaniques ne sont **pas encore appliqués**.
* **Heure 72 (Fin de cycle) :** Application des résultats (points ligue, forme, salaires, Vol d'Oiseau, entraînement), puis réinitialisation de l'horloge pour le cycle suivant.

---

## 📡 1bis. L'Heure Live de l'Opération (H71 → H72)

La dernière heure du cycle est dédiée au **spectacle narratif** de l'Opération de Frontière :

| Instant | Action serveur |
| :--- | :--- |
| **H71:00** | Gel des tactiques. Simulation complète de tous les matchs de la pool. Génération du script de révélation (segments + timeline aléatoire). |
| **H71 → H72** | Les clients ne reçoivent que les segments narratifs dont l'heure de déverrouillage est passée (voir Milestone 6). |
| **H72:00** | Application en batch : entraînement, économie, ligue, Vol d'Oiseau, débriefing pédagogique, nouveau cycle (H0). |

**Règles importantes :**
* Le joueur peut modifier sa composition et ses consignes jusqu'à **H71:00** exclusivement.
* Le résultat du match est **pré-calculé à H71** mais **appliqué à H72** (sauf affichage narratif du dénouement avant H72 via la chronique).
* Un joueur absent pendant l'heure live retrouve, à la reconnexion, tous les segments déjà débloqués selon l'horloge serveur.

---

## 🤖 2. Résistance à l'Absence (Le Pilote Automatique)

Pour ne pas pénaliser un joueur occupé IRL, le serveur applique la logique de **continuité des ordres** lors du basculement d'un cycle à un autre :

* **Reconduction de la Tactique :** Si aucune modification n'a été enregistrée par le joueur durant les 72h, le moteur de match réutilise la même composition d'équipe, la même stratégie globale et les mêmes consignes individuelles que le cycle passé.
* **Reconduction de l'Entraînement :** Le focus d'entraînement choisi (ex: *Ninjutsu*) reste actif de cycle en cycle tant que le joueur ne le change pas manuellement. Les ninjas continuent de progresser en tâche de fond.

---

## 🏋️ 3. Algorithme du Rapport d'Entraînement

À la fin de chaque cycle (Heure 72), le script calcule les gains de statistiques pour tous les ninjas actifs.

### A. La Formule de Progression
La progression n'est pas linéaire. Un jeune ninja progresse vite, mais un ninja proche de son plein potentiel stagne.
$$\text{Gain} = \text{Gain de Base} \times \text{Coeff Âge} \times \text{Modificateur Caractère}$$

* `Gain de Base` : Fixé à `+0.2` dans la statistique sélectionnée pour le cycle (focus d'entraînement du dojo).
* `Coeff Âge` : `1.5` à 15 ans, `1.0` à 16 ans, `0.7` à 17 ans, `0.4` à 18 ans. (Pousse au renouvellement).
* ~~`Bonus Sensei` (+15 % spécialité)~~ **Supprimé** — le Jonin n'a plus de spécialité fixe ; seul le **focus d'entraînement** (choix de cycle) oriente la progression.

### B. L'Impact du Caractère (Le Fainéant)
Avant d'enregistrer le gain, le script fait un test sur le trait `character_trait` du ninja :
* Si le ninja est **Fainéant**, le script lance un dé de 1 à 100. S'il fait moins de 15 (15% de chances), le ninja sèche l'entraînement. Le gain pour ce cycle est égal à `0`. Un texte spécifique est loggé : *"Sora Nara a préféré dormir sous un arbre plutôt que de s'entraîner."*

---

## 📝 4. Les Épreuves de Promotion (Mid-Week)

À l'Heure 36, le serveur traite les demandes d'Examens de passage du grade de Genin à Chunin.

* **Inscription :** Le joueur coche manuellement une case sur la fiche de son Genin s'il souhaite le présenter à l'examen (coûte une petite somme en Ryos).
* **Vérification des Prérequis (Pas de RNG) :** Pour réussir l'examen, le Genin doit réunir strictement ces deux conditions :
    1.  Avoir au moins une caractéristique de combat (`taijutsu`, `ninjutsu`, `genjutsu` ou `medecine`) $\ge 10$.
    2.  Avoir une note d' `intelligence` (QI tactique) $\ge 8$.
* **Résultat de la Promotion :**
    * **En cas de Succès :** Le statut passe de `Genin` à `Chunin`. Sa jauge de maximum de Chakra augmente. Son coût salarial augmente instantanément.
    * **En cas d'Échec :** Le ninja reste Genin. Son `moral` chute de 5 points à cause de la honte de l'échec.

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

* [x] Implémente un système de gestion du temps côté Backend (ex: tâches planifiées via des *Cron Jobs* ou la bibliothèque `node-schedule`).
* [x] Expose la position actuelle dans le cycle (H0–H72) via l'API pour le Front-End (Bureau, vue Opération).
* [x] Implémente le job **H71** : gel des tactiques, lancement de la simulation des matchs et de la génération chronique (coordination avec Milestones 5 et 6).
* [x] Rédige le script de fin de cycle (**H72**) qui applique la formule mathématique d'entraînement à l'ensemble des ninjas de la BDD.
* [x] Intègre la condition aléatoire du trait "Fainéant" lors du calcul des gains d'entraînement.
* [x] Code la fonction de milieu de cycle (Heure 36) qui traite les promotions de grade selon les paliers de statistiques (Combat $\ge 10$ et QI $\ge 8$) et applique les conséquences sur le salaire ou le moral.
