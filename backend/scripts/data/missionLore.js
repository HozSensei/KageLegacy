/**
 * Lore joueur des missions — mini-histoires locales (pas d’arc global).
 * Une vignette est tirée au lancement du run ; la liste missions n’affiche pas de synopsis.
 */

const CHAPTER = Object.freeze({
  D: Object.freeze({
    fr: 'Chapitre D — Routes et ragots',
    en: 'Chapter D — Roads and rumors',
  }),
  C: Object.freeze({
    fr: 'Chapitre C — Agents et avant-postes',
    en: 'Chapter C — Agents and outposts',
  }),
  B: Object.freeze({
    fr: 'Chapitre B — Élites et représailles',
    en: 'Chapter B — Elites and reprisals',
  }),
  A: Object.freeze({
    fr: 'Chapitre A — Preuves et secrets',
    en: 'Chapter A — Proofs and secrets',
  }),
  S: Object.freeze({
    fr: 'Chapitre S — L’ombre du Kage',
    en: 'Chapter S — Shadow of the Kage',
  }),
});

/** @typedef {{ briefFr: string, briefEn: string, epilogueFr: string, epilogueEn: string }} Vignette */

/** @type {Record<string, readonly Vignette[]>} */
export const RANK_VIGNETTES = Object.freeze({
  D: Object.freeze([
    Object.freeze({
      briefFr:
        'Un rônin rançonne la Route des Brumes. Officiellement : un bandit. Officieusement : trop bien renseigné. Nettoie la route — et le silence.',
      briefEn:
        'A ronin shakes down Mist Road. Officially a bandit. Unofficially too well-informed. Clear the road — and keep quiet.',
      epilogueFr:
        'La route rouvre. Dans une besace : un sceau sans village. Personne au QG ne veut en parler.',
      epilogueEn:
        'The road reopens. In a pack: a seal with no village mark. HQ will not discuss it.',
    }),
    Object.freeze({
      briefFr:
        'Un voleur empoisonne les sentiers des marais. Les caravanes accusent le voisin. Coupe court avant que la rumeur force une “réponse”.',
      briefEn:
        'A thief poisons the marsh trails. Caravans blame the neighbor. Cut him short before rumor forces a “response.”',
      epilogueFr: 'Le poison cesse. Qui lui a vendu la formule ?',
      epilogueEn: 'The poison stops. Who sold him the formula?',
    }),
    Object.freeze({
      briefFr:
        'Une bête garde un dépôt “abandonné”. Dedans : ferraille… et des colis estampillés. Consigne : ne rien ramener qui parle.',
      briefEn:
        'A beast guards an “abandoned” depot. Inside: scrap… and stamped parcels. Orders: bring nothing that talks.',
      epilogueFr: 'Le dépôt est vide. Les marques ont disparu avant ton rapport.',
      epilogueEn: 'The depot is empty. The marks vanished before your report.',
    }),
    Object.freeze({
      briefFr:
        'Des voyageurs manquent à l’appel près d’un gué. On parle d’embuscade. Toi, tu vérifies — sans faire de vagues.',
      briefEn:
        'Travelers missing near a ford. Talk of an ambush. You check — without making waves.',
      epilogueFr: 'Tu ramènes des sacs vides. Les noms des disparus sont déjà rayés des registres.',
      epilogueEn: 'You bring back empty packs. The missing names are already struck from the rolls.',
    }),
  ]),
  C: Object.freeze([
    Object.freeze({
      briefFr:
        'Un éclaireur Kurogane tient le col. Kurogane vend ses lames aux trois villages. Aujourd’hui, il bloque *ton* passage.',
      briefEn:
        'A Kurogane scout holds the pass. Kurogane sells blades to all three villages. Today he blocks *your* road.',
      epilogueFr: 'Le col est libre. Le contrat qu’il portait a le client raturé.',
      epilogueEn: 'The pass is clear. His contract had the client’s name scratched out.',
    }),
    Object.freeze({
      briefFr:
        'La Porte de Marée devait rester neutre. Une sentinelle “indépendante” en a fait un péage. Ton village refuse de payer.',
      briefEn:
        'Tide Gate was meant to stay neutral. An “independent” sentinel turned it into a toll. Your village refuses to pay.',
      epilogueFr: 'La porte rouvre. Demain, un autre village enverra sa propre “sentinelle”.',
      epilogueEn: 'The gate reopens. Tomorrow another village will send its own “sentinel.”',
    }),
    Object.freeze({
      briefFr:
        'Un adepte du Miroir sème la vulnérabilité sur tes lignes. On murmure Oborohama — ou un acteur payé pour y ressembler.',
      briefEn:
        'A Mirror Adept spreads vulnerability along your lines. Rumors say Oborohama — or someone paid to look the part.',
      epilogueFr: 'Le miroir se brise. Dans les éclats : le sceau d’un pacte que les anciens nient.',
      epilogueEn: 'The mirror breaks. In the shards: a pact seal the elders deny.',
    }),
    Object.freeze({
      briefFr:
        'Un avant-poste de cendre signale des mouvements. Officiellement : reconnaissance. En vrai : quelqu’un teste tes réactions.',
      briefEn:
        'An ash outpost reports movement. Officially: recon. Truly: someone is testing your reactions.',
      epilogueFr: 'L’avant-poste se tait. Ton rapport disparaît dans trois bureaux différents.',
      epilogueEn: 'The outpost goes quiet. Your report vanishes into three different offices.',
    }),
  ]),
  B: Object.freeze([
    Object.freeze({
      briefFr:
        'Un capitaine cendré enchaîne les représailles “pour l’honneur”. Derrière lui : la Cloche Creuse, louée sans drapeau.',
      briefEn:
        'An ashen captain chains reprisals “for honor.” Behind him: the Hollow Bell, hired without a banner.',
      epilogueFr: 'La cloche se tait. Trois villages nieront avoir payé le glas.',
      epilogueEn: 'The bell falls silent. Three villages will deny paying for the toll.',
    }),
    Object.freeze({
      briefFr:
        'Racine-de-Fer tient un siège autour d’un puits. Contrôler l’eau, c’est tenir deux villages à la gorge.',
      briefEn:
        'Ironroot holds a siege around a well. Control the water, and you hold two villages by the throat.',
      epilogueFr: 'L’eau coule à nouveau. Qui a ordonné le siège reste “interne”.',
      epilogueEn: 'Water flows again. Who ordered the siege remains “internal.”',
    }),
    Object.freeze({
      briefFr:
        'Épreuve Mandeciel : foudre et brûlures. On dit que les candidats qui échouent disparaissent… chez le voisin.',
      briefEn:
        'Stormcaller trial: lightning and burns. Failed candidates vanish… into a rival village, they say.',
      epilogueFr: 'Tu tiens. Un examinateur note ton nom — puis le raye quand on cite ton village.',
      epilogueEn: 'You hold. An examiner notes your name — then strikes it when your village is named.',
    }),
    Object.freeze({
      briefFr:
        'La Matrone Spiralebraise “purifie” un avant-poste. Purification = scorcher les preuves d’un échange de jutsu.',
      briefEn:
        'Embercoil Matron “purifies” an outpost. Purification means burning evidence of a jutsu trade.',
      epilogueFr: 'Sous la cendre : un inventaire de techniques. Deux villages y figurent. Pas le tien — officiellement.',
      epilogueEn: 'Under the ash: a technique inventory. Two villages listed. Not yours — officially.',
    }),
  ]),
  A: Object.freeze([
    Object.freeze({
      briefFr:
        'Lame-Crépuscule frappe fort. Vu avec des archivistes du Voile — ceux qui gardent les preuves du pacte brisé.',
      briefEn:
        'Duskblade hits hard. Seen with Veil archivists — keepers of proof of the broken pact.',
      epilogueFr: 'Sur lui : une page arrachée. “Le pacte fut rompu à…” — le reste est brûlé.',
      epilogueEn: 'On him: a torn page. “The pact was broken at…” — the rest is burned.',
    }),
    Object.freeze({
      briefFr:
        'Intrusion aux Archives du Voile : récupérer ce qui prouve la trahison — ou ce qui accuse le voisin.',
      briefEn:
        'Breach the Veil Archives: recover proof of betrayal — or proof that blames the neighbor.',
      epilogueFr: 'Tu sors avec un dossier. Le QG en copie trois versions. Aucune n’est identique.',
      epilogueEn: 'You leave with a dossier. HQ copies three versions. None match.',
    }),
    Object.freeze({
      briefFr:
        'La Voyante Orchidée-Tombe a vu le pacte se briser — dit-on. Les trois villages veulent sa langue.',
      briefEn:
        'Grave Orchid Seer saw the pact break — so they say. All three villages want her tongue.',
      epilogueFr: 'Elle murmure un nom de village. Le tien. Ou celui qu’on t’a ordonné d’entendre.',
      epilogueEn: 'She whispers a village name. Yours. Or the one you were ordered to hear.',
    }),
    Object.freeze({
      briefFr:
        'Le Colosse Fracturemire : arme de siège “oubliée” chez l’ennemi. Brise le prisme avant qu’il ne change de camp.',
      briefEn:
        'Mirrorfracture Colossus: a siege weapon “forgotten” on the enemy. Shatter the prism before it switches sides.',
      epilogueFr: 'Le prisme explose. Les éclats portent trois couleurs. Comme trois bannières.',
      epilogueEn: 'The prism shatters. The shards carry three colors. Like three banners.',
    }),
  ]),
  S: Object.freeze([
    Object.freeze({
      briefFr:
        'Le Régent de la Flèche-Vide parle au nom d’un Kage mort. Il détient la dernière copie du pacte — ou un faux parfait.',
      briefEn:
        'The Voidspire Regent speaks for a dead Kage. He holds the last pact copy — or a perfect forgery.',
      epilogueFr:
        'Le document est à toi. Les trois villages enverront quelqu’un le “récupérer”.',
      epilogueEn:
        'The document is yours. All three villages will send someone to “retrieve” it.',
    }),
    Object.freeze({
      briefFr:
        'Une éclipse de chakra noie la Flèche-Vide. Mission : survivre, observer, ne rapporter que ce que ton village doit savoir.',
      briefEn:
        'A chakra eclipse drowns Voidspire. Mission: survive, observe, report only what your village must know.',
      epilogueFr: 'L’éclipse passe. Ton rapport tient en une ligne. Le reste, tu le gardes.',
      epilogueEn: 'The eclipse passes. Your report fits one line. The rest, you keep.',
    }),
    Object.freeze({
      briefFr:
        'On t’envoie seul là où les ANBU refusent d’aller. Officiellement : reconnaissance. En vrai : on teste si tu reviens.',
      briefEn:
        'You’re sent alone where ANBU refuse to go. Officially: recon. Truly: they test whether you return.',
      epilogueFr: 'Tu reviens. Personne ne te félicite. On range juste ton nom dans un autre tiroir.',
      epilogueEn: 'You return. No one congratulates you. They just file your name in another drawer.',
    }),
  ]),
});

