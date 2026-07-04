# 🖥️ Milestone 2 : L'Interface "Bureau du Sensei" et Données de Test

Ce document spécifie l'architecture des composants Vue 3 / Tailwind CSS pour le tableau de bord principal du joueur, ainsi que la logique du script de peuplement (Seeding) pour le développement.

---

## 🎨 1. Philosophie UX & Charte Graphique

L'interface doit s'éloigner des jeux de gestion sportive classiques et adopter un style **"Tableau de bord militaire / Dark Fantasy"**. 
*   **Palette de couleurs :** Fonds sombres (`bg-slate-900`, `bg-zinc-950`), textes clairs et contrastés (`text-slate-100`), et bordures fines (`border-slate-800`).
*   **Accents :** Utilisation de couleurs spécifiques pour les éléments (ex: Rouge Feu pour le Katon, Vert Médical pour la Médecine) afin de faciliter la lecture rapide.

---

## 🏗️ 2. Architecture des Composants Vue 3

L'écran principal est découpé en composants autonomes et réutilisables dans le dossier `src/components/` :

### A. `BureauView.vue` (Page Principale / Container)
*   **Rôle :** Coordonne l'affichage. Elle appelle le Store (Pinia) pour récupérer les données du joueur et de son escouade.
*   **Layout :** Grid Tailwind asymétrique. 
    *   À gauche (1/4 de l'écran) : Le profil du Sensei.
    *   À droite (3/4 de l'écran) : L'affichage de la composition active (les 3 ninjas).

### B. `SenseiCard.vue` (Le Profil du Joueur)
*   **Données affichées :** Nom du Jonin-Sensei, sa spécialité d'entraînement (ex: `+15% progression Genjutsu`), son solde de **Ryos**, ses points de **Réputation** globaux, et sa jauge de **Chakra de Match** (utilisée pour les interceptions).
*   **Style :** Un encadré premium qui pose l'identité du joueur en tant que chef d'escouade.

### C. `NinjaCard.vue` (Composant Réutilisable pour l'Escouade)
C'est le composant le plus crucial du Front-End. Il doit afficher de manière dense mais ultra-lisible :
1.  **En-tête :** Nom du ninja, son Âge (15-18 ans), son Grade (badge de couleur : Vert pour Genin, Bleu pour Chunin) et son Affinité Élémentaire sous forme d'icône ou de texte coloré.
2.  **Le Trait de Caractère :** Affichage du trait (`Égoïste`, `Altruiste`, etc.) avec une icône d'avertissement et une **Infobulle (Tooltip) Tailwind** au survol expliquant son bonus et son malus en combat.
3.  **Les Jauges d'État :** 
    *   Une barre de **Forme** (couleur variant du rouge au vert selon l'état).
    *   Une barre de **Moral**.
    *   Une jauge de progression vers le grade supérieur (Visualisation du **"Vol d'Oiseau"** : plus la jauge est proche de 100%, plus le ninja est près de passer Jonin et de quitter le nid).
4.  **Le Bloc de Statistiques (Les 6 compétences) :**
    *   Affichage sous forme de grille ou de barres horizontales compactes : `Taijutsu`, `Ninjutsu`, `Genjutsu`, `Médecine`, `Vitesse`, `Intelligence`.
    *   Surlignage visuel (ex: texte en vert ou petite étoile) si une statistique bénéficie d'un bonus lié au **Clan** du ninja.

---

## 📦 3. Gestion de l'État (State Management)

Création d'un store Pinia `src/stores/squad.js` pour centraliser les données réactives.

```javascript
// Structure cible du store pour le Front-End
export const useSquadStore = defineStore('squad', {
  state: () => ({
    is_bot: true,
    sensei: {
      name: 'Kakashi',
      specialty: 'Genjutsu',
      ryos: 15400,
      reputation: 120,
      chakraPool: 100
    },
    activeSquad: [
      { id: 1, name: 'Sora Nara', age: 15, grade: 'Genin', character_trait: 'Faineant', element_affinity: 'Doton', taijutsu: 4, ninjutsu: 5, genjutsu: 3, medecine: 2, vitesse: 3, intelligence: 12, weekly_forme: 'Excellent', moral: 15 },
      { id: 2, name: 'Rei Uchiwa', age: 16, grade: 'Chunin', character_trait: 'Egoiste', element_affinity: 'Katon', taijutsu: 6, ninjutsu: 11, genjutsu: 14, medecine: 1, vitesse: 9, intelligence: 10, weekly_forme: 'Passable', moral: 12 },
      { id: 3, name: 'Hyuga Haru', age: 15, grade: 'Genin', character_trait: 'Discipline', element_affinity: 'Suiton', taijutsu: 9, ninjutsu: 3, genjutsu: 2, medecine: 7, vitesse: 8, intelligence: 6, weekly_forme: 'Divin', moral: 18 }
    ]
  })
})

---

## 🗄️ 4. Spécifications du Script de Seeding (Données de Test)
Pour tester l'interface sans attendre d'avoir codé tout le système de recrutement, le développeur a besoin d'un script server/scripts/seedNinjas.js.
### Logique algorithmique du générateur procédural :
 * **Noms :** Pioche aléatoire dans un tableau de prénoms (Haru, Sora, Rei, Kenji...) et de noms de clans (Nara, Uchiwa, Hyuga, Sarutobi...).
 * **Distribution des Traits de Clan (Multiplicateurs) :**
   * Si le ninja appartient au clan **Nara** \rightarrow Intelligence de départ boostée (+4), Vitesse réduite (-2).
   * Si le ninja appartient au clan **Uchiwa** \rightarrow Genjutsu et Ninjutsu boostés (+3), mais son Moral de départ subit une plus grande variance aléatoire.
 * **Distribution des Compétences :** Attribution de points de base (entre 2 et 8 pour un Genin) répartis aléatoirement sur les 6 compétences pour créer des profils uniques (ex: un soigneur pur, un guerrier physique).
 * **Distribution des Caractères :** Attribution équitable d'un des 5 traits (Egoiste, Altruiste, Faineant, Temeraire, Discipline) avec une probabilité égale de 20% pour chacun.
## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)
 * [ ] Configure la structure des composants Vue 3 (BureauView, SenseiCard, NinjaCard) en utilisant la syntaxe <script setup>.
 * [ ] Intègre Tailwind CSS pour créer un rendu "Dashboard sombre de commandement" propre et responsive.
 * [ ] Ajoute les infobulles (tooltips) interactives en utilisant les classes utilitaires de Tailwind pour expliciter les traits de caractère au survol de la souris.
 * [ ] Rédige le script de Seeding Node.js pour injecter en base de données ou générer un fichier JSON de test d'une quinzaine de ninjas cohérents avec les règles des Clans et des Caractères.

---

## 🌐 5. Internationalisation (i18n)
*   **Outil :** Intégration de `vue-i18n` dans le projet Vue 3.
*   **Fichiers de traduction :** Création d'un dossier `src/locales/` contenant `fr.json` et `en.json`.
*   **Composant sélecteur :** Ajouter un bouton discret dans la `SenseiCard` ou la barre de navigation pour basculer la langue du site à la volée, mettant à jour le store Pinia et la préférence en base de données.
