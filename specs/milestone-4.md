# 💰 Milestone 4 : Économie Asynchrone (Missions Idle & Marché Noir)

Ce document spécifie le système de génération de Ryos via les missions de fond, la structure du catalogue du Marché Noir par cycle, et la mécanique d'équipement des ninjas.

---

## 📅 1. Le Rythme Économique par Cycle

Toutes les actions financières et logistiques s'alignent sur le cycle commun de 72 heures :
* **Heure 0 (Ouverture du Cycle) :** Le Marché Noir génère un catalogue d'objets unique pour le joueur. Les missions terminées du cycle précédent attendent d'être collectées.
* **Pendant le Cycle :** Le joueur envoie ses ninjas inactifs (les remplaçants) en mission. Il achète et équipe ses objets.
* **Heure 72 (Fin de Cycle) :** Le salaire de l'escouade active est automatiquement prélevé du solde de Ryos du joueur. Le catalogue du Marché Noir non acheté expire.

---

## 🗺️ 2. Les Missions de Routine (Système Idle)

Les joueurs possèdent souvent plus de 3 ninjas dans leur effectif (les remplaçants). Pour éviter qu'ils ne servent à rien, le bureau propose des contrats de missions.

### A. Fonctionnement de l'envoi en mission
* Le joueur sélectionne un ninja *qui ne fait pas partie de l'escouade active de combat*.
* Il l'assigne à un contrat de mission disponible (Rang D, C ou B) depuis l'interface Vue 3.
* Le ninja est verrouillé ("En mission") jusqu'à la fin du cycle de 72h. Il ne peut pas être équipé ni transféré dans l'escouade de combat durant cette période.

### B. Les Rangs de Mission & Exigences
Pour réussir une mission et ramener le magot de Ryos à l'Heure 72, le ninja doit passer un test de statistiques fixes (sans RNG) calculé par le serveur :

| Rang | Coût d'envoi | Statistique Requise | Gain à la fin du cycle |
| :--- | :--- | :--- | :--- |
| **Rang D** | 0 Ryos | Aucune (Ouvert à tous) | `+500 Ryos` |
| **Rang C** | 100 Ryos | `intelligence` $\ge 8$ OR `vitesse` $\ge 8$ | `+1 200 Ryos` |
| **Rang B** | 300 Ryos | Une stat de combat (`taijutsu`, etc.) $\ge 12$ | `+2 800 Ryos` |

*Note sur l'absence :* Si le joueur ne se connecte pas à la fin des 72h, le ninja reste "En attente de débriefing". Les Ryos sont sécurisés et le joueur les touchera lors de sa prochaine connexion.

---

## 🥷 3. Le Marché Noir de Cycle

Le Marché Noir vend des **utilitaires** — pas de bonus de stats permanents en combat. La valeur principale des Ryos reste la **gestion du club** (dispensaire, salaires, examens, dojo). Voir le catalogue détaillé : [`m4-utility-items-catalog.md`](./m4-utility-items-catalog.md).

### A. Génération du Catalogue (Heure 0)
Au début de chaque cycle, le serveur génère procéduralement **3 objets aléatoires** disponibles à l'achat pour le joueur. Ce catalogue est unique et expire après 72h.

### B. Types d'Objets (pivot utilitaire)
Les objets se divisent en **trois catégories** — aucune arme ni armure :

1.  **Bureau (`bureau`) :** Consommables utilisés depuis l'inventaire (ex: *Pilule de récupération* remonte la Forme d'un palier ; *Livre de stratégie* booste le prochain entraînement).
2.  **Match (`match`) :** Consommable équipé sur un ninja actif, **1 usage / match** — mécaniques de rupture (ex: *Fumigène de secours* réduit de 50 % un coup fatal ; *Parchemin de rupture* contre Genjutsu).
3.  **Cycle (`cycle`) :** Investissement sur 72 h (ex: *Poids d'entraînement* : −2 Vitesse en match, +20 % gains d'entraînement à la fin du cycle).

---

## 🎒 4. Gestion des Objets dans la BDD

Chaque ninja dispose au maximum de **1 emplacement match** (consommable de combat) **ou** **1 emplacement cycle** (investissement hors match). Les objets bureau ne s'équipent pas : ils se consomment depuis le Bureau.

### Les Règles d'impact financier (Les Salaires)
À l'Heure 72, le script de maintenance de l'économie calcule le coût de l'escouade :
$$\text{Dépense Totale} = \sum (\text{salary\_cost de chaque ninja de l'escouade active})$$
Si le solde de Ryos du joueur tombe en négatif à cause des salaires, l'équipe subit un malus général de **-20% de Moral** au cycle suivant pour simuler la grogne des troupes mal payées.

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

* [ ] Crée les tables de base de données pour les objets (`Item`) et la table d'association avec les ninjas (`Ninja_Items`).
* [ ] Développe le script de génération du Marché Noir (Cron à l'Heure 0) capable de créer un catalogue de 3 objets aléatoires par utilisateur.
* [ ] Code la logique de vérification et de verrouillage des "Missions Idle" (Vérifier les prérequis de stats à l'envoi, bloquer le ninja, attribuer les Ryos à la fin).
* [ ] Implémente le script de prélèvement automatique des salaires à la fin du cycle de 72h, incluant la gestion du cas de faillite (malus de moral).
