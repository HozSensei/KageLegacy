<script setup>
import { computed } from 'vue'

defineOptions({ name: 'AppIcon' })

const props = defineProps({
  name: { type: String, required: true },
  size: { type: String, default: '1.25rem' },
  strokeWidth: { type: Number, default: 1.75 },
})

/*
 * Glyphes géométriques (grille 24×24). Chaque entrée est une liste de tracés ;
 * `f: true` remplit le tracé au lieu de le contourner.
 */
const ICONS = {
  // Navigation
  hub: [{ d: 'M12 2.5 21.5 12 12 21.5 2.5 12Z' }, { d: 'M12 8 16 12 12 16 8 12Z', f: true }],
  profile: [{ d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z' }, { d: 'M4 21c0-3.9 3.6-6 8-6s8 2.1 8 6' }],
  talents: [
    { d: 'M12 7.5v4.5M12 12l-5.5 5M12 12l5.5 5' },
    { d: 'M12 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', f: true },
    { d: 'M5.5 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' },
    { d: 'M18.5 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' },
  ],
  collection: [
    { d: 'M3.5 3.5h7v7h-7Z', f: true },
    { d: 'M13.5 3.5h7v7h-7ZM3.5 13.5h7v7h-7ZM13.5 13.5h7v7h-7Z' },
  ],
  decks: [{ d: 'M8 3.5h12v14H8Z' }, { d: 'M4 7.5v13h11' }],
  shop: [{ d: 'M9 3h6M12 3v3M12 18v3' }, { d: 'M7 6h10l1.5 6L17 18H7l-1.5-6Z' }, { d: 'M12 10 14 12 12 14 10 12Z', f: true }],
  missions: [{ d: 'M5 21.5V3' }, { d: 'M5 4h13l-3.5 4.5L18 13H5Z', f: true }],
  'battle-pass': [{ d: 'M3.5 20.5v-6h5.5v-5h5.5v-5h6v16Z' }, { d: 'M14.5 4.5h6v16h-6Z', f: true }],
  journal: [{ d: 'M5 3.5h11l3 3v14H5Z' }, { d: 'M8.5 9h7M8.5 12.5h7M8.5 16h5' }],
  pvp: [{ d: 'M3 5.5 10.5 12 3 18.5Z', f: true }, { d: 'M21 5.5 13.5 12 21 18.5Z' }],
  leaderboard: [
    { d: 'M4 20.5h16' },
    { d: 'M6.5 20.5V11h3.5v9.5Z', f: true },
    { d: 'M10.5 20.5V6h3.5v14.5Z' },
    { d: 'M14.5 20.5V13h3.5v7.5Z', f: true },
  ],
  'elite-tools': [{ d: 'M12 2.5 21.5 12 12 21.5 2.5 12Z' }, { d: 'M8.5 12.2 11 14.7 15.5 9.5' }],
  admin: [{ d: 'M4 4h16v16H4Z' }, { d: 'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', f: true }],
  rules: [{ d: 'M5 3.5h11l3 3v14H5Z' }, { d: 'M8.5 9h7M8.5 12.5h7M8.5 16h4' }],

  // Interface
  menu: [{ d: 'M4 7h16M4 12h10M4 17h16' }],
  close: [{ d: 'M6 6l12 12M18 6 6 18' }],
  bell: [{ d: 'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4Z' }, { d: 'M10 21.5h4' }],
  check: [{ d: 'M5 12.5 10 17.5 19 7' }],
  sun: [
    { d: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', f: true },
    { d: 'M12 2.5v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800' },
  ],
  moon: [{ d: 'M20 14.200A8.500 8.500 0 1 1 9.800 4a6.800 6.800 0 0 0 10.200 10.200Z', f: true }],
  lock: [{ d: 'M5.5 10.5h13v10h-13Z' }, { d: 'M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3' }],
  'arrow-right': [{ d: 'M4 12h15M13.5 6.5 19 12l-5.5 5.5' }],
  'arrow-left': [{ d: 'M20 12H5M10.5 6.5 5 12l5.5 5.5' }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  minus: [{ d: 'M5 12h14' }],
  target: [{ d: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' }, { d: 'M12 2v5M12 17v5M2 12h5M17 12h5' }],
  verified: [{ d: 'M12 2.5 21.5 12 12 21.5 2.5 12Z', f: true }],
  store: [{ d: 'M4 10.5V20h16v-9.5' }, { d: 'M3 10.5 5 4h14l2 6.5Z' }, { d: 'M10 20v-5h4v5' }],
  sync: [{ d: 'M19.5 9A8 8 0 0 0 5 8.5M4.500 15A8 8 0 0 0 19 15.5' }, { d: 'M5 4v4.500h4.500M19 20v-4.500h-4.500' }],

  // Monnaies
  ryos: [{ d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z' }, { d: 'M9.5 9.5h5v5h-5Z' }],
  coins: [{ d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z' }, { d: 'M12 7.500 16.500 12 12 16.500 7.500 12Z', f: true }],

  // Types de carte
  attack: [{ d: 'M12 3 21.5 20h-19Z', f: true }],
  defense: [{ d: 'M4 4h16v16H4Z', f: true }],
  skill: [{ d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', f: true }],
  summon: [{ d: 'M12 2.500 20.500 7.250v9.500L12 21.500 3.500 16.750v-9.500Z', f: true }],
  item: [{ d: 'M12 2.500 21.500 12 12 21.500 2.500 12Z', f: true }],

  // Intentions adverses
  defend: [{ d: 'M4.500 4h15v8.500c0 4-3.200 6.700-7.500 8-4.300-1.300-7.500-4-7.500-8Z' }],
  buff: [{ d: 'M5 13.500 12 6.500l7 7M5 19.500l7-7 7 7' }],
  debuff: [{ d: 'M5 4.500l7 7 7-7M5 10.500l7 7 7-7' }],
  special: [{ d: 'M12 2 14.600 9.400 22 12l-7.400 2.600L12 22l-2.600-7.400L2 12l7.400-2.600Z', f: true }],
  unknown: [{ d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z' }, { d: 'M12 13.500a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3Z', f: true }],

  // Statuts de combat
  force: [{ d: 'M12 4 20 18H4Z' }, { d: 'M12 10.500 15 16H9Z', f: true }],
  dexterity: [{ d: 'M12 3 21 12 12 21 3 12Z' }, { d: 'M12 3v18' }],
  regen: [{ d: 'M12 5v14M5 12h14' }, { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z' }],
  poison: [{ d: 'M12 3c3 4.500 6 7.700 6 11.200a6 6 0 0 1-12 0C6 10.700 9 7.500 12 3Z', f: true }],
  burn: [{ d: 'M12 2.500c.800 3.800 5.500 5.700 5.500 11a5.500 5.500 0 0 1-11 0c0-2.300 1.100-3.700 2.200-4.800.300 1.700 1 2.600 1.900 3C10.300 9 10.600 5.500 12 2.500Z', f: true }],
  weak: [{ d: 'M5 8.500l7 7 7-7' }],
  vulnerable: [{ d: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' }, { d: 'M12 2v5M12 17v5M2 12h5M17 12h5' }],
  intangible: [{ d: 'M12 20.500a8.500 8.500 0 1 0 0-17 8.500 8.500 0 0 0 0 17Z', dash: '3 3.500' }],
  evade: [{ d: 'M4 6.500 9.500 12 4 17.500M12 6.500 17.500 12 12 17.500' }],
  counter: [{ d: 'M9 13.500 4 8.500l5-5' }, { d: 'M4 8.500h10.500a5.500 5.500 0 0 1 0 11H11' }],
  block: [{ d: 'M5 5h14v14H5Z', f: true }],
}

const paths = computed(() => ICONS[props.name] || ICONS.unknown)
</script>

<template>
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    :style="{ width: size, height: size }"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(p, i) in paths"
      :key="i"
      :d="p.d"
      :fill="p.f ? 'currentColor' : 'none'"
      stroke="currentColor"
      :stroke-width="strokeWidth"
      :stroke-dasharray="p.dash || undefined"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.app-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
</style>
