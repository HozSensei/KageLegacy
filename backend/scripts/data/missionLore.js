/**
 * Lore joueur des missions — conflit intervillage, trahison, coups bas.
 * Enrichit serializeMission (brief / épilogue) sans toucher au schéma SQL.
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

/** @type {Record<string, { briefFr: string, briefEn: string, epilogueFr: string, epilogueEn: string }>} */
export const MISSION_LORE = Object.freeze({
  'patrol-mist-road': {
    briefFr:
      'Un rônin rançonne la Route des Brumes. Officiellement : un bandit. Officieusement : trop bien renseigné pour travailler seul. Ton village veut la route — et le silence.',
    briefEn:
      'A ronin shakes down Mist Road. Officially a bandit. Unofficially too well-informed to work alone. Your village wants the road — and silence.',
    epilogueFr:
      'Le rônin tombe. Dans sa besace : un sceau sans village. Personne au QG ne veut en parler.',
    epilogueEn:
      'The ronin falls. In his pack: a seal with no village mark. HQ will not discuss it.',
  },
  'drain-marsh-cutpurse': {
    briefFr:
      'Un voleur empoisonne les sentiers des marais. Les caravanes accusent le village d’à côté. Toi, tu coupes court — avant que la rumeur ne force une “réponse”.',
    briefEn:
      'A thief poisons the marsh trails. Caravans blame the next village. You cut him short — before rumor forces a “response.”',
    epilogueFr:
      'Le poison cesse. Reste une question : qui lui a vendu la formule ?',
    epilogueEn: 'The poison stops. One question remains: who sold him the formula?',
  },
  'scrapyard-hound': {
    briefFr:
      'Une bête garde un dépôt “abandonné”. Dedans : ferraille… et des colis estampillés d’un autre village. Mission simple : nettoyer. Consigne réelle : ne rien ramener qui parle.',
    briefEn:
      'A beast guards an “abandoned” depot. Inside: scrap… and parcels stamped by another village. Simple job: clear it. Real order: bring nothing that talks.',
    epilogueFr:
      'Le dépôt est vide. Les marques sur les caisses ont disparu avant ton rapport.',
    epilogueEn: 'The depot is empty. The crate marks vanished before your report.',
  },
  'secure-ash-outpost': {
    briefFr:
      'Un éclaireur Kurogane tient le col. Kurogane vend ses lames aux trois villages. Aujourd’hui, il bloque *ton* passage. Coïncidence, dit-on.',
    briefEn:
      'A Kurogane scout holds the pass. Kurogane sells blades to all three villages. Today he blocks *your* road. Coincidence, they say.',
    epilogueFr:
      'Le col est libre. L’éclaireur avait sur lui un contrat — le nom du client est raturé.',
    epilogueEn:
      'The pass is clear. The scout carried a contract — the client’s name scratched out.',
  },
  'hold-tide-gate': {
    briefFr:
      'La Porte de Marée devait rester neutre. Une sentinelle “indépendante” en a fait un péage. Ton village refuse de payer. Les deux autres aussi — chacun envoie quelqu’un.',
    briefEn:
      'Tide Gate was meant to stay neutral. An “independent” sentinel turned it into a toll. Your village refuses to pay. So do the others — each sends someone.',
    epilogueFr:
      'La porte rouvre. Demain, un autre village enverra sa propre “sentinelle”.',
    epilogueEn: 'The gate reopens. Tomorrow another village will send its own “sentinel.”',
  },
  'shatter-mirror-adept': {
    briefFr:
      'Un adepte du Miroir sème la vulnérabilité sur tes lignes. On murmure qu’il a été formé à Oborohama — ou payé pour y ressembler. Brise l’illusion.',
    briefEn:
      'A Mirror Adept spreads vulnerability along your lines. Rumors say Oborohama trained him — or paid him to look the part. Shatter the illusion.',
    epilogueFr:
      'Le miroir se brise. Dans les éclats : le sceau d’un pacte que les anciens jurent n’avoir jamais signé.',
    epilogueEn:
      'The mirror breaks. In the shards: a pact seal the elders swear they never signed.',
  },
  'duel-ashen-captain': {
    briefFr:
      'Un capitaine cendré enchaîne les représailles “pour l’honneur”. Derrière lui, la Cloche Creuse — un exécuteur qu’on loue quand un village veut frapper sans laisser de drapeau.',
    briefEn:
      'An ashen captain chains reprisals “for honor.” Behind him, the Hollow Bell — a hired enforcer villages use when they want to strike without flying a banner.',
    epilogueFr:
      'La cloche se tait. Trois villages nieront avoir payé le glas.',
    epilogueEn: 'The bell falls silent. Three villages will deny paying for the toll.',
  },
  'ironroot-siege': {
    briefFr:
      'Racine-de-Fer tient un siège. Officiellement pour “protéger” un puits. En vrai : contrôler l’eau, c’est tenir Kareno et Midorihara à la gorge. Brise le siège.',
    briefEn:
      'Ironroot holds a siege. Officially to “protect” a well. Truly: control the water, and you hold Kareno and Midorihara by the throat. Break the siege.',
    epilogueFr:
      'L’eau coule à nouveau. Qui a ordonné le siège reste une affaire “interne”.',
    epilogueEn: 'Water flows again. Who ordered the siege remains an “internal” matter.',
  },
  'stormcaller-trial': {
    briefFr:
      'Foudre et brûlures en boucle : une épreuve Mandeciel. On dit que c’est un test d’élite. On dit aussi que les candidats qui échouent disparaissent… chez le voisin.',
    briefEn:
      'Lightning and burns on a loop: a Stormcaller trial. Some call it an elite test. Others say failed candidates vanish… into a rival village.',
    epilogueFr:
      'Tu tiens. Un examinateur note ton nom — puis le raye quand on mentionne ton village.',
    epilogueEn:
      'You hold. An examiner notes your name — then strikes it when your village is mentioned.',
  },
  'toll-hollow-bell': {
    briefFr:
      'Le Gardien de la Cloche Creuse dresse une barrière vivante. Ce n’est plus une rumeur de mercenaire : quelqu’un a payé pour fermer toute une vallée. Trouve qui — en brisant le glas.',
    briefEn:
      'The Hollow Bell Warden raises a living barrier. No longer a mercenary rumor: someone paid to seal a whole valley. Find who — by shattering the toll.',
    epilogueFr:
      'La barrière tombe. Le payeur a utilisé trois messagers — un par village.',
    epilogueEn: 'The barrier falls. The payer used three messengers — one per village.',
  },
  'embercoil-ascent': {
    briefFr:
      'La Matrone Spiralebraise charge ses coups pour “purifier” un avant-poste. Purification = scorcher les preuves d’un échange de techniques entre villages.',
    briefEn:
      'Embercoil Matron winds up blows to “purify” an outpost. Purification means burning evidence of a technique trade between villages.',
    epilogueFr:
      'Les braises s’éteignent. Sous la cendre : un inventaire de jutsu volés. Deux villages y figurent. Pas le tien — officiellement.',
    epilogueEn:
      'Embers die. Under the ash: an inventory of stolen jutsu. Two villages listed. Not yours — officially.',
  },
  'duskblade-challenge': {
    briefFr:
      'Un rônin d’élite frappe fort. On l’appelle Lame-Crépuscule. On l’a vu aux côtés d’archivistes du Voile — ceux qui gardent les preuves du pacte brisé. Survive. Puis fouille.',
    briefEn:
      'An elite ronin hits hard. They call him Duskblade. He’s been seen with Veil archivists — the ones who keep proof of the broken pact. Survive. Then search.',
    epilogueFr:
      'Il chute. Sur lui : une page arrachée. “Le pacte fut rompu à…” — le reste est brûlé.',
    epilogueEn:
      'He falls. On him: a torn page. “The pact was broken at…” — the rest is burned.',
  },
  'veil-archive-breach': {
    briefFr:
      'Les Archives du Voile empilent débuffs et dossiers. Intrusion ordonnée : récupérer ce qui prouve la trahison — ou ce qui accuse le voisin. Selon qui lit ton rapport.',
    briefEn:
      'Veil Archives stack debuffs and dossiers. Ordered breach: recover proof of betrayal — or proof that blames the neighbor. Depends who reads your report.',
    epilogueFr:
      'Tu sors avec un dossier. Ton QG en copie trois versions. Aucune n’est identique.',
    epilogueEn:
      'You leave with a dossier. HQ copies three versions. None match.',
  },
  'orchid-grave-vigil': {
    briefFr:
      'La Voyante Orchidée-Tombe invoque des ombres. Elle a vu le pacte se briser — dit-on. Les trois villages veulent sa langue. Toi, tu veux qu’elle se taise… ou qu’elle parle à *toi*.',
    briefEn:
      'Grave Orchid Seer summons shades. She saw the pact break — so they say. All three villages want her tongue. You want her silent… or speaking to *you*.',
    epilogueFr:
      'Les pétales fanent. Elle murmure un nom de village. Le tien. Ou celui qu’on t’a ordonné d’entendre.',
    epilogueEn:
      'Petals wilt. She whispers a village name. Yours. Or the one you were ordered to hear.',
  },
  'fracturemire-siege': {
    briefFr:
      'Le Colosse Fracturemire empile barrières et éclats. C’est une arme de siège prêtée entre villages — et “oubliée” chez l’ennemi. Brise le prisme avant qu’il ne change de camp.',
    briefEn:
      'Mirrorfracture Colossus stacks barriers and shards. A siege weapon loaned between villages — then “forgotten” on the enemy. Shatter the prism before it switches sides.',
    epilogueFr:
      'Le prisme explose. Les éclats portent trois couleurs. Comme trois bannières.',
    epilogueEn: 'The prism shatters. The shards carry three colors. Like three banners.',
  },
  'voidspire-regency': {
    briefFr:
      'Le Régent de la Flèche-Vide parle au nom d’un Kage qui n’existe plus. Il détient la dernière copie intacte du pacte — ou un faux parfait. Survive à l’éclipse. Puis choisis ce que tu rapportes.',
    briefEn:
      'The Voidspire Regent speaks for a Kage who no longer exists. He holds the last intact pact copy — or a perfect forgery. Survive the eclipse. Then choose what you bring back.',
    epilogueFr:
      'L’éclipse passe. Le document est à toi. Les trois villages enverront quelqu’un le “récupérer”. Prépare-toi.',
    epilogueEn:
      'The eclipse passes. The document is yours. All three villages will send someone to “retrieve” it. Be ready.',
  },
});

export function getMissionChapter(rank) {
  return CHAPTER[rank] || null;
}

export function getMissionLore(slug) {
  return MISSION_LORE[slug] || null;
}

export function attachMissionLore(mission) {
  if (!mission) return null;
  const lore = getMissionLore(mission.slug);
  const chapter = getMissionChapter(mission.rank);
  if (!lore && !chapter) return mission;
  return {
    ...mission,
    chapterFr: chapter?.fr || null,
    chapterEn: chapter?.en || null,
    briefFr: lore?.briefFr || mission.descriptionFr || null,
    briefEn: lore?.briefEn || mission.descriptionEn || null,
    epilogueFr: lore?.epilogueFr || null,
    epilogueEn: lore?.epilogueEn || null,
  };
}
