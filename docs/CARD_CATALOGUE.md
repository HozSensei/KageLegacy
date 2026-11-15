# Catalogue des cartes / Card catalogue — Kage Legacy

> Source of truth: `backend/scripts/seedCards.js` → `ALL_CARDS` = STARTER + EXPANSION (wave1 + wave2 + clan legendaries).
> Ordre stable = numéros collection `#N` (1-based).
> Total: **206** cartes (STARTER 22 · wave1 78 · wave2 100 · clan 6).

## Index noms FR (copie rapide)

1. Poing rapide
2. Poing du dragon
3. Barrage de lames
4. Souffle ardent
5. Lance de foudre
6. Vague brumeuse
7. Garde haute
8. Mur de pierre
9. Voile d’ombre
10. Contre tranchant
11. Paume apaisante
12. Concentration
13. Mirage persistant
14. Vent porteur
15. Kunai de fer
16. Pilule fortifiante
17. Parchemin de scellement
18. Ampoule de chakra
19. Clone de combat
20. Esprit du renard
21. Frappe opportuniste
22. Bande de soie
23. Lame crépusculaire
24. Serres de fer
25. Coup de talon
26. Rafale de shuriken
27. Poing sismique
28. Danse des lames
29. Frappe du soleil noir
30. Cendre spiralée
31. Pilier de flammes
32. Cœur de braise
33. Goutte tranchante
34. Torrent perçant
35. Abysse silencieux
36. Étincelle vive
37. Chaîne d’éclairs
38. Orage du pic
39. Éclat de roche
40. Lame de granit
41. Dune engloutissante
42. Coupe venteuse
43. Lame du typhon
44. Soupir du vide
45. Illusion tranchante
46. Cauchemar aigu
47. Reflet trompeur
48. Aiguillon nerveux
49. Lame du guérisseur
50. Pression vitale
51. Crochet du sentinelle
52. Assaut de l’aube
53. Sang de braise
54. Marteau du roc
55. Jugement du ciel brisé
56. Parade basse
57. Bouclier de bois
58. Carapace de fer
59. Riposte éclair
60. Écran de vapeur
61. Rempart d’eau
62. Armure de magma
63. Coquille de terre
64. Forteresse vivante
65. Voile de brise
66. Barrière statique
67. Mirage protecteur
68. Voile de mensonge
69. Bandage renforcé
70. Garde du médecin
71. Égide ancestrale
72. Respiration profonde
73. Mains de lumière
74. Méditation du sceau
75. Vision claire
76. Lien mental
77. Écho hypnotique
78. Souffle tonique
79. Courant porteur
80. Rituel de braise
81. Ancrage tellurique
82. Charge électrique
83. Préparation martiale
84. Danse du sanglier
85. Purge toxique
86. Pacte du serpent blanc
87. Harmonie des cinq vents
88. Senbon empoisonné
89. Fumigène de fuite
90. Élixir clair
91. Talisman de foudre
92. Poudre de flash
93. Sceau de rétention
94. Ration de campagne
95. Loup de pierre
96. Corbeau spectre
97. Serpent d’eau
98. Faucon de foudre
99. Salamandre ardente
100. Gardien du sanctuaire
101. Crochet du veilleur
102. Balayage de genou
103. Pluie de senbon
104. Coup de coude
105. Fouet de corde
106. Estocade basse
107. Étincelle sèche
108. Lame de braise
109. Goutte perforante
110. Courant tranchant
111. Arc statique
112. Aiguille d’orage
113. Éclat de galet
114. Poing de sable
115. Tranche ventée
116. Souffle coupant
117. Dague fantôme
118. Murmure tranchant
119. Lame du sommeil
120. Scalpel vif
121. Piqûre précise
122. Frappe de pause
123. Danse des poings
124. Assaut du col
125. Marteau du sentier
126. Colonne de feu
127. Cascade percée
128. Fouet électrique
129. Faille sismique
130. Lame du rafale
131. Miroir brisé
132. Illusion coupante
133. Incision vitale
134. Frappe du seuil
135. Tempête de poings
136. Soleil de verre
137. Abysse d’argent
138. Javelot du ciel
139. Rêves brisés
140. Éclipse du seuil
141. Garde croisée
142. Parade haute
143. Bouclier de cendres
144. Rideau d’eau
145. Grille d’éclairs
146. Mur de galets
147. Voile de poussière
148. Ombre pliée
149. Masque de brume
150. Attelle vive
151. Cuirasse légère
152. Carapace du colosse
153. Rempart de braise
154. Dôme d’eau
155. Bastion tellurique
156. Voile spectral
157. Bouclier du chirurgien
158. Citadelle de pierre
159. Aegis du mirage
160. Rempart des ancêtres
161. Souffle calibré
162. Relecture tactique
163. Pas glissant
164. Chauffe musculaire
165. Braise intérieure
166. Flux clair
167. Charge vive
168. Ancrage profond
169. Poussée d’air
170. Brouillage léger
171. Suture rapide
172. Méditation de guerre
173. Rituel de force
174. Onde de choc
175. Bain de sources
176. Brouillard persistant
177. Vent de reprise
178. Sceau des cinq voies
179. Chant du guérisseur
180. Harmonie du vide
181. Shuriken lesté
182. Fiole stimulante
183. Ampoule vive
184. Compresse chaude
185. Poudre aveuglante
186. Corde de rappel
187. Talisman de braise
188. Galet runique
189. Parchemin d’exil
190. Élixir de guerre
191. Orbe de tonnerre
192. Miroir de poche
193. Furet des ombres
194. Scarabée de pierre
195. Luciole guide
196. Tortue de marée
197. Tigre de braise
198. Dragon de nuage
199. Gardien de jade
200. Renard aux neuf vents
201. Héritage Shizumori
202. Héritage Benigiri
203. Héritage Kazamine
204. Héritage Kumatani
205. Héritage Yukisawa
206. Héritage Nagihara

## Répartition

| | |
|---|---|
| Types | attack: 82 · defense: 41 · skill: 43 · item: 24 · summon: 16 |
| Raretés | common: 110 · rare: 60 · legendary: 30 · mythic: 6 |
| Éléments | null: 117 · katon: 18 · raiton: 19 · suiton: 16 · doton: 20 · futon: 16 |

## Cartes détaillées

### #1 — Poing rapide

- **EN:** Swift Fist
- **slug:** `poing-rapide`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 6 dégâts.
- **set:** starter

### #2 — Poing du dragon

- **EN:** Dragon Fist
- **slug:** `poing-du-dragon`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 12 dégâts.
- **set:** starter

### #3 — Barrage de lames

- **EN:** Blade Barrage
- **slug:** `barrage-de-lames`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Inflige 4 dégâts, trois fois.
- **set:** starter

### #4 — Souffle ardent

- **EN:** Ember Breath
- **slug:** `souffle-ardent`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 2
- **effet:** Inflige 10 dégâts et Brûlure 2.
- **set:** starter

### #5 — Lance de foudre

- **EN:** Thunder Lance
- **slug:** `lance-de-foudre`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** raiton (foudre)
- **chakra:** 3
- **effet:** Inflige 18 dégâts. Applique Vulnérable.
- **set:** starter

