# ⚔️ Milestone 5 : Le Simulateur d'Opération de Frontière (Version Corrigée)

Ce document spécifie l'impact exact des variables (Intelligence, Forme, Caractères) à chaque étape de la simulation de combat par tours.

---

## ⏱️ Moment d'Exécution (H71 → H72)

La simulation mécanique s'exécute **intégralement à H71** (voir Milestone 3). Le moteur produit les logs JSON bruts et le résultat final ; il ne génère **aucun texte littéraire** (délégué au Moteur de Chronique, Milestone 6).

| Phase | Instant | Action |
| :--- | :--- | :--- |
| **Simulation** | H71:00 | Calcul des 12 tours max, stockage des logs, détermination de `ending_tour` et du vainqueur. |
| **Révélation narrative** | H71 → H72 | La chronique romancée se dévoile par segments (rythme irrégulier). Les deux joueurs lisent la même histoire au même rythme. |
| **Application des résultats** | H72:00 | Points ligue, forme post-match, salaires, Vol d'Oiseau, entraînement (Milestones 3, 4, 7, 8). |

Le résultat d'un match peut être **révélé narrativement avant H72** (K.O. anticipé), mais les conséquences mécaniques sur le compte du joueur ne sont appliquées qu'à **H72**.

---

## 🩸 Étape 0 : Initialisation et Calcul de la Forme (Avant le Match)

Avant même le premier tour de combat, le serveur charge les ninjas et applique les modificateurs de la **Forme Hebdomadaire** (`weekly_forme`). La forme agit comme un coefficient multiplicateur sur **toutes** les statistiques du ninja pour la durée du match :

* **Forme "Divin" :** `+15%` sur toutes les statistiques.
* **Forme "Excellent" :** `+5%` sur toutes les statistiques.
* **Forme "Passable" :** Aucun changement (`0%`).
* **Forme "Lamentable" :** `-25%` sur toutes les statistiques (le ninja est épuisé/blessé).

*C'est après avoir appliqué ce calcul que le serveur détermine les PV max (`Taijutsu recalculé * 10`) et le Chakra max pour le match.*

---

## 🎲 Étape 1 : Jet d'Initiative & Impact du "Téméraire"

Au début de chaque tour, le serveur calcule la Vitesse Tactique globale de chaque escouade :
$$\text{Vitesse\_{Équipe}} = \sum (\text{vitesse} + \text{intelligence}) \text{ des 3 ninjas}$$

### 🎭 Intervention du Caractère (Le Téméraire) :
* **Au Tour 1 uniquement :** Si un ninja possède le trait **Téméraire**, sa vitesse est boostée de `+4` points (après calcul de la Forme). Cela augmente drastiquement les chances de son équipe de remporter la première possession du match.

---

## 🎯 Étape 2 : Choix de l'Attaquant et Impact du QI (Sélection de la Technique)

Une fois l'équipe attaquante désignée, le serveur choisit le ninja attaquant selon ses consignes. Ce ninja doit maintenant décider **quelle technique** il va lancer. C'est ici que l'**Intelligence (QI)** et le **Caractère** dictent le code :

### 🧠 Logique de l'Intelligence (Le choix de la faille) :
* Le serveur regarde les 3 ninjas adverses en face et isole leurs statistiques de défense les plus basses.
* **Si le ninja attaquant a une haute Intelligence ($\ge 12$) :** Il repère la faille. Au lieu de lancer bêtement sa meilleure compétence, son QI le force à utiliser la statistique de combat qui cible le point faible exact de sa cible (ex: si la cible a une défense Genjutsu catastrophique, il lancera une illusion).
* **Si le ninja a une faible Intelligence ($< 12$) :** Il est prévisible. Il fonce tête baissée et utilise sa statistique la plus élevée, même si l'adversaire a de quoi la contrer facilement.

### 🎭 Intervention du Caractère (L'Égoïste) :
* Avant de valider les statistiques d'attaque, le serveur vérifie si le ninja est **Égoïste**. 
* Si ses deux coéquipiers sur le terrain ont actuellement moins de PV que lui, sa fierté s'active : il gagne instantanément un bonus de `+2` sur sa statistique de combat pour ce tour.

---

## 🎯 Étape 3 : Ciblage et Impact de l'Égoïste (L'Insoumission)

Le serveur doit désigner qui va défendre en face. Il cherche si l'adversaire a configuré un "Tank".

### 🎭 Intervention du Caractère (L'Égoïste vs Le Tank) :
* Si l'attaquant choisi à l'étape précédente est **Égoïste**, il n'en fait qu'à sa tête. Le script **ignore totalement** le bonus de provocation (les 70% de chances de cibler le Tank adverse). L'Égoïste choisit sa cible de manière 100% aléatoire, brisant la stratégie de protection de l'adversaire.

---

## 🧮 Étape 4 : Le Duel & Impact du Fainéant / Téméraire

Le match résout le duel entre l'Attaquant et le Défenseur.

