# 📜 Milestone 1 : Spécifications des Ninjas et des Compétences

Ce document définit la structure de données, la logique des caractéristiques, l'utilité exacte des compétences et l'impact des traits de caractère pour la V1 de **Kagekuni**.

---

## 🧬 1. Anatomie d'un Ninja (Données BDD)

Chaque ninja généré procéduralement par le serveur doit posséder les champs suivants en base de données :

### A. Profil & Économie
*   `id` : Clé primaire unique.
*   `name` : Chaîne de caractères (Nom généré de style asiatique/ninja).
*   `age` : Entier. Démarre strictement à 15 ans.
*   `grade` : Énumération (`Genin`, `Chunin`, `Jonin`).
*   `clan_trait_id` : Clé étrangère vers les modificateurs génétiques (ex: *Benigiri*, *Shizumori*).
*   `element_affinity` : Énumération (`Katon`, `Suiton`, `Raiton`, `Doton`, `Futon`).
*   `character_trait` : Énumération (`Egoiste`, `Altruiste`, `Faineant`, `Temeraire`, `Discipline`). *Détermine les comportements bonus/malus en match et en gestion.*
*   `salary_cost` : Entier. Calculé dynamiquement selon son grade et le niveau de ses compétences.
*   `language` : Énumération (fr, en). Définit la langue utilisée pour l'interface et la génération de la chronique textuelle des matchs.

### B. Les Caractéristiques Majeures (Notes de 1 à 20)
*   `taijutsu` : Force physique et combat au corps-à-corps.
*   `ninjutsu` : Puissance des techniques élémentaires magiques.
*   `genjutsu` : Maîtrise des illusions et altérations d'état.
*   `medecine` : Maîtrise des soins, de la régénération et du support vital.
*   `vitesse` : Capacité de mouvement (Détermine l'Initiative de l'escouade).
*   `intelligence` : QI Tactique (Détermine la pertinence des choix d'action).

### C. Les Jauges Dynamiques
*   `weekly_forme` : Énumération (Lamentable, Passable, Excellent, Divin). Applique un modificateur global sur toutes les stats pour le match.
*   `moral` : Note de 1 à 20 influencée par la vie de l'escouade.
*   `current_pv_match` : PV pour la simulation (Formule : `Taijutsu * 10` + `Bonus Équipement`).
*   `current_chakra_match` : Réserve d'énergie pour la simulation.

---

## 🎭 2. Système de Caractère (Traits de Personnalité)

À la création, un ninja reçoit l'un de ces 5 traits. Ils dictent des comportements uniques qui modifient le déroulement des événements.

| Trait | Bonus de Caractère | Malus de Caractère |
| :--- | :--- | :--- |
| **L'Égoïste** | **Fierté solitaire :** Si ses deux coéquipiers ont moins de PV que lui, il gagne `+2` en Taijutsu/Ninjutsu pour briller. | **Insoumis :** Ignore totalement les consignes du joueur de type "Protéger un allié" (ne sera jamais un Tank). |
| **L'Altruiste** | **Garde du corps :** Si un allié subit un coup fatal et que le Sensei n'a plus de Chakra, il a 50% de chances d'encaisser le coup à sa place. | **Sensible :** En cas de défaite lors d'un cycle, sa jauge de Moral baisse deux fois plus vite que les autres. |
| **Le Fainéant** | **Détachement olympien :** Son esprit est si calme qu'il est totalement immunisé contre le premier Genjutsu reçu du match. | **Poil dans la main :** Lors de l'entraînement, il a 15% de chances de sécher la session (0 progression sur le cycle). |
| **Le Téméraire** | **Charge héroïque :** Au tout premier tour du match, il s'élance et gagne un bonus massif de `+4` en Vitesse. | **Consommation brute :** Canalise mal son énergie et consomme 20% de Chakra en plus sur toutes ses techniques. |
| **Le Discipliné** *(Neutre)* | **Fiabilité totale :** Il suit les consignes stratégiques et individuelles à la lettre sans jamais dévier. | **Aucun effet spécial :** Ne possède aucun bonus imprévisible en combat ou en entraînement. |

---

## ⚔️ 3. Équilibrage des Compétences : Attaque vs Défense

| Compétence | Rôle en Attaque (Initiative gagnée) | Rôle en Défense (Ciblé par l'adversaire) |
| :--- | :--- | :--- |
| **Taijutsu** | **L'Asphyxie :** Inflige des dégâts physiques modérés sur les PV et draine le Chakra adverse via le harcèlement au corps-à-corps. | **La Garde :** Réduit les dégâts physiques reçus de manière fixe selon son score de force. |
| **Ninjutsu** | **La Destruction :** Cause d'immenses dégâts sur les PV, amplifiés par le triangle des affinités élémentaires. | **Le Mur Élémentaire :** Contre l'attaque adverse mais consomme du Chakra au défenseur. |
| **Genjutsu** | **Le Piège Mental :** Applique un malus d'état à la cible : *Paralysie* (Vitesse à 0) ou *Confusion* (attaque son camp). | **L'Esquive :** Technique de permutation. Si la défense réussit, l'action adverse est totalement annulée. |
| **Médecine** | **Le Flux Vital :** Soigne les PV d'un allié blessé sur le terrain ou lui restaure une partie de son Chakra. | **L'Anesthésie :** Réduit de moitié la durée des malus d'état reçus et dissipe les poisons/brûlures. |

---

## 🧠 4. L'Utilité des Statistiques de Support

*   **Vitesse :** Somme des vitesses de l'équipe de champ. Détermine le pourcentage de chances d'obtenir l'initiative sur chaque tour.
*   **Intelligence (QI) :** 
    *   *En Attaque :* Oriente le choix du ninja vers la statistique de combat où la cible adverse possède la note la plus basse.
    *   *En Défense :* Permet au Jonin-Sensei de valider son jet d'interception (Substitution) pour sauver un élève.

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

1. Crée le script de migration SQL (MySQL) générant les tables requises pour stocker ces profils de Ninjas avec les structures d'énumérations définies.
2. Développe les modèles Backend (Node.js) associés avec contrôle et validation des plages de données (caractéristiques de 1 à 20).
3. Rédige un script de Seeding capable de générer 10 ninjas de test respectant de manière équitable la répartition des 5 traits de caractère et des différentes compétences.
