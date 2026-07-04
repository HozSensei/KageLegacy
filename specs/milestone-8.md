# 🏆 Milestone 8 : Système de Ligues, Gestion des Bots & Scoutisme

Ce document spécifie la structure compétitive par Pools de 6 joueurs, la logique de démarrage à froid via des équipes "Bots", le système d'invitation directe, et les scripts de transition de saison.

---

## 🗺️ 1. Les Pools de Frontière & Gestion du Démarrage (Cold Start)

Pour maximiser l'esprit communautaire et la rivalité, les joueurs sont répartis dans des micro-ligues fermées appelées **Pools** de strictement **6 escouades**.

### A. Règle d'Inscription et Pyramide des Ligues
* **Le Bas de l'Échelle :** Tout nouveau joueur humain commence obligatoirement dans la division la plus basse actuellement ouverte sur le serveur (ex: Division V). Personne ne démarre dans l'élite.
* **Le flag `is_bot` :** Les équipes Bots ont exactement la même structure en base de données qu'un joueur humain (un Sensei, 3 ninjas actifs), mais possèdent le champ `is_bot: true` dans la table `User`. Leurs statistiques sont fixes et n'évoluent pas (pas d'entraînement, pas d'achat au Marché Noir). Ils servent de paliers de référence.

### B. Algorithme d'Allocation à l'Inscription (`join_or_create_pool`)
Lorsqu'un utilisateur crée un compte sans lien d'invitation :
1. Le serveur scanne les Pools de la division la plus basse à la recherche d'une équipe ayant `is_bot: true`.
2. **Si un Bot est trouvé :** Le joueur humain "prend sa place". Le Bot est désactivé/supprimé, et l'humain hérite de son emplacement dans le calendrier de la saison en cours pour jouer les matchs restants.
3. **Si aucun Bot n'est disponible (Toutes les Pools existantes sont pleines d'humains) :** Le serveur génère automatiquement une nouvelle Pool. Il y injecte le nouveau joueur humain, et remplit instantanément les 5 slots restants avec 5 équipes de Bots procédurales.

---

## 👥 2. Le Système d'Invitation ("Kevin invite Patrick")

Pour permettre à des amis de s'affronter directement sans attendre les mécanismes de montée/descente de division, le jeu intègre un système d'injection ciblée via un paramètre `pool_id`.

* **Génération du lien :** Depuis son Bureau (Vue 3), un joueur peut générer un lien d'invitation unique contenant l'ID de sa Pool actuelle (ex: `kagelegacy.com/register?invitePoolId=42`).
* **Logique d'inscription ciblée :** Lorsque l'invité valide son inscription :
  * Le serveur vérifie la Pool demandée. **S'il reste au moins une équipe `is_bot: true` dans cette Pool spécifique**, le serveur supprime ce bot et injecte l'invité à sa place. Les deux amis sont désormais dans la même ligue.
  * **Si la Pool est déjà 100% humaine :** L'inscription bascule sur l'algorithme standard (`join_or_create_pool`). Un message s'affiche sur l'interface de l'invité : *« La ligue de votre ami est déjà complète ! Vous avez été placé dans la ligue active la plus proche. À vous de grimper pour le rejoindre ! »*

---

## 🧮 3. Le Classement de Ligue et le Tableau de Renommée

### A. Le Classement de la Pool
À la fin de chaque match de cycle (**H72**, après l'heure live narrative), la table `Classement_Pool` attribue les points :
* 🟢 **Victoire (par K.O. ou aux Points) :** 3 Points
* 🟡 **Match Nul :** 1 Point
* 🔴 **Défaite :** 0 Point

### B. Le Tableau de Renommée (Classement Global)
Classement mondial de tous les serveurs trié par : 1) `division_level` (Le niveau de division, la Division I étant le sommet), puis par 2) `reputation_points` historiques (accumulés via le "Vol d'Oiseau").

---

## 🦅 4. Le Système de Scoutisme (Rapport d'Espionnage)

À l'Heure 36 (Milieu de cycle), l'API de Scoutisme génère une analyse textuelle des tendances de l'adversaire (calculée sur ses 3 derniers matchs) :
* *Tendance Offensive :* (ex: *"Forte tendance au Ninjutsu"*).
* *Tendance Défensive :* (ex: *"Présence d'une garde physique lourde (Tank)"*).
* *Vitesse Globale :* (ex: *"Escouade très rapide"*).

---

## 🔄 5. Script de Fin de Saison (Promotions & Relégations)

Au terme du 10ème match (Cycle 10), le script fige le classement de la Pool :
* 🚀 **Le 1er (Champion) :** Est promu dans une Pool de la division supérieure (`division_level - 1`) pour la saison suivante.
* 📉 **Le 6ème (Dernier) :** Est relégué dans une Pool de la division inférieure (`division_level + 1`).
* **Cas des Bots :** Si un Bot finit 1er ou dernier, il migre comme un humain. Si une Pool entière ne contient plus que des Bots (aucun humain actif), elle est automatiquement archivée/supprimée par le serveur pour nettoyer la base de données.

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

* [ ] Crée les structures de tables SQL pour `Pool`, `Match_Calendrier` et `Classement_Pool` en incluant le flag boolean `is_bot`.
* [ ] Implémente l'algorithme de routage à l'inscription `join_or_create_pool` gérant le remplacement prioritaire des bots dans la division la plus basse.
* [ ] Code la route d'inscription par invitation gérant l'argument optionnel `invitePoolId` pour forcer l'éjection d'un bot dans une ligue précise.
* [ ] Rédige le script de fin de saison (Cycle 10) qui applique les montées/descentes et nettoie les Pools composées à 100% de bots inactifs.