### 🎭 Intervention du Caractère (Le Téméraire & Le Fainéant) :
* **Vérification du Chakra :** Le coût de base d'une technique est de 10 Chakra. Si l'attaquant est **Téméraire**, le script lui prélève **12 points** de Chakra à la place (malus de canalisation).
* **Vérification des États (Le Fainéant) :** Si l'attaquant lance un Genjutsu (Illusion) et gagne le duel, le défenseur est censé être *Paralysé* ou *Confus*. Mais si le défenseur est **Fainéant** et que c'est la première fois du match qu'il subit une illusion, son calme olympien s'active : le malus d'état est **immédiatement annulé**.

---

## 🦅 Étape 5 : Sauvetage du Sensei & Impact de l'Altruiste

Si le défenseur va subir un coup fatal (PV tombant à 0) :

1.  Le serveur vérifie d'abord si le **Jonin-Sensei** (le joueur) a assez de Chakra ($\ge 25$) et réussit son test d'Intelligence pour lancer sa *Substitution*.
2.  **Si le Sensei échoue ou n'a plus de Chakra :** Le script cherche si l'autre coéquipier sur le terrain est **Altruiste**.
3.  Si un coéquipier est **Altruiste**, le serveur lance un dé à 50% de chances. En cas de succès, le ninja altruiste quitte sa position, encaisse les dégâts à la place du Genin mourant, et sauve son camarade au sacrifice de ses propres PV.

---

## 🩸 6. Conditions de K.O. et Fin de Match

* **Le K.O. Technique :** Un ninja est retiré du match si ses PV tombent à 0, OU si son Chakra tombe à 0 (Évanouissement).
* **La Retraite Forcée :** Si les 3 ninjas de champ d'une équipe sont simultanément K.O., l'équipe adverse gagne immédiatement par K.O.
* **Fin des 12 Tours :** Victoire aux points tactiques selon le pourcentage de PV/Chakra totaux restants.

### 🏥 Équilibrage Post-Match & Gestion de la Récupération

Pour éviter de bloquer le joueur en début de jeu lorsqu'il possède peu de remplaçants, les règles de récupération après le match (appliquées à **H72**) sont adoucies :

1. **Restauration des PV :** À la fin de l'Opération de Frontière, les PV et le Chakra de match de TOUS les ninjas sont **entièrement remis à 100%**. Ils récupèrent de leurs blessures superficielles.
2. **Malus de Forme Linéaire (Pas d'effondrement) :** Un ninja qui a terminé le match **K.O.** ne passe pas directement à "Lamentable". Il descend simplement d'**un seul palier** sur l'échelle de sa Forme hebdomadaire pour le cycle suivant (ex: de *Excellent* à *Passable*, ou de *Passable* à *Lamentable*). Un ninja qui a survécu au match conserve son palier de Forme.

### 🌿 Le Dispensaire Médical (Option d'Urgence contre Ryos)

Si un joueur n'a pas de remplaçant et doit absolument faire jouer un ninja tombé au statut **Lamentable** (qui applique un terrible malus de `-25%` sur ses statistiques) :

* **L'Action de Soins :** Depuis son Bureau (Vue 3), le joueur peut envoyer le ninja au Dispensaire.
* **Le Coût :** Payer une somme fixe en **Ryos** (indexée sur le grade du ninja, ex: 500 Ryos pour un Genin, 1 500 Ryos pour un Chunin).
* **L'Effet :** Le traitement aux herbes médicinales fait immédiatement remonter la Forme du ninja du palier *Lamentable* au palier *Passable* (`0%` de modificateur). Le ninja est ainsi prêt à combattre dignement pour le cycle qui commence, brisant le blocage du turnover.

---

## 🛠️ Résumé de la Todo-List pour l'IA (Mise à jour)

* [ ] **Orchestration H71 :** Déclencher la simulation pour tous les matchs de la pool à H71 et transmettre les logs JSON au Moteur de Chronique (Milestone 6).
* [ ] **Étape 0 :** Créer la fonction de pré-calcul qui applique les multiplicateurs de la `weekly_forme` (`+15%`, `+5%`, `0%`, `-25%`) sur les stats brutes avant de générer les PV/Chakra du match.
* [ ] **Étape 1 :** Ajouter la condition du trait `Temeraire` au Tour 1 (`+4 Vitesse`).
* [ ] **Étape 2 :** Coder l'arbre de décision IA basé sur l' `intelligence` (QI) pour le choix de la technique offensive, et ajouter le déclencheur de fierté de l' `Egoiste` (`+2 combat`).
* [ ] **Étape 3 :** Coder l'insoumission de l' `Egoiste` qui bypass les probabilités de redirection du Tank adverse.
* [ ] **Étape 4 :** Coder la surconsommation de chakra du `Temeraire` (12 au lieu de 10) et l'immunité passive du `Faineant` au premier Genjutsu.
* [ ] **Étape 5 :** Coder la fonction de sacrifice à 50% du coéquipier `Altruiste` en cas d'échec de la substitution du Sensei.
