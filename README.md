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

## 🗺️ Plan de Route (Milestones)

* [ ] **Milestone 1 :** Structure du projet & Modèles de données (Sensei, Ninja, Escouade).
* [ ] **Milestone 2 :** Interface Vue 3 du "Bureau du Sensei" & Script de seeding de ninjas de test.
* [ ] **Milestone 3 :** Système d'horloge (Cycle de 72h) & Moteur d'entraînement automatique.
* [ ] **Milestone 4 :** Économie (Missions Idle en tâche de fond & Catalogue du Marché Noir).
* [ ] **Milestone 5 :** Moteur de calcul des Opérations de Frontière (Duels, Tactiques, KO).
* [ ] **Milestone 6 :** Générateur de Chronique (Moteur de Live Text immersif).
* [ ] **Milestone 7 :** Système de promotion et script de départ des Jonins ("Vol d'Oiseau").

---

## 🚀 Installation & Développement

*(Section à compléter au fil du développement de la structure du projet)*

```bash
# Cloner le projet
git clone [https://github.com/](https://github.com/)[ton-username]/kage-legacy.git
