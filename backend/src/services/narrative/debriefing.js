import { pick, SUSPENSE_LINES } from './phraseDictionary.js';

const INITIATIVE_THRESHOLD = 35;
const ELEMENT_WEAKNESS_THRESHOLD = 3;
const CHAKRA_KO_THRESHOLD = 2;

function userSide(match, userId) {
  if (match.home_user_id === userId) return 'home';
  if (match.away_user_id === userId) return 'away';
  return null;
}

/**
 * Génère jusqu'à 3 alertes pédagogiques à partir du combat_log (ton analytique).
 */
export function buildDebriefing(match, userId, combatLog) {
  if (!combatLog) return [];

  const side = userSide(match, userId);
  if (!side) return [];

  const alerts = [];
  const possession = combatLog.possession || {};
  const myPct = side === 'home' ? possession.homePct : possession.awayPct;

  if (myPct !== undefined && myPct < INITIATIVE_THRESHOLD) {
    alerts.push({
      code: 'initiative',
      text:
        '🚩 Votre escouade a subi le rythme du match. Vos ninjas manquent cruellement de Vitesse ou d\'Intelligence par rapport à l\'adversaire. Priorisez l\'entraînement de la Vitesse au prochain cycle.',
    });
  }

  const logs = combatLog.logs || [];
  let elementalHits = 0;
  for (const log of logs) {
    const attackingAway = log.equipe_attaque === 'away';
    const attackingHome = log.equipe_attaque === 'home';
    const hurtsMe =
      (side === 'home' && attackingAway) || (side === 'away' && attackingHome);
    if (hurtsMe && log.technique_type === 'Ninjutsu' && log.degats_pv > 0) {
      elementalHits += 1;
    }
  }

  if (elementalHits > ELEMENT_WEAKNESS_THRESHOLD) {
    alerts.push({
      code: 'element',
      text:
        '🚩 L\'adversaire a exploité vos faiblesses élémentaires à plusieurs reprises. Pensez à renforcer votre composition ou vos protections au prochain cycle.',
    });
  }

  const koOnSide = (combatLog.koNinjaIds || []).filter((k) => k.side === side);
  if (koOnSide.length >= CHAKRA_KO_THRESHOLD) {
    alerts.push({
      code: 'chakra',
      text:
        '🚩 Plusieurs de vos ninjas ont été mis hors de combat. Améliorez leur réserve de Chakra, ajustez les consignes, ou recrutez un soutien médical.',
    });
  }

  const summary = combatLog.equipmentSummary || [];
  const slugLabels = {
    'fumigene': 'fumigène',
    'parchemin-rupture': 'parchemin de rupture',
    'leurre': 'leurre',
    'herbes-medicinales': 'herbes médicinales',
    'cachet-chakra': 'cachet de chakra',
  };

  for (const entry of summary) {
    if (entry.side !== side) continue;
    const unused = entry.equippedSlugs.filter((s) => !entry.consumedSlugs.includes(s));
    if (!unused.length) continue;
    const labels = unused.map((s) => slugLabels[s] || s).join(', ');
    alerts.push({
      code: 'item_unused',
      text: `🚩 ${entry.ninjaName} avait équipé ${labels} mais ne l'a jamais déclenché — vérifiez la consigne ou le matchup.`,
    });
  }

  return alerts.slice(0, 3);
}

export function pickSuspenseLine() {
  return pick(SUSPENSE_LINES);
}
