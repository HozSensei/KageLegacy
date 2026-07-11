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

export function resolveSegmentText(locale, segment) {
  const code = normalizeLocale(locale);

  if (!segment?.template_key) {
    return segment?.text ?? '';
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
    segment.template_vars || {}
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
