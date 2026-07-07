# 📝 Milestone 6 : Le Moteur de Chronique (Live Text) & Débriefing

Ce document spécifie le système de traduction des logs bruts du moteur de combat en **chronique shinobi** romancée, la révélation progressive pendant l'heure live (H71 → H72), ainsi que le rapport analytique post-match.

---

## 🏗️ 1. Le Pipeline de Données du Match

Le moteur de combat (Milestone 5) ne génère **jamais** de texte littéraire directement. À **H71**, il produit un tableau d'objets JSON épurés (les faits). Le **Moteur de Chronique** assemble ensuite ces faits en segments narratifs, planifie leur déverrouillage progressif, et stocke le tout avant que le Front-End ne révèle l'histoire aux joueurs.

### Déclenchement (H71)

1. Gel des tactiques.
2. Simulation intégrale du match (12 tours max, voir Milestone 5).
3. Génération de la chronique narrative complète (segments + timeline de déverrouillage).
4. Statut du match : `revealing` jusqu'à H72.

Les **résultats mécaniques** (points ligue, forme, salaires, Vol d'Oiseau) ne sont appliqués qu'à **H72**, une fois l'heure live terminée.

### Exemple de structure d'un log de tour (JSON brut — interne, jamais affiché tel quel) :

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
  "sensei_interception": true,
  "altruiste_sacrifice": false
}
```

---

## 📖 2. Structure Narrative Continue (Le Format "Chapitre")

Le rapport ne doit **pas** afficher d'horodatage brut (`[H71:08]`, numéro de tour, valeurs PV/Chakra/RNG). Il est généré sous forme de **texte littéraire continu**, découpé en segments. Le Front-End (Vue 3, vue `/operation`) débloque l'affichage de ces segments au fil de l'heure de combat (**H71:00 → H72:00**). L'horloge serveur sert uniquement de **verrou de lecture** ; le joueur lit un chapitre de manga, pas des logs techniques.

### Conventions rédactionnelles (validées PO)

| Règle | Détail |
| :--- | :--- |
| **Un seul texte par match** | La chronique est générée **une fois** à H71 et stockée dans `match_narrative_segments` — les deux joueurs lisent le **même** récit. |
| **Troisième personne neutre** | Pas de « votre », « vos », « vous » dans la chronique. Ex. : *« Kakashi intervient au bon moment… »* et non *« votre timing était parfait »*. |
| **Libellés d'équipe** | Pas de noms de dojo fictifs (« Dojo des Corbeaux »). Utiliser **« l'équipe de {nom du Sensei} »** (ex. *l'équipe de Kakashi*). |
| **Débriefing séparé** | Le ton analytique « conseil du Sensei » à H72 reste **personnalisé par joueur** (possession, stats) — ce n'est pas la chronique romancée. |

### Les 4 blocs narratifs

| Bloc | Fenêtre de déverrouillage (interne) | Contenu |
| :--- | :--- | :--- |
| **1 — Introduction littéraire** | Dès H71:00 | Fusion de la description du terrain (lieu procédural), de l'ambiance et d'une présentation des escouades en prose (caractères, posture des ninjas). |
| **2 — Montée en tension** | H71:02 → ~H71:08 | Silence pré-combat, jaugement mutuel, détails sensoriels intégrés au récit (vent, pluie, terrain accidenté). |
| **3 — Cœur de l'action** | H71:08 → variable | Fusion des tours de combat en phrases de duel reliées par des **transitions** (« Un éclair fend le ciel », « Le fracas des armes retentit »). Découpé en **plusieurs segments** qui s'enchaînent sans rupture de ton. |
| **4 — Dénouement et conséquences** | Dès `ending_reveal_at` | Victoire ou défaite (K.O. ou aux points), retraite éventuelle, état physique des ninjas au retour au camp (amorce la baisse de forme, le moral, le besoin du Dispensaire). |

### Exemple du rendu "Histoire Fluide" pour le joueur

Si le joueur se connecte à **H71:45** (le match n'est pas encore terminé narrativement), voici le texte continu qu'il lit sur la vue Opération :

> **Le Rapport de l'Opération de Frontière**
>
> L'Opération se déroule cette semaine dans les gorges brumeuses de Shi no Kuni. Alors que le vent porte l'odeur de la pluie sur le terrain accidenté, personne ne bouge encore. Dans ce silence lourd, Rei Uchiwa ajuste son bandeau avec un sourire arrogant tandis qu'à ses côtés, le jeune Haru se place à l'avant, déterminé à protéger le groupe face au Dojo des Corbeaux.
>
> Le combat s'engage soudainement dans le fracas des armes. Profitant de la brume, Rei prend l'initiative et fond sur le flanc adverse avec une lame de chakra, coupant net l'élan de leur premier Genin. Les répliques sont immédiates. Un éclair fend le ciel alors que les techniques élémentaires se croisent, et l'équipe adverse tente de saturer le terrain sous un déluge de feu. Kakashi intervient au bon moment via une permutation et sauve Haru d'une brûlure critique, au prix d'une bonne partie de sa réserve de Chakra.
>
> *(Indicateur visuel discret : « Le combat fait rage… la suite des rapports arrive dans quelques minutes »)*

Puis, à partir de **`ending_reveal_at`** (ex. H71:48), le paragraphe de conclusion se débloque et s'ajoute fluidement en dessous :

> La pression constante de l'équipe de Kakashi finit par payer. Épuisés et acculés au fond de la gorge, les ninjas de l'équipe adverse finissent par plier et sonnent une retraite précipitée sous la pluie battante. Le retour au camp sera difficile ; Rei marche en tête, Haru doit être soutenu par ses camarades.

---

## ⏱️ 3. Timeline de Révélation (Rythme Irrégulier)

La révélation n'est **pas** cadencée toutes les 5 minutes. À H71, le serveur génère une **timeline unique par match** avec des intervalles aléatoires (ex. 2 min, 6 min, 2 min, 8 min…) répartis sur la fenêtre d'une heure.

### Algorithme de génération

```
1. Simuler le match → ending_tour (1..12), logs JSON, état final
2. Générer les blocs 1 et 2 (texte fixe)
3. Convertir les logs des tours 1..ending_tour en phrases littéraires + connecteurs
4. Découper le bloc 3 en segments narratifs
5. Assigner à chaque segment un unlock_at (minutes après H71), gaps aléatoires 2–8 min
6. Placer le bloc 4 (dénouement) juste après le dernier segment d'action (+ 0–3 min)
7. Si ending_tour < 12 : ne pas générer de segments pour les tours non joués
8. Valider : tous les unlock_at ≤ 60, ordre chronologique respecté
```

Les deux joueurs d'un même duel partagent **exactement** la même timeline : ils découvrent l'histoire au même rythme.

### K.O. anticipé

Si le match se termine au tour 7, seuls les segments correspondant aux tours 1→7 sont planifiés. Le bloc 4 (dénouement) se débloque peu après le dernier segment d'action, même si l'heure n'a pas atteint H72. Le temps restant avant H72 peut accueillir un court épilogue narratif (fillers romancés, sans impact mécanique).

---

## 🗂️ 4. Le Dictionnaire de Phrases (Le Traducteur de Lore)

Pour éviter la répétition, le backend utilise un dictionnaire de phrases à variables dynamiques. Pour chaque type d'action, le serveur pioche aléatoirement parmi 3 ou 4 variantes. **Les variantes destinées au joueur ne contiennent jamais de jargon mécanique** (pas de « -45 PV », pas de « RNG »).

### A. Exemples de templates pour le Taijutsu

* *Variante 1 :* « {attaquant_name} fond sur sa cible et enchaîne une série de coups de pieds dévastateurs. {cible_name} encaisse le choc et s'épuise à chercher son souffle. »
* *Variante 2 :* « Un sifflement fend l'air. {attaquant_name} prend de vitesse {cible_name} avec un balayage lourd. Le choc est violent et perturbe la circulation de son énergie. »

### B. Exemples de templates pour le Genjutsu

* *Variante Succès :* « Les yeux de {attaquant_name} brillent d'une lueur étrange. {cible_name} s'arrête net, le regard vide, piégé dans une illusion de paralysie ! »
* *Variante Échec (Esquive du Fainéant) :* « {attaquant_name} tente de plonger la cible dans une illusion, mais {cible_name} bâille paresseusement, totalement insensible à ce piège mental. »

### C. Phrases de transition (liens entre actions)

* « Un éclair fend le ciel. »
* « Le vent porte l'odeur de la pluie. »
* « Personne ne bouge encore. »
* « Le fracas des armes retentit soudainement. »

### D. Le Cas Critique : L'Interception du Sensei (Substitution)

Si `sensei_interception` est `true`, le moteur injecte un script d'action héroïque à la place d'une phrase de dégâts :

* « Le coup de grâce allait s'abattre sur {cible_name} ! Dans un nuage de fumée soudain, le Jonin-Sensei apparaît et permute son élève avec une bûche de bois. La réserve de Chakra du Sensei s'épuise, mais l'apprenti est sauf ! »

### E. Indicateurs de suspense (Front-End)

Si des segments sont encore verrouillés et que le match n'est pas narrativement terminé, afficher **une** formulation tirée aléatoirement parmi :

* « Le combat fait rage… la suite des rapports arrive dans quelques minutes. »
* « Le rapport est encore en cours de transmission depuis le front… »
* « Le messager shinobi n'est pas encore revenu du terrain. »

---

## 🗄️ 5. Modèle de Données (Chronique)

```sql
matches (
  id,
  pool_id,
  home_user_id,
  away_user_id,
  simulated_at,           -- H71
  reveal_start_at,        -- = simulated_at
  ending_tour,            -- 1..12
  ending_reveal_at,       -- timestamp du bloc 4
  results_applied_at,     -- H72, null tant que pending
  winner_id,
  status                  -- 'simulated' | 'revealing' | 'finished' | 'applied'
)

