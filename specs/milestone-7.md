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

## 🐣 3. Injection de la Relève (L'Aspirant)

Quand un Chunin part en Jonin, un slot se libère. **Par défaut**, un aspirant **roturier gratuit** comble le vide (tirage standard, sans garantie de lignée).

| Mode | Coût | Profil |
| :--- | :--- | :--- |
| **Relève gratuite** | 0 Ryos | Roturier, Genin 15 ans (tirage `pickClanForRecruitment`) |
| **Recrutement payant** *(backlog)* | Ryos, 1× / cycle | 2–3 candidats au choix (voie, potentiel, noble possible) |

Voir [`recruitment-market.md`](./recruitment-market.md) pour le marché aspirants futur (vente/licenciement inclus).

1. **Libération du Slot :** le poste du Jonin partant est vacant.
2. **Génération :** module procédural avec rareté clan.
3. **Profil :** Genin 15 ans, moral max ; nom seul si roturier.
4. **Notification Bureau :** « Un aspirant a rejoint le Dojo » (+ détail lignée si clan).

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

* [ ] Rédige le script de maintenance post-match (Cron **H72**, après application des résultats mécaniques) qui scanne la base de données à la recherche de Chunins ayant atteint une statistique majeure à 20.
* [ ] Implémente les formules de calcul mathématique pour l'attribution des Ryos et des Points de Réputation lors du départ du ninja.
* [ ] Code la fonction de suppression/archivage du ninja promu et l'appel automatique au générateur procédural pour injecter le nouvel Aspirant de 15 ans dans l'escouade.
* [ ] Développe le système de notification Backend $\rightarrow$ Front-End pour afficher le message de félicitations et le profil du nouveau venu sur l'interface Vue 3.
