# 📝 Milestone 6 : Le Moteur de Chronique (Live Text) & Débriefing

Ce document spécifie le système de traduction des logs bruts du moteur de combat en lignes de texte immersives (le "Lore"), ainsi que la structure du rapport analytique post-match.

---

## 🏗️ 1. Le Pipeline de Données du Match

Le moteur de combat (Milestone 5) ne doit pas générer directement du texte. Il génère un tableau d'objets JSON épuré contenant uniquement des données brutes (les faits). C'est le **Moteur de Chronique** qui va lire ce JSON à la fin du match pour construire le script textuel que le joueur va lire.

### Exemple de structure d'un log de tour (JSON brut) :
```json
{
  "tour": 3,
  "equipe_attaque": "Joueur A",
  "attaquant_name": "Rei Uchiwa",
  "technique_type": "Ninjutsu",
  "cible_name": "Hyuga Haru",
  "degats_pv": 45,
  "chakra_perdu_cible": 0,
  "statut_consequence": null,
  "sensei_interception": false,
  "altruiste_sacrifice": false
}

```
## 🗂️ 2. Le Dictionnaire de Phrases (Le Traducteur de Lore)
Pour éviter que le jeu ne soit répétitif, le backend utilise un dictionnaire de phrases à variables dynamiques. Pour chaque type d'action, le serveur pioche aléatoirement parmi 3 ou 4 variantes.
### A. Exemples de templates pour le Taijutsu (Dégâts + Drain Chakra)
 * *Variante 1 :* "{attaquant_name} fond sur sa cible et enchaîne une série de coups de pieds dévastateurs. {cible_name} encaisse (-{degats_pv} PV) et s'épuise à chercher son souffle (-{chakra_perdu_cible} Chakra)."
 * *Variante 2 :* "Un sifflement fend l'air. {attaquant_name} prend de vitesse {cible_name} avec un balayage lourd. Le choc est violent (-{degats_pv} PV) et perturbe la circulation de son énergie."
### B. Exemples de templates pour le Genjutsu (Malus d'État)
 * *Variante Succès :* "Les yeux de {attaquant_name} brillent d'une lueur étrange. {cible_name} s'arrête net, le regard vide, piégé dans une illusion de paralysie !"
 * *Variante Échec (Esquive du Fainéant) :* "{attaquant_name} tente de plonger la cible dans une illusion, mais {cible_name} bâille paresseusement, totalement insensible à ce piège mental."
### C. Le Cas Critique : L'Interception du Sensei (Substitution)
Si sensei_interception est true, le moteur ignore les phrases de dégâts et injecte immédiatement un script d'action héroïque :
 * "Le coup de grâce allait s'abattre sur {cible_name} ! Dans un nuage de fumée soudain, le Jonin-Sensei adverse apparaît et permute son élève avec une bûche de bois. Le Chakra du Sensei s'épuise, mais l'apprenti est sauf !"
## 🧠 3. Le Débriefing Pédagogique (Anti-Boîte Noire)
À la fin de la chronique textuelle, le joueur ne doit pas se dire *"J'ai perdu à cause d'une mauvaise RNG"*. Le serveur doit analyser les statistiques du match pour générer un **Rapport Analytique de Synthèse** sous forme de conseils textuels clairs.
Le script de débriefing applique des vérifications logiques à la fin des 12 tours :
 * **Test d'Initiative :** Si l'équipe a obtenu la possession moins de 35% du temps durant le match \rightarrow Afficher : *« 🚩 Votre escouade a subi le rythme du match. Vos ninjas manquent cruellement de Vitesse ou d'Intelligence par rapport à l'adversaire. Priorisez l'entraînement de la Vitesse au prochain cycle. »*
 * **Test de Faille Élémentaire :** Si plus de 3 attaques de Ninjutsu subies ont bénéficié du bonus d'affinité adverse (ex: ton équipe full Futon s'est fait détruire par du Katon) \rightarrow Afficher : *« 🚩 L'adversaire a exploité vos faiblesses élémentaires à chaque duel. Pensez à acheter des protections au Marché Noir ou à modifier votre composition d'équipe. »*
 * **Test d'Énergie :** Si deux de tes ninjas ont fini K.O. par manque de Chakra (épuisement) \rightarrow Afficher : *« 🚩 Vos ninjas se sont effondrés par manque d'énergie. Améliorez leur réserve de Chakra, réduisez l'utilisation de ninjas Téméraires, ou recrutez un ninja Médecin pour les soutenir. »*
## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)
 * [ ] Crée la structure du dictionnaire de phrases textuelles en backend (Node.js), classée par types d'actions et de compétences.
 * [ ] Développe la fonction de parsing (traduction) qui prend le tableau de logs JSON bruts du match et génère la chronique textuelle finale en remplaçant les variables dynamiques ({name}, {degats}).
 * [ ] Code les algorithmes d'analyse post-match pour générer les 3 alertes de débriefing pédagogique (Initiative, Faille élémentaire, Épuisement de Chakra) afin de guider les choix d'entraînement du joueur.

