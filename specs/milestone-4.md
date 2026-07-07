# 💰 Milestone 4 : Économie Asynchrone (Missions Idle & Marché Noir)

Ce document spécifie le système de génération de Ryos via les missions de fond, la structure du catalogue du Marché Noir par cycle, et la mécanique d'équipement des ninjas.

---

## 📅 1. Le Rythme Économique par Cycle

Toutes les actions financières et logistiques s'alignent sur le cycle commun de 72 heures :
* **Heure 0 (Ouverture du Cycle) :** Le Marché Noir génère un catalogue d'objets unique pour le joueur. Les missions terminées du cycle précédent attendent d'être collectées.
* **Pendant le Cycle :** Le joueur envoie ses ninjas inactifs (les remplaçants) en mission. Il achète et équipe ses objets.
* **Heure 72 (Fin de Cycle) :** Le salaire de l'escouade active est automatiquement prélevé du solde de Ryos du joueur. Le catalogue du Marché Noir non acheté expire.

---

## 🗺️ 2. Les Missions Idle & Tables de Butin (Loot Tables)

Les joueurs peuvent lancer **jusqu'à 3 missions par cycle** — **une par palier de danger**. Les missions secondaires ne donnent **jamais** de statistiques garanties. Le serveur calcule le résultat au moment du traitement du cycle (**H72**) via un jet de dé en pourcentage.

### A. Fonctionnement de l'envoi
* Le joueur sélectionne un ninja *hors escouade active*.
* Il choisit un **palier** parmi les 3 disponibles (max 1 contrat par palier et par cycle).
* Le ninja est verrouillé jusqu'au retour à **H72**.

### B. Les 3 Paliers de Contrats

| Palier | Risque | Retour | Butin garanti | Loot bonus (tirage) |
| :--- | :--- | :--- | :--- | :--- |
| **Contrat de Routine** | 0 % | H72 | 300–500 Ryos | 10 % pansement de terrain |
| **Infiltration tactique** | 20 % blessure légère | H72 | 600–800 Ryos | 60 % rien · 30 % kit médical · 10 % fumigène |
| **Opération Cyclone** | 40 % blessure grave · 5 % mort | H72 | 1 000 Ryos | 50 % rien · 35 % 2× matériel médical · 12 % consommable · **3 % gros lot** |

### C. Calcul du Risque et du Loot
* **Prérequis insuffisants :** si les stats du ninja ne remplissent pas le palier, **+20 %** de blessure grave (Cyclone) et risque de mort clinique à **5 %**.
* **Jamais de +1.0 garanti** — le Parchemin de Jutsu interdit (+0,5 ou +1,0) ou l'Aspirant Prodige ne tombent que dans le **3 %** légendaire du Cyclone.
* **Exemple Opération Cyclone (jet pur) :**
    * `[01-50]` : Ryos de base uniquement.
    * `[51-85]` : Lot commun (2× matériel médical).
    * `[86-97]` : Lot rare (consommable tactique).
    * `[98-100]` : Lot légendaire (Parchemin de Jutsu **ou** recrutement Prodige).

*Note :* Les rapports attendent d'être collectés à la connexion. Une blessure grave bloque la forme à Lamentable pendant **2 cycles**.

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

* [x] Crée les tables de base de données pour les objets (`Item`) et la table d'association avec les ninjas (`Ninja_Items`).
* [x] Développe le script de génération du Marché Noir (Cron à l'Heure 0) capable de créer un catalogue de 3 objets aléatoires par utilisateur.
* [x] Code la logique de vérification et de verrouillage des "Missions Idle" (Vérifier les prérequis de stats à l'envoi, bloquer le ninja, attribuer les Ryos à la fin).
* [x] Implémente le script de prélèvement automatique des salaires à la fin du cycle de 72h, incluant la gestion du cas de faillite (malus de moral).
