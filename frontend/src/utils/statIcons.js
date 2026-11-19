import taijutsuIcon from '../assets/icons/taijutsu.svg';
import ninjutsuIcon from '../assets/icons/ninjutsu.svg';
import genjutsuIcon from '../assets/icons/genjutsu.svg';
import lifeIcon from '../assets/icons/life.svg';
import chakraIcon from '../assets/icons/chakra.svg';
import armorIcon from '../assets/icons/armor.svg';

export const STAT_VISUALS = Object.freeze({
  taijutsu: { icon: taijutsuIcon, fill: '#d8513d' },
  ninjutsu: { icon: ninjutsuIcon, fill: '#3776af' },
  genjutsu: { icon: genjutsuIcon, fill: '#8653b4' },
  medicine: { icon: lifeIcon, fill: '#408b68' },
  maxHp: { icon: lifeIcon, fill: '#d8513d' },
  maxChakra: { icon: chakraIcon, fill: '#3776af' },
  startingBlock: { icon: armorIcon, fill: '#8c5c3e' },
  armor: { icon: armorIcon, fill: '#8c5c3e' },
});

export function statVisual(key) {
  return STAT_VISUALS[key] || { icon: lifeIcon, fill: 'var(--color-line-strong)' };
}
