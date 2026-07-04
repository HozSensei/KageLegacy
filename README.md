# 🦅 Kage Legacy : Le Manager d'Escouade Shinobi

**Kage Legacy** est un jeu de gestion et de stratégie asynchrone par navigateur développé en *Vibe Coding*. Inspiré des mécaniques légendaires de *Hattrick*, le jeu plonge le joueur dans un univers de dark fantasy asiatique où la tactique, la formation et la gestion humaine l'emportent sur la puissance brute.

---

## 📜 Le Concept

Dans **Kage Legacy**, vous n'êtes pas un manager invisible : vous incarnez un **Jonin-Sensei**, un avatar permanent et le mentor de votre propre escouade.

### 🔄 La Boucle de Jeu (Cycle de 72h)
Le temps du jeu est calqué sur un rythme asynchrone commun à tous les joueurs. Chaque "Semaine Ninja" dure 72 heures réelles :
*   **L'Entraînement :** Progression automatique des statistiques selon le focus choisi (appliquée à H72).
*   **Les Épreuves (Mid-week) :** Passage automatique des examens de grade à l'Heure 36 pour les Genins qualifiés.
*   **L'Opération de Frontière (H71 → H72) :** À H71, simulation complète du combat. Puis, pendant la dernière heure du cycle, révélation progressive d'une **chronique shinobi** romancée sur la vue `/operation` — sans horodatage visible, comme un chapitre de manga. Les deux adversaires découvrent l'histoire au même rythme. Les résultats mécaniques sont appliqués à H72.

### 🦅 Le Vol d'Oiseau (Cycle de vie)
Vous recrutez des **Genins anonymes de 15 ans** générés procéduralement (Clans *Uchiwa*, *Nara*...). Dès qu'un élève atteint le rang d'élite (**Jonin**), il quitte définitivement l'escouade. Vous touchez une prime en Ryos et de la Réputation pour classer votre Dojo, puis vous recrutez un nouvel aspirant. *Aucun héros unique (pas de Naruto/Sasuke jouables) pour garantir l'équilibre.*

---

## 🛠️ Architecture Technique

*   **Back-End :** Node.js / Express
*   **Front-End :** Vue 3 (Composition API) / Tailwind CSS (Interface sombre typée "Tableau de bord")
*   **Base de Données :** MySQL
*   **Moteur de Match :** Simulateur découpé en 12 tours (calcul à H71) gérant l'Initiative proportionnelle, la fatigue (Chakra), les traits de caractère et les interventions du Sensei. La chronique littéraire est révélée progressivement entre H71 et H72.

---

## 🗺️ Plan de Route & Index des Spécifications

Les détails techniques complets et les instructions de développement sont segmentés dans le dossier `/specs`.

*   📂 [**Milestone 1 : Structure des Ninjas**](specs/milestone-1.md) — Définition des caractéristiques (1-20), des 5 traits de caractère (Égoïste, Fainéant, Discipliné...) et de la spécialisation Médecine.
*   📂 [**Milestone 2 : Bureau du Sensei**](specs/milestone-2.md) — Architecture des composants Vue 3, gestion d'état Pinia et algorithme du script de peuplement (Seeding) de test.
*   📂 [**Milestone 3 : Horloge & Entraînement**](specs/milestone-3.md) — Gestion du temps partagé (Cron Jobs), jalons H36/H71/H72, formules d'apprentissage non-linéaires et règles des examens Chunin.
*   📂 [**Milestone 4 : Économie & Marché Noir**](specs/milestone-4.md) — Système de missions Idle pour les remplaçants, catalogue rotatif d'équipements et prélèvement des salaires.
*   📂 [**Milestone 5 : Moteur de Combat**](specs/milestone-5.md) — Algorithme complet de simulation des duels (Initiative RNG Juste, Provocation du Tank, Substitutions et K.O.), exécuté à H71.
*   📂 [**Milestone 6 : Moteur de Chronique**](specs/milestone-6.md) — Chronique shinobi en paragraphes narratifs, révélation live H71→H72 et débriefing pédagogique post-match.
*   📂 [**Milestone 7 : Le Vol d'Oiseau**](specs/milestone-7.md) — Script de diplomation des Jonins, calcul des gains de Prestige et injection automatique de la relève de 15 ans.
*   📂 [**Milestone 8 : Ligues & Matchmaking**](specs/milestone-8.md) — Pools compétitives de 6 joueurs, gestion du démarrage à froid (Cold Start) via des Bots remplaçables, et invitations d'amis directes.

---

## 🚀 Installation & Développement

```bash
# Cloner le projet
git clone [https://github.com/](https://github.com/)[ton-username]/kage-legacy.git

# Installer les dépendances (À exécuter dans les dossiers correspondants)
npm install
