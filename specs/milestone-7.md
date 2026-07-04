# 🦅 Milestone 7 : Le Vol d'Oiseau (Cycle de Vie & Renouvellement)

Ce document spécifie le système de retraite des ninjas d'élite (le passage au rang de Jonin), le calcul des récompenses de fin de formation, et l'injection automatique de la relève.

---

## 🕒 1. La Limite d'Élite (Le Départ Forcé)

Dans **Kage Legacy**, vous n'êtes pas un collectionneur : vous êtes un formateur. Les ninjas ne peuvent pas rester éternellement dans votre escouade.

* **Le Déclencheur :** Dès qu'un ninja au grade de *Chunin* atteint une note de **20** (le maximum) dans n'importe quelle statistique majeure (`taijutsu`, `ninjutsu`, `genjutsu` ou `medecine`), il est considéré comme ayant atteint le sommet de votre enseignement.
* **L'Échéance (Fin de Cycle) :** À l'**Heure 72**, après la fin de l'heure live narrative (H71→H72) et l'application des résultats de match, le serveur exécute le script du "Vol d'Oiseau". Le ninja reçoit officiellement son diplôme, est promu au rang de **Jonin**, et quitte définitivement l'escouade active. Son enregistrement est retiré de la table des ninjas jouables.

---

## 💰 2. Le Calcul des Gains de Fin de Cycle

Le départ d'un élève accompli est le moment le plus rentable pour l'économie du joueur. Le serveur calcule une prime unique indexée sur le profil du ninja sortant :

### A. La Formule de Récompense financière (Ryos)
Le village caché vous finance pour avoir formé un soldat d'élite :
$$\text{Gain\_{Ryos}} = \text{Base (3 000)} + (\text{Somme de toutes ses caractéristiques} \times 150)$$

### B. La Formule de Prestige (Points de Réputation)
C'est la donnée la plus importante, celle qui fait grimper le joueur dans le **Tableau de Renommée** mondial (Milestone 8) :
* **Gain de base :** `+10 Points de Réputation`.
* **Bonus de Talent :** `+5 Points` supplémentaires si le ninja possédait un trait de Clan (ex: *Uchiwa*, *Nara*), car former un membre de la noblesse shinobi apporte plus de prestige à votre Dojo.

---

## 🐣 3. Injection Automatique de la Relève (L'Aspirant)

Pour éviter qu'un joueur ne se retrouve avec seulement 2 ninjas sur le terrain (ce qui violerait les règles du simulateur de combat de la Milestone 5), le départ d'un Jonin déclenche immédiatement le recrutement de sa relève.

1. **Libération du Slot :** Le slot d'escouade précédemment occupé par le Jonin est marqué comme `null` (Vide).
2. **Génération de l'Aspirant :** Le serveur appelle instantanément le module de génération procédurale (conçu dans la Milestone 2).
3. **Le Profil de départ :** Un nouvel apprenti **Genin de 15 ans** est créé. Ses statistiques de combat sont basses (comprises entre 2 et 5). Son Moral est au maximum (`20/20`), impatient d'apprendre.
4. **Attribution automatique :** Ce ninja est injecté directement dans l'escouade du joueur pour combler le vide. Le joueur reçoit une notification sur son Bureau Vue 3 : *« Un nouvel Aspirant a rejoint votre Dojo pour remplacer votre glorieux Jonin. Au travail, Sensei ! »*

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

* [ ] Rédige le script de maintenance post-match (Cron **H72**, après application des résultats mécaniques) qui scanne la base de données à la recherche de Chunins ayant atteint une statistique majeure à 20.
* [ ] Implémente les formules de calcul mathématique pour l'attribution des Ryos et des Points de Réputation lors du départ du ninja.
* [ ] Code la fonction de suppression/archivage du ninja promu et l'appel automatique au générateur procédural pour injecter le nouvel Aspirant de 15 ans dans l'escouade.
* [ ] Développe le système de notification Backend $\rightarrow$ Front-End pour afficher le message de félicitations et le profil du nouveau venu sur l'interface Vue 3.
