import { NARRATIVE_CATALOG } from './narrativeCatalog.js';
import { createNarrativeRng } from './narrativeRng.js';

const DEFAULT_LOCALE = 'fr';

export function normalizeLocale(locale) {
  const code = (locale || DEFAULT_LOCALE).toLowerCase().slice(0, 2);
  return NARRATIVE_CATALOG[code] ? code : DEFAULT_LOCALE;
}

export function getCatalog(locale = DEFAULT_LOCALE) {
  return NARRATIVE_CATALOG[normalizeLocale(locale)];
}

export function getPath(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function buildPliImpactLog(log) {
  return {
    degats_pv: Number(log?.degats_pv) || 0,
    degats_pv_away: Number(log?.degats_pv_away) || 0,
    cible_name: log?.cible_name || null,
    cible_name_away: log?.cible_name_away || null,
    soins_pv: Number(log?.soins_pv) || 0,
    soins_pv_away: Number(log?.soins_pv_away) || 0,
    soins_pv_draw_home: Number(log?.soins_pv_draw_home) || 0,
    soins_pv_draw_away: Number(log?.soins_pv_draw_away) || 0,
    soin_inutile: Boolean(log?.soin_inutile),
    soin_inutile_away: Boolean(log?.soin_inutile_away),
    domain_effect_home: log?.domain_effect_home || null,
    domain_effect_away: log?.domain_effect_away || null,
    element_mod_home: log?.element_mod_home || null,
    element_mod_away: log?.element_mod_away || null,
    med_fail: Boolean(log?.med_fail),
    med_fail_away: Boolean(log?.med_fail_away),
  };
}

function formatDomainEffect(effect, lang) {
  if (!effect) return null;
  const labels = {
    fr: {
      tai_bonus_next: 'Taijutsu : +10 % puissance équipe au prochain pli',
      gen_malus_next: 'Genjutsu : −10 % puissance adverse au prochain pli',
    },
    en: {
      tai_bonus_next: 'Taijutsu: +10% team power on the next pli',
      gen_malus_next: 'Genjutsu: −10% opponent power on the next pli',
    },
  };
  return labels[lang]?.[effect] || null;
}

function formatElementMod(mod, lang) {
  if (!mod) return null;
  if (mod === 'advantage') {
    return lang === 'en' ? 'Ninjutsu: elemental advantage' : 'Ninjutsu : avantage élémentaire';
  }
  if (mod === 'disadvantage') {
    return lang === 'en' ? 'Ninjutsu: elemental disadvantage' : 'Ninjutsu : désavantage élémentaire';
  }
  return null;
}

export function formatPliImpactDetail(impactLog, locale = 'fr') {
  const parts = [];
  const lang = locale === 'en' ? 'en' : 'fr';
  const {
    degats_pv: dmg,
    degats_pv_away: dmgAway,
    cible_name: cible,
    cible_name_away: cibleAway,
    soins_pv: heal,
    soins_pv_away: healAway,
    soins_pv_draw_home: healDrawHome,
    soins_pv_draw_away: healDrawAway,
    soin_inutile: healUseless,
    soin_inutile_away: healUselessAway,
    domain_effect_home: domainEffectHome,
    domain_effect_away: domainEffectAway,
    element_mod_home: elementModHome,
    element_mod_away: elementModAway,
    med_fail: medFail,
    med_fail_away: medFailAway,
  } = impactLog || {};

  const pushUnique = (line) => {
    if (line && !parts.includes(line)) parts.push(line);
  };

  if (dmg > 0 && cible) {
    pushUnique(lang === 'en' ? `${dmg} HP dealt to ${cible}` : `${dmg} PV infligés à ${cible}`);
  }
  if (dmgAway > 0 && cibleAway) {
    const awayLine =
      lang === 'en' ? `${dmgAway} HP dealt to ${cibleAway}` : `${dmgAway} PV infligés à ${cibleAway}`;
    if (!(dmg === dmgAway && cible === cibleAway)) {
      pushUnique(awayLine);
    }
  }
  if (heal > 0 && cible) {
    parts.push(lang === 'en' ? `healed ${cible} for ${heal} HP` : `soin de ${heal} PV sur ${cible}`);
  }
  if (healAway > 0 && cibleAway) {
    parts.push(
      lang === 'en' ? `healed ${cibleAway} for ${healAway} HP` : `soin de ${healAway} PV sur ${cibleAway}`,
    );
  }
  if (healDrawHome > 0 && cible) {
    parts.push(
      lang === 'en'
        ? `draw heal of ${healDrawHome} HP on ${cible}`
        : `soin d'égalité de ${healDrawHome} PV sur ${cible}`,
    );
  }
  if (healDrawAway > 0 && cibleAway) {
    parts.push(
      lang === 'en'
        ? `draw heal of ${healDrawAway} HP on ${cibleAway}`
        : `soin d'égalité de ${healDrawAway} PV sur ${cibleAway}`,
    );
  }
  if (healUseless || healUselessAway) {
    pushUnique(lang === 'en' ? 'heal with no wounded target' : 'soin sans cible blessée');
  }
  if (medFail || medFailAway) {
    pushUnique(
      lang === 'en' ? 'Medicine pli failed — damage halved' : 'Médecine en échec — dégâts réduits de moitié',
    );
  }
  const domainHomeLine = formatDomainEffect(domainEffectHome, lang);
  const domainAwayLine = formatDomainEffect(domainEffectAway, lang);
  if (domainHomeLine) pushUnique(domainHomeLine);
  if (domainAwayLine && domainAwayLine !== domainHomeLine) pushUnique(domainAwayLine);
  const elementHomeLine = formatElementMod(elementModHome, lang);
  const elementAwayLine = formatElementMod(elementModAway, lang);
  if (elementHomeLine) pushUnique(elementHomeLine);
  if (elementAwayLine && elementAwayLine !== elementHomeLine) pushUnique(elementAwayLine);
  return parts.length ? parts.join(' · ') : lang === 'en' ? 'no notable effect' : 'aucun effet notable';
}

/** Décompose un libellé de carte deck (« Ninja · Carte » ou « Relais · … »). */
export function parseCardLabel(label) {
  if (!label || label === '—') {
    return { kind: 'unknown', owner: null, cardName: '—', raw: label || '—' };
  }
  const sep = ' · ';
  const idx = label.indexOf(sep);
  if (idx === -1) {
    return { kind: 'unknown', owner: null, cardName: label, raw: label };
  }
  const prefix = label.slice(0, idx);
  const suffix = label.slice(idx + sep.length);
  if (prefix === 'Relais') {
    const isPadding = !suffix || suffix === 'Escouade';
    return {
      kind: isPadding ? 'relais_padding' : 'relais',
      owner: isPadding ? null : suffix,
      cardName: 'Relais',
      raw: label,
    };
  }
  return { kind: 'technique', owner: prefix, cardName: suffix, raw: label };
}

export function fillTemplate(template, vars = {}) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

export function getTemplatePool(locale, keyPath) {
  return getPath(getCatalog(locale), keyPath);
}

export function pickTemplateEntry(locale, keyPath, index, vars = {}) {
  const pool = getTemplatePool(locale, keyPath);
  if (Array.isArray(pool)) {
    const template = pool[index] ?? pool[0] ?? '';
    return fillTemplate(template, vars);
  }
  if (typeof pool === 'string') {
    return fillTemplate(pool, vars);
  }
  return '';
}

export function pickFromPool(locale, keyPath, rng, vars = {}) {
  const pool = getTemplatePool(locale, keyPath);
  if (!Array.isArray(pool) || !pool.length) {
    return { key: keyPath, index: 0, text: fillTemplate(typeof pool === 'string' ? pool : '', vars) };
  }
  const index = rng.nextInt(pool.length);
  return {
    key: keyPath,
    index,
    text: fillTemplate(pool[index], vars),
  };
}

export function teamLabel(locale, senseiName) {
  return pickTemplateEntry(locale, 'chronicle.teamLabel', 0, { sensei_name: senseiName });
}

function resolveTourPart(locale, part) {
  const action = pickTemplateEntry(locale, part.action_key, part.action_index, part.vars);
  if (!part.reaction_key) return action;
  const reaction = pickTemplateEntry(locale, part.reaction_key, part.reaction_index, part.vars);
  return `${action} ${reaction}`;
}

function resolvePliPart(locale, part, impactLog) {
  const vars = {
    ...(part.vars || {}),
    impact_detail: formatPliImpactDetail(impactLog || part.vars?.impact_log, locale),
    winner_team:
      part.vars?.winner_team && part.vars?.sensei
        ? teamLabel(locale, part.vars.sensei)
        : part.vars?.winner_team,
  };
  return pickTemplateEntry(locale, part.action_key, part.action_index, vars);
}

export function resolveSegmentText(locale, segment) {
  const code = normalizeLocale(locale);

  if (!segment?.template_key) {
    return segment?.text ?? '';
  }

  if (segment.template_key === 'chronicle.pli.combatOpen') {
    return pickTemplateEntry(code, 'chronicle.pli.combatOpen', 0, {
      total_plis: segment.template_vars?.total_plis,
    });
  }

  if (segment.template_key === 'chronicle.pli') {
    const vars = segment.template_vars || {};
    const impactLog = vars.impact_log;
    return (vars.parts || []).map((part) => resolvePliPart(code, part, impactLog)).join('\n');
  }

  if (segment.template_key === 'chronicle.tour') {
    const vars = segment.template_vars || {};
    const connector =
      vars.connector_key === 'chronicle.combatOpen'
        ? pickTemplateEntry(code, 'chronicle.combatOpen', 0)
        : pickTemplateEntry(code, vars.connector_key, vars.connector_index, {
            home_sensei: vars.home_sensei,
            away_sensei: vars.away_sensei,
          });
    const body = (vars.parts || []).map((part) => resolveTourPart(code, part)).join(' ');
    const momentum = vars.momentum_key
      ? pickTemplateEntry(code, vars.momentum_key, vars.momentum_index, {
          sensei: vars.momentum_sensei,
          home_sensei: vars.home_sensei,
          away_sensei: vars.away_sensei,
        })
      : '';
    return `${connector} ${body} ${momentum}`.trim();
  }

  if (segment.template_key === 'chronicle.tension') {
    const vars = segment.template_vars || {};
    const transition = pickTemplateEntry(code, vars.transition_key, vars.transition_index);
    return pickTemplateEntry(code, 'chronicle.tension', 0, { transition });
  }

  if (segment.template_key === 'chronicle.intro') {
    const vars = segment.template_vars || {};
    const terrain = pickTemplateEntry(code, 'terrains', vars.terrain_index ?? 0);
    const atmosphere =
      getPath(getCatalog(code), `environment.${vars.environment_slug}`)?.atmosphere || '';
    return pickTemplateEntry(code, 'chronicle.intro', 0, {
      terrain_setting: terrain,
      terrain_atmosphere: atmosphere,
      home_team: teamLabel(code, vars.home_sensei),
      away_team: teamLabel(code, vars.away_sensei),
      home_names: vars.home_names,
      away_names: vars.away_names,
    });
  }

  if (segment.template_key.startsWith('chronicle.denouement.')) {
    const suffix = segment.template_key.split('.').pop();
    const vars = segment.template_vars || {};
    if (suffix === 'draw') {
      return pickTemplateEntry(code, `chronicle.denouement.${suffix}`, 0, {
        home_team: teamLabel(code, vars.home_sensei),
        away_team: teamLabel(code, vars.away_sensei),
        ending_tour: vars.ending_tour,
        home_score_pct: vars.home_score_pct,
        away_score_pct: vars.away_score_pct,
        home_plis_won: vars.home_plis_won,
        away_plis_won: vars.away_plis_won,
        home_possession_pct: vars.home_possession_pct,
        away_possession_pct: vars.away_possession_pct,
        ko_sentence: vars.ko_sentence,
      });
    }
    return pickTemplateEntry(code, `chronicle.denouement.${suffix}`, 0, {
      winner_team: teamLabel(code, vars.winner_sensei),
      loser_team: teamLabel(code, vars.loser_sensei),
      ending_tour: vars.ending_tour,
      winner_score_pct: vars.winner_score_pct,
      loser_score_pct: vars.loser_score_pct,
      winner_possession_pct: vars.winner_possession_pct,
      loser_possession_pct: vars.loser_possession_pct,
      winner_plis_won: vars.winner_plis_won,
      loser_plis_won: vars.loser_plis_won,
      ko_sentence: vars.ko_sentence,
    });
  }

  if (segment.template_key === 'chronicle.epilogue') {
    return pickTemplateEntry(code, 'chronicle.epilogue', segment.template_index ?? 0);
  }

  if (segment.template_key.startsWith('mission.')) {
    return pickTemplateEntry(code, segment.template_key, segment.template_index ?? 0, segment.template_vars || {});
  }

  return segment.text ?? pickTemplateEntry(
    code,
    segment.template_key,
    segment.template_index ?? 0,
    segment.template_vars || {},
  );
}

export function resolveSegments(locale, segments) {
  return segments.map((segment) => ({
    ...segment,
    text: resolveSegmentText(locale, segment),
  }));
}

export function createSegmentFromPick({ block_type, unlock_minutes, segment_order, pickResult, template_vars }) {
  return {
    segment_order,
    block_type,
    unlock_minutes,
    template_key: pickResult.key,
    template_index: pickResult.index,
    template_vars: template_vars ?? null,
    text: pickResult.text,
  };
}

export function buildTerrainIntroVars(environmentSlug, rng) {
  const terrainPick = pickFromPool(DEFAULT_LOCALE, 'terrains', rng);
  return {
    terrain_index: terrainPick.index,
    environment_slug: environmentSlug,
  };
}

export { createNarrativeRng };
