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

Le Marché Noir est l'unique moyen de dépenser ses Ryos pour optimiser les statistiques de ses ninjas grâce à de l'équipement.

### A. Génération du Catalogue (Heure 0)
Au début de chaque cycle, le serveur génère procéduralement **3 objets aléatoires** disponibles à l'achat pour le joueur. Ce catalogue est unique et expire après 72h.

### B. Types d'Objets et Modificateurs
Les objets se divisent en trois catégories et modifient directement les variables de la Milestone 1 :

1.  **Les Armes (Focus Attaque) :** Ajoutent un bonus fixe lors des phases offensives (ex: *Lame de Chakra* : `+2 Ninjutsu` en attaque).
2.  **Les Armures / Gilets (Focus Défense) :** Ajoutent des PV de match ou de la défense fixe (ex: *Gilet Tactique en Mailles* : `+30 PV de match`, `+1 Taijutsu` en défense).
3.  **Les Consommables (Focus Survie) :** Objets à usage unique qui s'activent automatiquement dans le simulateur de match sous conditions (ex: *Pilule du Soldat* : Restaure 20 points de Chakra si la jauge tombe sous les 15% en plein match).

---

## 🎒 4. Gestion des Équipements dans la BDD

Chaque ninja dispose de **2 emplacements d'équipement maximaux** : 1 emplacement d'arme/armure permanent, et 1 emplacement de consommable à usage unique.

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