/** @deprecated Couverture slug → première vignette du rang (tests / fallback). */
export const MISSION_LORE = Object.freeze(
  Object.fromEntries(
    ['D', 'C', 'B', 'A', 'S'].flatMap(rank => {
      const slug = `mission-rank-${rank.toLowerCase()}`;
      const v = RANK_VIGNETTES[rank]?.[0];
      return v ? [[slug, v]] : [];
    }),
  ),
);

export function getMissionChapter(rank) {
  return CHAPTER[rank] || null;
}

export function getMissionLore(slug) {
  return MISSION_LORE[slug] || null;
}

/**
 * Tire une vignette pour un rang (immersion au lancement uniquement).
 * @param {string} rank
 * @param {() => number} [rng]
 */
export function pickRankVignette(rank, rng = Math.random) {
  const list = RANK_VIGNETTES[rank];
  if (!list?.length) return null;
  const idx = Math.min(list.length - 1, Math.floor(rng() * list.length));
  return { ...list[idx] };
}

export function attachMissionLore(mission) {
  if (!mission) return null;
  const chapter = getMissionChapter(mission.rank);
  // Pas de brief sur la liste : le synopsis vit sur le run au lancement.
  return {
    ...mission,
    chapterFr: chapter?.fr || null,
    chapterEn: chapter?.en || null,
    briefFr: null,
    briefEn: null,
    epilogueFr: null,
    epilogueEn: null,
  };
}