match_narrative_segments (
  match_id,
  segment_order,          -- ordre d'affichage
  block_type,             -- 'intro' | 'tension' | 'action' | 'denouement' | 'epilogue'
  unlock_at,              -- minutes après reveal_start_at (interne, jamais exposé au client)
  text                    -- prose littéraire
)
```

L'API `GET /api/operation/live` retourne uniquement les segments dont `unlock_at ≤ position_actuelle_du_cycle`. Le champ `unlock_at` n'est **jamais** renvoyé au client.

---

## 🖥️ 6. Règles de Rendu Front-End (Vue `/operation`)

* Concaténer les segments débloqués en un flux de lecture unique (`<article class="chronique">`).
* **Interdiction** d'afficher horodatage, numéro de tour ou jargon technique dans la chronique.
* Si des segments sont en attente et le dénouement n'est pas encore débloqué : afficher l'indicateur de suspense (section 4.E).
* Les snapshots mécaniques (barres PV/Chakra, état des 6 ninjas) vivent dans un **panneau latéral optionnel**, mis à jour uniquement pour les tours déjà révélés — jamais dans le texte littéraire.
* WebSocket optionnel (`operation:segment_unlocked`) pour éviter le polling pendant l'heure live ; l'horloge serveur reste la source de vérité.
* Joueur absent : à la reconnexion, il voit tous les segments déjà débloqués selon l'horloge globale (pas de rattrapage accéléré).

---

## 🧠 7. Le Débriefing Pédagogique (Anti-Boîte Noire)

Le débriefing est **séparé** de la chronique romancée. Il s'affiche à **H72**, sous le chapitre, dans un ton plus analytique (« conseil du Sensei »).

Le script de débriefing analyse les statistiques du match et génère jusqu'à 3 alertes :

* **Test d'Initiative :** Si l'équipe a obtenu la possession moins de 35 % du temps → *« 🚩 Votre escouade a subi le rythme du match. Vos ninjas manquent cruellement de Vitesse ou d'Intelligence par rapport à l'adversaire. Priorisez l'entraînement de la Vitesse au prochain cycle. »*
* **Test de Faille Élémentaire :** Si plus de 3 attaques de Ninjutsu subies ont bénéficié du bonus d'affinité adverse → *« 🚩 L'adversaire a exploité vos faiblesses élémentaires à chaque duel. Pensez à acheter des protections au Marché Noir ou à modifier votre composition d'équipe. »*
* **Test d'Énergie :** Si deux ninjas ont fini K.O. par manque de Chakra → *« 🚩 Vos ninjas se sont effondrés par manque d'énergie. Améliorez leur réserve de Chakra, réduisez l'utilisation de ninjas Téméraires, ou recrutez un ninja Médecin pour les soutenir. »*

---

## 🛠️ Instructions pour le dev (À donner à l'IA pour cette étape)

* [x] Crée la structure du dictionnaire de phrases textuelles en backend (Node.js), classée par types d'actions, transitions et indicateurs de suspense.
* [x] Développe la fonction d'assemblage qui convertit les logs JSON bruts (M5) en segments narratifs littéraires (sans jargon mécanique).
* [x] Implémente le générateur de timeline de révélation (intervalles aléatoires sur 60 min, gestion du K.O. anticipé).
* [x] Expose l'API `GET /api/operation/live` et, optionnellement, le canal WebSocket de déverrouillage. *(WebSocket non livré — polling 30s)*
* [x] Développe la vue Vue 3 `/operation` : article continu, indicateur de suspense, panneau mécanique latéral optionnel.
* [x] Code les algorithmes d'analyse post-match pour générer les 3 alertes de débriefing pédagogique, affichées à H72 sous la chronique.