### #6 — Vague brumeuse

- **EN:** Mist Wave
- **slug:** `vague-brumeuse`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Piochez 1 carte.
- **set:** starter

### #7 — Garde haute

- **EN:** High Guard
- **slug:** `garde-haute`
- **type:** defense / défense (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 8 d’armure.
- **set:** starter

### #8 — Mur de pierre

- **EN:** Stone Wall
- **slug:** `mur-de-pierre`
- **type:** defense / défense (ninjutsu)
- **rarity:** rare / rare
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Gagne 14 d’armure.
- **set:** starter

### #9 — Voile d’ombre

- **EN:** Shadow Veil
- **slug:** `voile-d-ombre`
- **type:** defense / défense (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** Gagne 5 d’armure. 50% d’esquiver la prochaine attaque.
- **set:** starter

### #10 — Contre tranchant

- **EN:** Cutting Counter
- **slug:** `contre-tranchant`
- **type:** defense / défense (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Gagne 10 d’armure. Renvoie 6 dégâts.
- **set:** starter

### #11 — Paume apaisante

- **EN:** Soothing Palm
- **slug:** `paume-apaisante`
- **type:** skill / compétence (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Restaure 12 PV.
- **set:** starter

### #12 — Concentration

- **EN:** Focus
- **slug:** `concentration`
- **type:** skill / compétence (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Piochez 2 cartes.
- **set:** starter

### #13 — Mirage persistant

- **EN:** Lingering Mirage
- **slug:** `mirage-persistant`
- **type:** skill / compétence (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** Applique Faiblesse 2 pendant 2 tours.
- **set:** starter

### #14 — Vent porteur

- **EN:** Tailwind
- **slug:** `vent-porteur`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** +20 % armure gagnée pendant 3 tours.
- **set:** starter

### #15 — Kunai de fer

- **EN:** Iron Kunai
- **slug:** `kunai-de-fer`
- **type:** item / objet (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Inflige 4 dégâts. Exhaust.
- **set:** starter

### #16 — Pilule fortifiante

- **EN:** Fortifying Pill
- **slug:** `pilule-du-soldat`
- **type:** item / objet (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** +25 % dégâts pendant 3 tours. Exhaust.
- **set:** starter

### #17 — Parchemin de scellement

- **EN:** Sealing Scroll
- **slug:** `parchemin-de-scellement`
- **type:** item / objet (ninjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Exile une carte adverse. Exhaust.
- **set:** starter

### #18 — Ampoule de chakra

- **EN:** Chakra Vial
- **slug:** `ampoule-de-chakra`
- **type:** item / objet (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Gagne 2 Chakra. Exhaust.
- **set:** starter

### #19 — Clone de combat

- **EN:** Combat Clone
- **slug:** `clone-de-combat`
- **type:** summon / invocation (ninjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 3
- **effet:** Invoque un clone (20 PV, 6 ATK, Taunt).
- **set:** starter

### #20 — Esprit du renard

- **EN:** Fox Spirit
- **slug:** `esprit-du-renard`
- **type:** summon / invocation (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 4
- **effet:** Invoque un esprit renard (28 PV, 8 ATK).
- **set:** starter

### #21 — Frappe opportuniste

- **EN:** Opportunistic Strike
- **slug:** `frappe-opportuniste`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** 8 dégâts. +6 si l’ennemi est Vulnérable.
- **set:** starter

### #22 — Bande de soie

- **EN:** Silk Wrap
- **slug:** `bande-de-soie`
- **type:** item / objet (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Restaure 8 PV. Exhaust.
- **set:** starter

### #23 — Lame crépusculaire

- **EN:** Twilight Blade
- **slug:** `lame-crespusculaire`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 7 dégâts.
- **set:** expansion-wave1

### #24 — Serres de fer

- **EN:** Iron Talons
- **slug:** `serres-de-fer`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Inflige 5 dégâts, deux fois.
- **set:** expansion-wave1

### #25 — Coup de talon

- **EN:** Heel Drop
- **slug:** `coup-de-talon`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Applique Faiblesse 1 (1 tour).
- **set:** expansion-wave1

### #26 — Rafale de shuriken

- **EN:** Shuriken Flurry
- **slug:** `rafale-de-shuriken`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 3 dégâts, trois fois.
- **set:** expansion-wave1

### #27 — Poing sismique

- **EN:** Seismic Fist
- **slug:** `poing-sismique`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Inflige 11 dégâts. Applique Vulnérable.
- **set:** expansion-wave1

### #28 — Danse des lames

- **EN:** Blade Dance
- **slug:** `danse-des-lames`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 4 dégâts, quatre fois.
- **set:** expansion-wave1

### #29 — Frappe du soleil noir

- **EN:** Black Sun Strike
- **slug:** `frappe-du-soleil-noir`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 3
- **effet:** Inflige 20 dégâts. +8 si l’ennemi est Affaibli.
- **set:** expansion-wave1

### #30 — Cendre spiralée

- **EN:** Spiral Ash
- **slug:** `cendre-spiralee`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** katon (feu)
- **chakra:** 1
- **effet:** Inflige 6 dégâts et Brûlure 1.
- **set:** expansion-wave1

### #31 — Pilier de flammes

- **EN:** Flame Pillar
- **slug:** `pilier-de-flammes`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 2
- **effet:** Inflige 9 dégâts à tous. Brûlure 2.
- **set:** expansion-wave1

### #32 — Cœur de braise

- **EN:** Ember Heart
- **slug:** `coeur-de-braise`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 3
- **effet:** Inflige 16 dégâts et Brûlure 4.
- **set:** expansion-wave1

### #33 — Goutte tranchante

- **EN:** Cutting Droplet
- **slug:** `goutte-tranchante`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 1
- **effet:** Inflige 6 dégâts.
- **set:** expansion-wave1

### #34 — Torrent perçant

- **EN:** Piercing Torrent
- **slug:** `torrent-percant`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 2
- **effet:** Inflige 10 dégâts. Piochez 1 carte.
- **set:** expansion-wave1

### #35 — Abysse silencieux

- **EN:** Silent Abyss
- **slug:** `abysse-silencieux`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** suiton (eau)
- **chakra:** 3
- **effet:** Inflige 14 dégâts, Faiblesse 2 (2 tours). Piochez 1.
- **set:** expansion-wave1

### #36 — Étincelle vive

- **EN:** Live Spark
- **slug:** `etincelle-vive`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Applique Vulnérable.
- **set:** expansion-wave1

### #37 — Chaîne d’éclairs

- **EN:** Lightning Chain
- **slug:** `chaine-d-eclairs`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 2
- **effet:** Inflige 7 dégâts deux fois. Vulnérable.
- **set:** expansion-wave1

### #38 — Orage du pic

- **EN:** Peak Thunderstorm
- **slug:** `orage-du-pic`
- **type:** attack / attaque (ninjutsu)
- **rarity:** mythic / mythique
- **element:** raiton (foudre)
- **chakra:** 4
- **effet:** Inflige 24 dégâts à tous. Vulnérable 2.
- **set:** expansion-wave1

### #39 — Éclat de roche

- **EN:** Rock Shard
- **slug:** `eclat-de-roche`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 1
- **effet:** Inflige 7 dégâts.
- **set:** expansion-wave1

### #40 — Lame de granit

- **EN:** Granite Blade
- **slug:** `lame-de-granit`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Inflige 11 dégâts.
- **set:** expansion-wave1

### #41 — Dune engloutissante

- **EN:** Engulfing Dune
- **slug:** `tombeau-de-sable`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** doton (terre)
- **chakra:** 3
- **effet:** Inflige 12 dégâts. Faiblesse 2 et Vulnérable.
- **set:** expansion-wave1

### #42 — Coupe venteuse

- **EN:** Wind Cut
- **slug:** `coupe-venteuse`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Piochez 1 carte.
- **set:** expansion-wave1

### #43 — Lame du typhon

- **EN:** Typhoon Blade
- **slug:** `lame-du-typhon`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** futon (vent)
- **chakra:** 2
- **effet:** Inflige 8 dégâts, deux fois.
- **set:** expansion-wave1

### #44 — Soupir du vide

- **EN:** Void Sigh
- **slug:** `soupir-du-vide`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** futon (vent)
- **chakra:** 3
- **effet:** Inflige 15 dégâts à tous. +20 % armure (2 tours).
- **set:** expansion-wave1

### #45 — Illusion tranchante

- **EN:** Cutting Illusion
- **slug:** `illusion-tranchante`
- **type:** attack / attaque (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 4 dégâts. Faiblesse 1 (2 tours).
- **set:** expansion-wave1

### #46 — Cauchemar aigu

- **EN:** Sharp Nightmare
- **slug:** `cauchemar-aigu`
- **type:** attack / attaque (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Inflige 9 dégâts. Applique Vulnérable.
- **set:** expansion-wave1

### #47 — Reflet trompeur

- **EN:** Deceiving Reflection
- **slug:** `oeil-du-mirroir`
- **type:** attack / attaque (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Inflige 10 dégâts. +10 si Vulnérable. Piochez 1.
- **set:** expansion-wave1

### #48 — Aiguillon nerveux

- **EN:** Nerve Sting
- **slug:** `aiguillon-nerveux`
- **type:** attack / attaque (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 4 dégâts. Faiblesse 1 (1 tour).
- **set:** expansion-wave1

### #49 — Lame du guérisseur

- **EN:** Healer's Edge
- **slug:** `scalpel-de-chakra`
- **type:** attack / attaque (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 8 dégâts. Restaure 4 PV.
- **set:** expansion-wave1

### #50 — Pression vitale

- **EN:** Vital Pressure
- **slug:** `pression-vitale`
- **type:** attack / attaque (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 5 dégâts.
- **set:** expansion-wave1

### #51 — Crochet du sentinelle

- **EN:** Sentinel Hook
- **slug:** `crochet-du-sentinelle`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Inflige 10 dégâts. Gagne 4 d’armure.
- **set:** expansion-wave1

### #52 — Assaut de l’aube

- **EN:** Dawn Assault
- **slug:** `assaut-de-l-aube`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 12 dégâts. +6 si première carte du tour.
- **set:** expansion-wave1

### #53 — Sang de braise

- **EN:** Ember Blood
- **slug:** `sang-de-braise`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** katon (feu)
- **chakra:** 2
- **effet:** Inflige 8 dégâts et Brûlure 2.
- **set:** expansion-wave1

### #54 — Marteau du roc

- **EN:** Stone Hammer
- **slug:** `marteau-du-roc`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Inflige 13 dégâts.
- **set:** expansion-wave1

### #55 — Jugement du ciel brisé

- **EN:** Broken Sky Judgment
- **slug:** `jugement-du-ciel-brise`
- **type:** attack / attaque (ninjutsu)
- **rarity:** mythic / mythique
- **element:** raiton (foudre)
- **chakra:** 5
- **effet:** Inflige 30 dégâts. Vulnérable 2 et Brûlure 3.
- **set:** expansion-wave1

### #56 — Parade basse

- **EN:** Low Parry
- **slug:** `parade-basse`
- **type:** defense / défense (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 7 d’armure.
- **set:** expansion-wave1

### #57 — Bouclier de bois

- **EN:** Wooden Shield
- **slug:** `bouclier-de-bois`
- **type:** defense / défense (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 6 d’armure. Piochez 1 carte.
- **set:** expansion-wave1

### #58 — Carapace de fer

- **EN:** Iron Carapace
- **slug:** `carapace-de-fer`
- **type:** defense / défense (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Gagne 16 d’armure.
- **set:** expansion-wave1

### #59 — Riposte éclair

- **EN:** Flash Riposte
- **slug:** `riposte-eclair`
- **type:** defense / défense (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Gagne 8 d’armure. Renvoie 8 dégâts.
- **set:** expansion-wave1

### #60 — Écran de vapeur

- **EN:** Steam Screen
- **slug:** `ecran-de-vapeur`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 1
- **effet:** Gagne 6 d’armure. 35% d’esquiver la prochaine attaque.
- **set:** expansion-wave1

### #61 — Rempart d’eau

- **EN:** Water Rampart
- **slug:** `rempart-d-eau`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 2
- **effet:** Gagne 12 d’armure. Piochez 1 carte.
- **set:** expansion-wave1

### #62 — Armure de magma

- **EN:** Magma Armor
- **slug:** `armure-de-magma`
- **type:** defense / défense (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 2
- **effet:** Gagne 10 d’armure. Renvoie 5 dégâts (brûlants).
- **set:** expansion-wave1

### #63 — Coquille de terre

- **EN:** Earthen Shell
- **slug:** `coquille-de-terre`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 1
- **effet:** Gagne 9 d’armure.
- **set:** expansion-wave1

### #64 — Forteresse vivante

- **EN:** Living Fortress
- **slug:** `forteresse-vivante`
- **type:** defense / défense (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** doton (terre)
- **chakra:** 3
- **effet:** Gagne 22 d’armure. Régénération 3 (2 tours).
- **set:** expansion-wave1

### #65 — Voile de brise

- **EN:** Breeze Veil
- **slug:** `voile-de-brise`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** Gagne 5 d’armure. 40% d’esquiver la prochaine attaque.
- **set:** expansion-wave1

### #66 — Barrière statique

- **EN:** Static Barrier
- **slug:** `barriere-statique`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 1
- **effet:** Gagne 7 d’armure. Renvoie 3 dégâts.
- **set:** expansion-wave1

### #67 — Mirage protecteur

- **EN:** Guardian Mirage
- **slug:** `mirage-protecteur`
- **type:** defense / défense (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 6 d’armure. 45% d’esquiver la prochaine attaque.
- **set:** expansion-wave1

### #68 — Voile de mensonge

- **EN:** Veil of Lies
- **slug:** `voile-de-mensonge`
- **type:** defense / défense (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Gagne 8 d’armure. 60% d’esquive. Faiblesse 1.
- **set:** expansion-wave1

### #69 — Bandage renforcé

- **EN:** Reinforced Wrap
- **slug:** `bandage-renforce`
- **type:** defense / défense (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 5 d’armure et restaure 4 PV.
- **set:** expansion-wave1

### #70 — Garde du médecin

- **EN:** Medic’s Guard
- **slug:** `garde-du-medecin`
- **type:** defense / défense (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Gagne 10 d’armure et restaure 6 PV.
- **set:** expansion-wave1

### #71 — Égide ancestrale

- **EN:** Ancestral Aegis
- **slug:** `aegis-ancestral`
- **type:** defense / défense (ninjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 3
- **effet:** Gagne 18 d’armure. 50% d’esquive. Renvoie 6.
- **set:** expansion-wave1

### #72 — Respiration profonde

- **EN:** Deep Breath
- **slug:** `respiration-profonde`
- **type:** skill / compétence (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Restaure 8 PV.
- **set:** expansion-wave1

### #73 — Mains de lumière

- **EN:** Hands of Light
- **slug:** `mains-de-lumiere`
- **type:** skill / compétence (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Restaure 16 PV. Régénération 2 et +15 % soins (2 tours).
- **set:** expansion-wave1

### #74 — Méditation du sceau

- **EN:** Seal Meditation
- **slug:** `meditation-du-sceau`
- **type:** skill / compétence (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Piochez 1 carte. Gagne 1 Chakra.
- **set:** expansion-wave1

### #75 — Vision claire

- **EN:** Clear Sight
- **slug:** `vision-claire`
- **type:** skill / compétence (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Piochez 3 cartes.
- **set:** expansion-wave1

### #76 — Lien mental

- **EN:** Mind Link
- **slug:** `lien-mental`
- **type:** skill / compétence (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Faiblesse 1 (2 tours). Piochez 1.
- **set:** expansion-wave1

### #77 — Écho hypnotique

- **EN:** Hypnotic Echo
- **slug:** `echo-hypnotique`
- **type:** skill / compétence (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Faiblesse 3 (2 tours) et Vulnérable.
- **set:** expansion-wave1

### #78 — Souffle tonique

- **EN:** Tonic Breath
- **slug:** `souffle-tonique`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** +20 % armure gagnée pendant 2 tours.
- **set:** expansion-wave1

### #79 — Courant porteur

- **EN:** Carrying Current
- **slug:** `courant-porteur`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 1
- **effet:** Piochez 2. Gagne 1 Chakra.
- **set:** expansion-wave1

### #80 — Rituel de braise

- **EN:** Ember Ritual
- **slug:** `rituel-de-braise`
- **type:** skill / compétence (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 1
- **effet:** +20 % dégâts Ninjutsu (3 tours). Brûlure 1 sur l’ennemi.
- **set:** expansion-wave1

### #81 — Ancrage tellurique

- **EN:** Telluric Anchor
- **slug:** `ancrage-tellurique`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 1
- **effet:** Gagne 5 d’armure. +15 % armure gagnée (2 tours).
- **set:** expansion-wave1

### #82 — Charge électrique

- **EN:** Electric Charge
- **slug:** `charge-electrique`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 0
- **effet:** Gagne 2 Chakra.
- **set:** expansion-wave1

### #83 — Préparation martiale

- **EN:** Martial Readiness
- **slug:** `preparation-martiale`
- **type:** skill / compétence (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** +20 % dégâts Taijutsu (2 tours). Piochez 1.
- **set:** expansion-wave1

### #84 — Danse du sanglier

- **EN:** Boar Dance
- **slug:** `danse-du-sanglier`
- **type:** skill / compétence (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** +25 % dégâts Taijutsu (3 tours). Gagne 6 d’armure.
- **set:** expansion-wave1

### #85 — Purge toxique

- **EN:** Toxic Purge
- **slug:** `purge-toxique`
- **type:** skill / compétence (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Restaure 6 PV. Purge un malus.
- **set:** expansion-wave1

### #86 — Pacte du serpent blanc

- **EN:** White Serpent Pact
- **slug:** `pacte-du-serpent-blanc`
- **type:** skill / compétence (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Piochez 2. +20 % dégâts Genjutsu (2 tours). Vulnérable sur l’ennemi.
- **set:** expansion-wave1

### #87 — Harmonie des cinq vents

- **EN:** Harmony of Five Winds
- **slug:** `harmonie-des-cinq-vents`
- **type:** skill / compétence (ninjutsu)
- **rarity:** mythic / mythique
- **element:** futon (vent)
- **chakra:** 3
- **effet:** Piochez 3. +2 Chakra. +25 % armure gagnée (3 tours).
- **set:** expansion-wave1

### #88 — Senbon empoisonné

- **EN:** Poisoned Senbon
- **slug:** `senbon-empoisonne`
- **type:** item / objet (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Inflige 3 dégâts. Faiblesse 1 (2 tours). Exhaust.
- **set:** expansion-wave1

### #89 — Fumigène de fuite

- **EN:** Escape Smoke Bomb
- **slug:** `fumigene-de-fuite`
- **type:** item / objet (ninjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Gagne 6 d’armure. 70% d’esquive. Exhaust.
- **set:** expansion-wave1

### #90 — Élixir clair

- **EN:** Clear Elixir
- **slug:** `elixir-clair`
- **type:** item / objet (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** Restaure 10 PV. Purge un malus. Exhaust.
- **set:** expansion-wave1

### #91 — Talisman de foudre

- **EN:** Thunder Talisman
- **slug:** `talisman-de-foudre`
- **type:** item / objet (ninjutsu)
- **rarity:** rare / rare
- **element:** raiton (foudre)
- **chakra:** 1
- **effet:** Gagne 2 Chakra. Vulnérable sur l’ennemi. Exhaust.
- **set:** expansion-wave1

### #92 — Poudre de flash

- **EN:** Flash Powder
- **slug:** `poudre-de-flash`
- **type:** item / objet (ninjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Vulnérable. Piochez 1. Exhaust.
- **set:** expansion-wave1

### #93 — Sceau de rétention

- **EN:** Retention Seal
- **slug:** `sceau-de-retention`
- **type:** item / objet (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Exile une carte adverse. Piochez 1. Exhaust.
- **set:** expansion-wave1

### #94 — Ration de campagne

- **EN:** Field Ration
- **slug:** `ration-de-campagne`
- **type:** item / objet (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Restaure 5 PV. +15 % dégâts (2 tours). Exhaust.
- **set:** expansion-wave1

### #95 — Loup de pierre

- **EN:** Stone Wolf
- **slug:** `loup-de-pierre`
- **type:** summon / invocation (ninjutsu)
- **rarity:** rare / rare
- **element:** doton (terre)
- **chakra:** 3
- **effet:** Invoque un loup de pierre (24 PV, 7 ATK, Taunt).
- **set:** expansion-wave1

### #96 — Corbeau spectre

- **EN:** Specter Crow
- **slug:** `corbeau-spectre`
- **type:** summon / invocation (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Invoque un corbeau spectre (12 PV, 5 ATK).
- **set:** expansion-wave1

### #97 — Serpent d’eau

- **EN:** Water Serpent
- **slug:** `serpent-d-eau`
- **type:** summon / invocation (ninjutsu)
- **rarity:** rare / rare
- **element:** suiton (eau)
- **chakra:** 3
- **effet:** Invoque un serpent d’eau (22 PV, 6 ATK, Regen).
- **set:** expansion-wave1

### #98 — Faucon de foudre

- **EN:** Thunder Falcon
- **slug:** `faucon-de-foudre`
- **type:** summon / invocation (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** raiton (foudre)
- **chakra:** 4
- **effet:** Invoque un faucon de foudre (26 PV, 10 ATK).
- **set:** expansion-wave1

### #99 — Salamandre ardente

- **EN:** Blazing Salamander
- **slug:** `salamandre-ardente`
- **type:** summon / invocation (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 3
- **effet:** Invoque une salamandre ardente (18 PV, 8 ATK).
- **set:** expansion-wave1

### #100 — Gardien du sanctuaire

- **EN:** Sanctuary Guardian
- **slug:** `gardien-du-sanctuaire`
- **type:** summon / invocation (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 5
- **effet:** Invoque un gardien (40 PV, 9 ATK, Taunt, Regen).
- **set:** expansion-wave1

### #101 — Crochet du veilleur

- **EN:** Watchman's Hook
- **slug:** `crochet-du-veilleur`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 6 dégâts.
- **set:** expansion-wave2

### #102 — Balayage de genou

- **EN:** Knee Sweep
- **slug:** `balayage-de-genou`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Applique Faiblesse 1 (1 tour).
- **set:** expansion-wave2

### #103 — Pluie de senbon

- **EN:** Senbon Rain
- **slug:** `pluie-de-senbon`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Inflige 3 dégâts, trois fois.
- **set:** expansion-wave2

### #104 — Coup de coude

- **EN:** Elbow Smash
- **slug:** `coup-de-coude`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 7 dégâts.
- **set:** expansion-wave2

### #105 — Fouet de corde

- **EN:** Rope Lash
- **slug:** `fouet-de-corde`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 4 dégâts. Piochez 1 carte.
- **set:** expansion-wave2

### #106 — Estocade basse

- **EN:** Low Thrust
- **slug:** `estocade-basse`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Inflige 5 dégâts, deux fois.
- **set:** expansion-wave2

### #107 — Étincelle sèche

- **EN:** Dry Spark
- **slug:** `etincelle-seche`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** katon (feu)
- **chakra:** 1
- **effet:** Inflige 5 dégâts et Brûlure 1.
- **set:** expansion-wave2

### #108 — Lame de braise

- **EN:** Ember Edge
- **slug:** `lame-de-braise`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** katon (feu)
- **chakra:** 2
- **effet:** Inflige 9 dégâts et Brûlure 1.
- **set:** expansion-wave2

### #109 — Goutte perforante

- **EN:** Piercing Droplet
- **slug:** `goutte-perforante`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 1
- **effet:** Inflige 6 dégâts.
- **set:** expansion-wave2

### #110 — Courant tranchant

- **EN:** Cutting Current
- **slug:** `courant-tranchant`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 2
- **effet:** Inflige 4 dégâts, deux fois. Piochez 1 carte.
- **set:** expansion-wave2

### #111 — Arc statique

- **EN:** Static Arc
- **slug:** `arc-statique`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Applique Vulnérable.
- **set:** expansion-wave2

### #112 — Aiguille d’orage

- **EN:** Storm Needle
- **slug:** `aiguille-d-orage`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 2
- **effet:** Inflige 8 dégâts. Applique Vulnérable.
- **set:** expansion-wave2

### #113 — Éclat de galet

- **EN:** Pebble Shard
- **slug:** `eclat-de-galet`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 1
- **effet:** Inflige 7 dégâts.
- **set:** expansion-wave2

### #114 — Poing de sable

- **EN:** Sand Fist
- **slug:** `poing-de-sable`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Inflige 10 dégâts. Applique Faiblesse 1.
- **set:** expansion-wave2

### #115 — Tranche ventée

- **EN:** Windy Slash
- **slug:** `tranche-ventee`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Piochez 1 carte.
- **set:** expansion-wave2

### #116 — Souffle coupant

- **EN:** Cutting Breath
- **slug:** `souffle-coupant`
- **type:** attack / attaque (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 2
- **effet:** Inflige 4 dégâts, trois fois.
- **set:** expansion-wave2

### #117 — Dague fantôme

- **EN:** Phantom Dagger
- **slug:** `dague-fantome`
- **type:** attack / attaque (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 4 dégâts. Applique Faiblesse 1.
- **set:** expansion-wave2

### #118 — Murmure tranchant

- **EN:** Cutting Whisper
- **slug:** `murmure-tranchant`
- **type:** attack / attaque (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 5 dégâts. Applique Vulnérable.
- **set:** expansion-wave2

### #119 — Lame du sommeil

- **EN:** Sleep Blade
- **slug:** `lame-du-sommeil`
- **type:** attack / attaque (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Inflige 7 dégâts. Faiblesse 1 (2 tours).
- **set:** expansion-wave2

### #120 — Scalpel vif

- **EN:** Keen Scalpel
- **slug:** `scalpel-vif`
- **type:** attack / attaque (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 5 dégâts.
- **set:** expansion-wave2

### #121 — Piqûre précise

- **EN:** Precise Sting
- **slug:** `piqure-precise`
- **type:** attack / attaque (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Inflige 4 dégâts. Applique Vulnérable.
- **set:** expansion-wave2

### #122 — Frappe de pause

- **EN:** Pause Strike
- **slug:** `frappe-de-pause`
- **type:** attack / attaque (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Inflige 3 dégâts.
- **set:** expansion-wave2

### #123 — Danse des poings

- **EN:** Fist Dance
- **slug:** `danse-des-poings`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 5 dégâts, trois fois.
- **set:** expansion-wave2

### #124 — Assaut du col

- **EN:** Pass Assault
- **slug:** `assaut-du-col`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 12 dégâts. +6 si l’ennemi est Affaibli.
- **set:** expansion-wave2

### #125 — Marteau du sentier

- **EN:** Trail Hammer
- **slug:** `marteau-du-sentier`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 3
- **effet:** Inflige 16 dégâts.
- **set:** expansion-wave2

### #126 — Colonne de feu

- **EN:** Fire Column
- **slug:** `colonne-de-feu`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 2
- **effet:** Inflige 11 dégâts et Brûlure 2.
- **set:** expansion-wave2

### #127 — Cascade percée

- **EN:** Pierced Cascade
- **slug:** `cascade-percee`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** suiton (eau)
- **chakra:** 2
- **effet:** Inflige 10 dégâts. Piochez 1. Faiblesse 1.
- **set:** expansion-wave2

### #128 — Fouet électrique

- **EN:** Electric Lash
- **slug:** `fouet-electrique`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** raiton (foudre)
- **chakra:** 2
- **effet:** Inflige 6 dégâts, deux fois. Vulnérable.
- **set:** expansion-wave2

### #129 — Faille sismique

- **EN:** Seismic Rift
- **slug:** `faille-sismique`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** doton (terre)
- **chakra:** 3
- **effet:** Inflige 14 dégâts. Applique Vulnérable.
- **set:** expansion-wave2

### #130 — Lame du rafale

- **EN:** Gale Blade
- **slug:** `lame-du-rafale`
- **type:** attack / attaque (ninjutsu)
- **rarity:** rare / rare
- **element:** futon (vent)
- **chakra:** 2
- **effet:** Inflige 8 dégâts. +6 si première carte du tour.
- **set:** expansion-wave2

### #131 — Miroir brisé

- **EN:** Broken Mirror
- **slug:** `miroir-brise`
- **type:** attack / attaque (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 9 dégâts. Faiblesse 1 (2 tours) et Vulnérable.
- **set:** expansion-wave2

### #132 — Illusion coupante

- **EN:** Cutting Illusion
- **slug:** `illusion-coupante`
- **type:** attack / attaque (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** Inflige 7 dégâts. +5 si Vulnérable.
- **set:** expansion-wave2

### #133 — Incision vitale

- **EN:** Vital Incision
- **slug:** `incision-vitale`
- **type:** attack / attaque (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Inflige 8 dégâts. Régénération 2 (2 tours).
- **set:** expansion-wave2

### #134 — Frappe du seuil

- **EN:** Threshold Strike
- **slug:** `frappe-du-seuil`
- **type:** attack / attaque (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** Inflige 8 dégâts. +7 si Vulnérable.
- **set:** expansion-wave2

### #135 — Tempête de poings

- **EN:** Fist Storm
- **slug:** `tempete-de-poings`
- **type:** attack / attaque (taijutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 3
- **effet:** Inflige 6 dégâts, quatre fois.
- **set:** expansion-wave2

### #136 — Soleil de verre

- **EN:** Glass Sun
- **slug:** `soleil-de-verre`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** katon (feu)
- **chakra:** 3
- **effet:** Inflige 18 dégâts et Brûlure 3.
- **set:** expansion-wave2

### #137 — Abysse d’argent

- **EN:** Silver Abyss
- **slug:** `abysse-d-argent`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** suiton (eau)
- **chakra:** 3
- **effet:** Inflige 16 dégâts. Piochez 2. Faiblesse 2 (2 tours).
- **set:** expansion-wave2

### #138 — Javelot du ciel

- **EN:** Sky Javelin
- **slug:** `javelot-du-ciel`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** raiton (foudre)
- **chakra:** 4
- **effet:** Inflige 22 dégâts. Vulnérable 2.
- **set:** expansion-wave2

### #139 — Rêves brisés

- **EN:** Shattered Dreams
- **slug:** `reves-brises`
- **type:** attack / attaque (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 3
- **effet:** Inflige 14 dégâts. Faiblesse 2, Vulnérable, piochez 1.
- **set:** expansion-wave2

### #140 — Éclipse du seuil

- **EN:** Threshold Eclipse
- **slug:** `eclipse-du-seuil`
- **type:** attack / attaque (ninjutsu)
- **rarity:** mythic / mythique
- **element:** futon (vent)
- **chakra:** 5
- **effet:** Inflige 28 dégâts, deux fois. Vulnérable 2. Piochez 2.
- **set:** expansion-wave2

### #141 — Garde croisée

- **EN:** Cross Guard
- **slug:** `garde-croisee`
- **type:** defense / défense (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 8 d’armure.
- **set:** expansion-wave2

### #142 — Parade haute

- **EN:** High Parry
- **slug:** `parade-haute`
- **type:** defense / défense (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 6 d’armure. Renvoie 3 dégâts.
- **set:** expansion-wave2

### #143 — Bouclier de cendres

- **EN:** Ash Shield
- **slug:** `bouclier-de-cendres`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** katon (feu)
- **chakra:** 1
- **effet:** Gagne 7 d’armure. Renvoie 2 dégâts.
- **set:** expansion-wave2

### #144 — Rideau d’eau

- **EN:** Water Curtain
- **slug:** `rideau-d-eau`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 1
- **effet:** Gagne 7 d’armure. Piochez 1 carte.
- **set:** expansion-wave2

### #145 — Grille d’éclairs

- **EN:** Lightning Lattice
- **slug:** `grille-d-eclairs`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 1
- **effet:** Gagne 6 d’armure. Renvoie 4 dégâts.
- **set:** expansion-wave2

### #146 — Mur de galets

- **EN:** Pebble Wall
- **slug:** `mur-de-galets`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Gagne 13 d’armure.
- **set:** expansion-wave2

### #147 — Voile de poussière

- **EN:** Dust Veil
- **slug:** `voile-de-poussiere`
- **type:** defense / défense (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** Gagne 5 d’armure. 40% d’esquiver la prochaine attaque.
- **set:** expansion-wave2

### #148 — Ombre pliée

- **EN:** Folded Shadow
- **slug:** `ombre-pliee`
- **type:** defense / défense (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 6 d’armure. 40% d’esquive.
- **set:** expansion-wave2

### #149 — Masque de brume

- **EN:** Mist Mask
- **slug:** `masque-de-brume`
- **type:** defense / défense (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 5 d’armure. Faiblesse 1.
- **set:** expansion-wave2

### #150 — Attelle vive

- **EN:** Living Splint
- **slug:** `attelle-vive`
- **type:** defense / défense (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Gagne 6 d’armure. Régénération 1 (2 tours).
- **set:** expansion-wave2

### #151 — Cuirasse légère

- **EN:** Light Cuirass
- **slug:** `cuirasse-legere`
- **type:** defense / défense (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Gagne 4 d’armure.
- **set:** expansion-wave2

### #152 — Carapace du colosse

- **EN:** Colossus Shell
- **slug:** `carapace-du-colosse`
- **type:** defense / défense (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Gagne 14 d’armure. Renvoie 5 dégâts.
- **set:** expansion-wave2

### #153 — Rempart de braise

- **EN:** Ember Rampart
- **slug:** `rempart-de-braise`
- **type:** defense / défense (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 2
- **effet:** Gagne 11 d’armure. Renvoie 6 dégâts.
- **set:** expansion-wave2

### #154 — Dôme d’eau

- **EN:** Water Dome
- **slug:** `dome-d-eau`
- **type:** defense / défense (ninjutsu)
- **rarity:** rare / rare
- **element:** suiton (eau)
- **chakra:** 2
- **effet:** Gagne 12 d’armure. Piochez 1. Régénération 1.
- **set:** expansion-wave2

### #155 — Bastion tellurique

- **EN:** Telluric Bastion
- **slug:** `bastion-tellurique`
- **type:** defense / défense (ninjutsu)
- **rarity:** rare / rare
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Gagne 16 d’armure.
- **set:** expansion-wave2

### #156 — Voile spectral

- **EN:** Spectral Veil
- **slug:** `voile-spectral`
- **type:** defense / défense (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Gagne 9 d’armure. 55% d’esquive. Faiblesse 1.
- **set:** expansion-wave2

### #157 — Bouclier du chirurgien

- **EN:** Surgeon's Shield
- **slug:** `bouclier-du-chirurgien`
- **type:** defense / défense (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Gagne 10 d’armure. Régénération 2 (2 tours).
- **set:** expansion-wave2

### #158 — Citadelle de pierre

- **EN:** Stone Citadel
- **slug:** `citadelle-de-pierre`
- **type:** defense / défense (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** doton (terre)
- **chakra:** 3
- **effet:** Gagne 24 d’armure. Régénération 3 (2 tours).
- **set:** expansion-wave2

### #159 — Aegis du mirage

- **EN:** Mirage Aegis
- **slug:** `aegis-du-mirage`
- **type:** defense / défense (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 3
- **effet:** Gagne 14 d’armure. 70% d’esquive. Faiblesse 2 (2 tours).
- **set:** expansion-wave2

### #160 — Rempart des ancêtres

- **EN:** Ancestral Rampart
- **slug:** `rempart-des-ancetres`
- **type:** defense / défense (ninjutsu)
- **rarity:** mythic / mythique
- **element:** raiton (foudre)
- **chakra:** 4
- **effet:** Gagne 30 d’armure. Renvoie 12. Régénération 4.
- **set:** expansion-wave2

### #161 — Souffle calibré

- **EN:** Measured Breath
- **slug:** `souffle-calibre`
- **type:** skill / compétence (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Restaure 8 PV.
- **set:** expansion-wave2

### #162 — Relecture tactique

- **EN:** Tactical Reread
- **slug:** `relecture-tactique`
- **type:** skill / compétence (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Piochez 2 cartes.
- **set:** expansion-wave2

### #163 — Pas glissant

- **EN:** Sliding Step
- **slug:** `pas-glissant`
- **type:** skill / compétence (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** +20 % armure gagnée pendant 2 tours.
- **set:** expansion-wave2

### #164 — Chauffe musculaire

- **EN:** Muscle Warmup
- **slug:** `chauffe-musculaire`
- **type:** skill / compétence (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** +20 % dégâts Taijutsu pendant 2 tours.
- **set:** expansion-wave2

### #165 — Braise intérieure

- **EN:** Inner Ember
- **slug:** `braise-interieure`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** katon (feu)
- **chakra:** 1
- **effet:** Gagne 1 Chakra. Brûlure 1 sur l’ennemi.
- **set:** expansion-wave2

### #166 — Flux clair

- **EN:** Clear Flow
- **slug:** `flux-clair`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** suiton (eau)
- **chakra:** 1
- **effet:** Piochez 1 carte. Gagne 1 Chakra.
- **set:** expansion-wave2

### #167 — Charge vive

- **EN:** Live Charge
- **slug:** `charge-vive`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** raiton (foudre)
- **chakra:** 0
- **effet:** Gagne 1 Chakra. +15 % armure (2 tours).
- **set:** expansion-wave2

### #168 — Ancrage profond

- **EN:** Deep Anchor
- **slug:** `ancrage-profond`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 1
- **effet:** Régénération 2 pendant 2 tours.
- **set:** expansion-wave2

### #169 — Poussée d’air

- **EN:** Air Push
- **slug:** `poussee-d-air`
- **type:** skill / compétence (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** Piochez 1. +15 % armure (3 tours).
- **set:** expansion-wave2

### #170 — Brouillage léger

- **EN:** Light Scramble
- **slug:** `brouillage-leger`
- **type:** skill / compétence (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Applique Faiblesse 1 pendant 2 tours.
- **set:** expansion-wave2

### #171 — Suture rapide

- **EN:** Quick Suture
- **slug:** `suture-rapide`
- **type:** skill / compétence (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Restaure 6 PV. Piochez 1 carte.
- **set:** expansion-wave2

### #172 — Méditation de guerre

- **EN:** War Meditation
- **slug:** `meditation-de-guerre`
- **type:** skill / compétence (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** Piochez 3 cartes.
- **set:** expansion-wave2

### #173 — Rituel de force

- **EN:** Strength Ritual
- **slug:** `rituel-de-force`
- **type:** skill / compétence (taijutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** +25 % dégâts Taijutsu pendant 3 tours.
- **set:** expansion-wave2

### #174 — Onde de choc

- **EN:** Shock Pulse
- **slug:** `onde-de-choc`
- **type:** skill / compétence (ninjutsu)
- **rarity:** rare / rare
- **element:** raiton (foudre)
- **chakra:** 1
- **effet:** Vulnérable sur l’ennemi. Gagne 1 Chakra.
- **set:** expansion-wave2

### #175 — Bain de sources

- **EN:** Spring Bath
- **slug:** `bain-de-sources`
- **type:** skill / compétence (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Restaure 14 PV. Régénération 2 (2 tours).
- **set:** expansion-wave2

### #176 — Brouillard persistant

- **EN:** Lingering Fog
- **slug:** `brouillard-persistant`
- **type:** skill / compétence (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Faiblesse 2 (2 tours) et Vulnérable.
- **set:** expansion-wave2

### #177 — Vent de reprise

- **EN:** Recovery Wind
- **slug:** `vent-de-reprise`
- **type:** skill / compétence (ninjutsu)
- **rarity:** rare / rare
- **element:** futon (vent)
- **chakra:** 1
- **effet:** Piochez 2. +20 % armure (2 tours).
- **set:** expansion-wave2

### #178 — Sceau des cinq voies

- **EN:** Five Paths Seal
- **slug:** `sceau-des-cinq-voies`
- **type:** skill / compétence (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Gagne 2 Chakra. Piochez 2. +20 % dégâts (2 tours).
- **set:** expansion-wave2

### #179 — Chant du guérisseur

- **EN:** Healer's Chant
- **slug:** `chant-du-guerisseur`
- **type:** skill / compétence (medicine)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 3
- **effet:** Restaure 20 PV. Régénération 4 (3 tours). Piochez 1.
- **set:** expansion-wave2

### #180 — Harmonie du vide

- **EN:** Void Harmony
- **slug:** `harmonie-du-vide`
- **type:** skill / compétence (genjutsu)
- **rarity:** mythic / mythique
- **element:** —
- **chakra:** 3
- **effet:** Piochez 3. +2 Chakra. Faiblesse 2 (3 tours). Vulnérable 2.
- **set:** expansion-wave2

### #181 — Shuriken lesté

- **EN:** Weighted Shuriken
- **slug:** `shuriken-leste`
- **type:** item / objet (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Inflige 5 dégâts. Exhaust.
- **set:** expansion-wave2

### #182 — Fiole stimulante

- **EN:** Stim Vial
- **slug:** `fiole-stimulante`
- **type:** item / objet (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** +20 % dégâts pendant 3 tours. Exhaust.
- **set:** expansion-wave2

### #183 — Ampoule vive

- **EN:** Bright Ampoule
- **slug:** `ampoule-vive`
- **type:** item / objet (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Gagne 1 Chakra. Piochez 1. Exhaust.
- **set:** expansion-wave2

### #184 — Compresse chaude

- **EN:** Warm Compress
- **slug:** `compresse-chaude`
- **type:** item / objet (medicine)
- **rarity:** common / commune
- **element:** —
- **chakra:** 1
- **effet:** Restaure 10 PV. Exhaust.
- **set:** expansion-wave2

### #185 — Poudre aveuglante

- **EN:** Blinding Powder
- **slug:** `poudre-aveuglante`
- **type:** item / objet (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Faiblesse 1 (2 tours). Exhaust.
- **set:** expansion-wave2

### #186 — Corde de rappel

- **EN:** Recall Cord
- **slug:** `corde-de-rappel`
- **type:** item / objet (taijutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 0
- **effet:** Piochez 2 cartes. Exhaust.
- **set:** expansion-wave2

### #187 — Talisman de braise

- **EN:** Ember Talisman
- **slug:** `talisman-de-braise`
- **type:** item / objet (ninjutsu)
- **rarity:** common / commune
- **element:** katon (feu)
- **chakra:** 1
- **effet:** Inflige 6 dégâts et Brûlure 2. Exhaust.
- **set:** expansion-wave2

### #188 — Galet runique

- **EN:** Runic Pebble
- **slug:** `galet-runique`
- **type:** item / objet (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 1
- **effet:** Gagne 8 d’armure. Exhaust.
- **set:** expansion-wave2

### #189 — Parchemin d’exil

- **EN:** Exile Scroll
- **slug:** `parchemin-d-exil`
- **type:** item / objet (ninjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 2
- **effet:** Exile une carte adverse. Exhaust.
- **set:** expansion-wave2

### #190 — Élixir de guerre

- **EN:** War Elixir
- **slug:** `elixir-de-guerre`
- **type:** item / objet (medicine)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** +25 % dégâts et +20 % armure (3 tours). Exhaust.
- **set:** expansion-wave2

### #191 — Orbe de tonnerre

- **EN:** Thunder Orb
- **slug:** `orbe-de-tonnerre`
- **type:** item / objet (ninjutsu)
- **rarity:** rare / rare
- **element:** raiton (foudre)
- **chakra:** 1
- **effet:** Inflige 10 dégâts. Vulnérable. Exhaust.
- **set:** expansion-wave2

### #192 — Miroir de poche

- **EN:** Pocket Mirror
- **slug:** `miroir-de-poche`
- **type:** item / objet (genjutsu)
- **rarity:** rare / rare
- **element:** —
- **chakra:** 1
- **effet:** 60% d’esquive. Piochez 1. Exhaust.
- **set:** expansion-wave2

### #193 — Furet des ombres

- **EN:** Shadow Ferret
- **slug:** `furet-des-ombres`
- **type:** summon / invocation (genjutsu)
- **rarity:** common / commune
- **element:** —
- **chakra:** 2
- **effet:** Invoque un furet des ombres (10 PV, 4 ATK).
- **set:** expansion-wave2

### #194 — Scarabée de pierre

- **EN:** Stone Scarab
- **slug:** `scarabee-de-pierre`
- **type:** summon / invocation (ninjutsu)
- **rarity:** common / commune
- **element:** doton (terre)
- **chakra:** 2
- **effet:** Invoque un scarabée de pierre (14 PV, 3 ATK, Taunt).
- **set:** expansion-wave2

### #195 — Luciole guide

- **EN:** Guide Firefly
- **slug:** `luciole-guide`
- **type:** summon / invocation (ninjutsu)
- **rarity:** common / commune
- **element:** futon (vent)
- **chakra:** 1
- **effet:** Invoque une luciole guide (8 PV, 2 ATK).
- **set:** expansion-wave2

### #196 — Tortue de marée

- **EN:** Tide Turtle
- **slug:** `tortue-de-maree`
- **type:** summon / invocation (ninjutsu)
- **rarity:** rare / rare
- **element:** suiton (eau)
- **chakra:** 3
- **effet:** Invoque une tortue de marée (26 PV, 5 ATK, Taunt).
- **set:** expansion-wave2

### #197 — Tigre de braise

- **EN:** Ember Tiger
- **slug:** `tigre-de-braise`
- **type:** summon / invocation (ninjutsu)
- **rarity:** rare / rare
- **element:** katon (feu)
- **chakra:** 3
- **effet:** Invoque un tigre de braise (20 PV, 9 ATK).
- **set:** expansion-wave2

### #198 — Dragon de nuage

- **EN:** Cloud Dragon
- **slug:** `dragon-de-nuage`
- **type:** summon / invocation (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** raiton (foudre)
- **chakra:** 4
- **effet:** Invoque un dragon de nuage (30 PV, 11 ATK).
- **set:** expansion-wave2

### #199 — Gardien de jade

- **EN:** Jade Guardian
- **slug:** `gardien-de-jade`
- **type:** summon / invocation (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** doton (terre)
- **chakra:** 5
- **effet:** Invoque un gardien de jade (42 PV, 8 ATK, Taunt).
- **set:** expansion-wave2

### #200 — Renard aux neuf vents

- **EN:** Nine-Wind Fox
- **slug:** `renard-aux-neuf-vents`
- **type:** summon / invocation (genjutsu)
- **rarity:** legendary / légendaire
- **element:** futon (vent)
- **chakra:** 4
- **effet:** Invoque un renard aux neuf vents (24 PV, 10 ATK).
- **set:** expansion-wave2

### #201 — Héritage Shizumori

- **EN:** Shizumori Heritage
- **slug:** `clan-shizumori`
- **type:** skill / compétence (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Piochez 2. Applique Faiblesse 1 (2 tours).
- **set:** clan-legendary

### #202 — Héritage Benigiri

- **EN:** Benigiri Heritage
- **slug:** `clan-benigiri`
- **type:** attack / attaque (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** katon (feu)
- **chakra:** 3
- **effet:** Inflige 12 dégâts, Brûlure 2. Piochez 1.
- **set:** clan-legendary

### #203 — Héritage Kazamine

- **EN:** Kazamine Heritage
- **slug:** `clan-kazamine`
- **type:** attack / attaque (taijutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Inflige 10 dégâts deux fois. Vulnérable.
- **set:** clan-legendary

### #204 — Héritage Kumatani

- **EN:** Kumatani Heritage
- **slug:** `clan-kumatani`
- **type:** defense / défense (taijutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Gagne 14 d’armure. +15 % dégâts Taijutsu (2 tours).
- **set:** clan-legendary

### #205 — Héritage Yukisawa

- **EN:** Yukisawa Heritage
- **slug:** `clan-yukisawa`
- **type:** skill / compétence (genjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Faiblesse 2 (2 tours), Vulnérable. Piochez 1.
- **set:** clan-legendary

### #206 — Héritage Nagihara

- **EN:** Nagihara Heritage
- **slug:** `clan-nagihara`
- **type:** skill / compétence (ninjutsu)
- **rarity:** legendary / légendaire
- **element:** —
- **chakra:** 2
- **effet:** Restaure 6 PV. Piochez 1.
- **set:** clan-legendary

---

*Généré depuis le seed catalogue pour prompts image AI. Ne pas éditer à la main — régénérer depuis `ALL_CARDS`.*
