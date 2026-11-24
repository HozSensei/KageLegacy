<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDeltaFeed } from '../../composables/useDeltaFeed.js';
import { factionAccentColor } from '../../constants/factions.js';
import { ninjaCardBackgroundUrl } from '../../constants/ninjaCardBackgrounds.js';
import { ninjaNicknameLabel, safeNinjaProfileColor } from '../../utils/ninjaProfile.js';
import { statVisual } from '../../utils/statIcons.js';
import NinjaPortrait from './NinjaPortrait.vue';
import ProfileCardAura from './ProfileCardAura.vue';
import ProfileFrameOverlay from './ProfileFrameOverlay.vue';

defineOptions({ name: 'NinjaProfileCard' });

const ARTS = ['taijutsu', 'ninjutsu', 'genjutsu', 'medicine'];

const props = defineProps({
  /** `ninja` : carte de personnage ; `enemy` : adversaire PvE (illustration, sans arts ni chakra). */
  variant: {
    type: String,
    default: 'ninja',
    validator: value => ['ninja', 'enemy'].includes(value),
  },
  name: { type: String, required: true },
  rank: { type: String, default: null },
  level: { type: Number, default: null },
  profile: { type: Object, default: null },
  stats: { type: Object, required: true },
  /** Identifiant de village / faction (`midorihara`, `kareno`, `oborohama`). */
  factionId: { type: String, default: null },
  /** Couleur d’accent du village ; à défaut, celle du catalogue local. */
  factionAccent: { type: String, default: null },
  /** Valeurs des quatre arts (`taijutsu`, `ninjutsu`, `genjutsu`, `medicine`). */
  arts: { type: Object, default: null },
  /** Illustration de fond explicite (adversaires PvE). Sinon le profil joueur fournit `backgroundId`. */
  background: { type: String, default: null },
});

const { t, te } = useI18n();
const isNinja = computed(() => props.variant === 'ninja');
const nickname = computed(() => {
  const id = props.profile?.nicknameId;
  return isNinja.value && typeof id === 'string' && id ? ninjaNicknameLabel(id, t, te) : '';
});
const village = computed(() => {
  if (!isNinja.value || !props.factionId) return null;
  const key = `factions.names.${props.factionId}`;
  if (!te(key)) return null;
  return {
    id: props.factionId,
    label: t(key),
    accent: props.factionAccent || factionAccentColor(props.factionId) || undefined,
  };
});
const artEntries = computed(() => {
  if (!isNinja.value || !props.arts) return [];
  if (!ARTS.some(key => Number.isFinite(Number(props.arts[key])))) return [];
  return ARTS.map(key => ({
    key,
    label: t(`cards.stats.${key}`),
    value: Number(props.arts[key]) || 0,
    fill: statVisual(key).fill,
  }));
});
const hasChakra = computed(() => isNinja.value && props.stats.maxChakra != null);
const diamonds = computed(() => {
  const max = Math.max(0, Math.min(12, Number(props.stats.maxChakra) || 0));
  const current = Math.max(0, Number(props.stats.chakra) || 0);
  return Array.from({ length: max }, (_, index) => index < current);
});
const artUrl = computed(
  () => props.background || (isNinja.value ? ninjaCardBackgroundUrl(props.profile?.backgroundId) : null)
);
const solidBackground = computed(() => {
  if (!isNinja.value || artUrl.value) return null;
  return safeNinjaProfileColor(props.profile?.backgroundColor);
});
const armorVisual = computed(() => statVisual('armor'));
const auraPointer = ref({ x: 50, y: 40, active: false });

const style = computed(() => ({
  '--ninja-art': artUrl.value ? `url("${artUrl.value}")` : undefined,
  '--ninja-background': solidBackground.value || undefined,
  '--ninja-text': solidBackground.value ? contrastingText(solidBackground.value) : undefined,
  '--aura-x': `${auraPointer.value.x}%`,
  '--aura-y': `${auraPointer.value.y}%`,
  '--aura-active': auraPointer.value.active ? 1 : 0,
}));

function onAuraMove(event) {
  if (!isNinja.value || !props.profile?.cardEffectId) return;
  if (event.pointerType === 'touch') return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  auraPointer.value = {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
    active: true,
  };
}

function onAuraLeave() {
  auraPointer.value = { ...auraPointer.value, active: false };
}

function contrastingText(hex) {
  const luminance = [0.2126, 0.7152, 0.0722].reduce((total, weight, index) => {
    const start = 1 + index * 2;
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return total + weight * linear;
  }, 0);
  return luminance > 0.179 ? '#000' : '#fff';
}

const hpPercent = computed(() => {
  const { hp, maxHp } = props.stats;
  return maxHp > 0 ? Math.max(0, Math.min(100, (100 * (hp ?? 0)) / maxHp)) : 0;
});
const { deltas, hit } = useDeltaFeed(() => props.stats.hp);
</script>

<template>
  <article
    class="ninja-card"
    :class="[
      `ninja-card--${variant}`,
      {
        'ninja-card--hit': hit,
        'ninja-card--art': artUrl,
        'ninja-card--framed': isNinja && profile?.frameId,
      },
    ]"
    :style="style"
    :aria-label="name"
    data-testid="ninja-profile-card"
    :data-variant="variant"
    :data-avatar-id="isNinja ? profile?.avatarId || undefined : undefined"
    :data-background-id="isNinja ? profile?.backgroundId || undefined : undefined"
    :data-background-color="isNinja ? solidBackground || undefined : undefined"
    @pointermove="onAuraMove"
    @pointerleave="onAuraLeave"
  >
    <ProfileCardAura v-if="isNinja" :card-effect-id="profile?.cardEffectId" />
    <header class="ninja-card__head">
      <div v-if="isNinja" class="ninja-card__portrait">
        <span class="ninja-card__portrait-glow" aria-hidden="true" />
        <div class="ninja-card__portrait-frame">
          <NinjaPortrait :avatar-id="profile?.avatarId" :name="name" />
          <ProfileFrameOverlay :frame-id="profile?.frameId" variant="avatar" />
        </div>
        <span v-if="level != null" class="ninja-card__portrait-level">{{
          t('player.levelLabel', { level })
        }}</span>
      </div>
      <div class="ninja-card__identity">
        <div class="ninja-card__title">
          <h3 class="ninja-card__name">{{ name }}</h3>
          <span v-if="level != null && !isNinja" class="ninja-card__level">{{
            t('player.levelLabel', { level })
          }}</span>
        </div>
        <p v-if="isNinja && rank" class="ninja-card__rank">{{ rank }}</p>
        <p
          v-if="village"
          class="ninja-card__village"
          :style="{ '--village-accent': village.accent }"
          data-testid="ninja-card-village"
        >
          {{ village.label }}
        </p>
        <p v-if="nickname" class="ninja-card__nickname" data-testid="ninja-card-nickname">
          {{ nickname }}
        </p>
      </div>
    </header>

    <ul v-if="artEntries.length" class="ninja-card__arts" data-testid="ninja-card-arts">
      <li
        v-for="art in artEntries"
        :key="art.key"
        class="ninja-card__art"
        :style="{ '--art-fill': art.fill }"
        :data-testid="`ninja-card-art-${art.key}`"
      >
        <strong>{{ art.value }}</strong>
        <span>{{ art.label }}</span>
      </li>
    </ul>

    <section class="ninja-card__vitals">
      <div class="ninja-card__hp">
        <div class="ninja-card__hp-line">
          <p class="ninja-card__hp-value">
            <span data-testid="ninja-card-hp"
              ><span class="ninja-card__hp-now">{{ stats.hp ?? '—' }}</span
              ><span v-if="stats.hp != null && stats.maxHp != null" class="ninja-card__hp-max"
                >/{{ stats.maxHp }}</span
              ></span
            >
            <span class="ninja-card__label">{{ t('combat.hpLabel') }}</span>
          </p>
          <p class="ninja-card__armor" :title="t('combat.blockLabel')">
            <img
              class="ninja-card__armor-icon"
              :src="armorVisual.icon"
              alt=""
              width="22"
              height="22"
              aria-hidden="true"
            />
            <span class="sr-only">{{ t('combat.blockLabel') }}</span>
            <span class="ninja-card__armor-value" data-testid="ninja-card-armor">{{
              stats.armor ?? 0
            }}</span>
          </p>
        </div>
        <div class="ninja-card__meter" aria-hidden="true">
          <span :style="{ width: `${hpPercent}%` }" />
        </div>
        <span
          v-for="entry in deltas"
          :key="entry.id"
          class="ninja-card__delta"
          :class="{ 'ninja-card__delta--loss': entry.amount < 0 }"
          aria-hidden="true"
        >
          {{ entry.amount > 0 ? '+' : '−' }}{{ Math.abs(entry.amount) }}
        </span>
      </div>
    </section>

    <footer v-if="hasChakra || $slots.statuses || $slots.aside" class="ninja-card__foot">
      <div class="ninja-card__foot-main">
        <p v-if="hasChakra" class="ninja-card__chakra">
          <span class="ninja-card__label">{{ t('combat.chakraLabel') }}</span>
          <span class="ninja-card__diamonds" aria-hidden="true">
            <span
              v-for="(filled, index) in diamonds"
              :key="index"
              class="ninja-card__diamond"
              :class="{ 'ninja-card__diamond--on': filled }"
            />
          </span>
          <span class="ninja-card__chakra-value" data-testid="ninja-card-chakra">{{
            stats.chakra != null ? `${stats.chakra}/${stats.maxChakra}` : '—'
          }}</span>
        </p>
        <div v-if="$slots.statuses" class="ninja-card__statuses">
          <p class="ninja-card__label">{{ t('combat.activeStatusLabel') }}</p>
          <slot name="statuses" />
        </div>
      </div>
      <div v-if="$slots.aside" class="ninja-card__aside">
        <slot name="aside" />
      </div>
    </footer>
  </article>
</template>

<style scoped>
.ninja-card {
  --card-line: color-mix(in srgb, currentColor 22%, transparent);
  --card-soft: color-mix(in srgb, currentColor 9%, transparent);

  position: relative;
  display: grid;
  align-content: space-between;
  gap: 0.9rem;
  width: 100%;
  min-width: 0;
  /* Réserve la place du débordement de l'avatar au-dessus de la carte. */
  margin-top: 1.6rem;
  padding: clamp(0.8rem, 2.2vw, 1.15rem);
  container-type: inline-size;
  border: 3px solid var(--ninja-border, #ad503a);
  border-radius: var(--radius-lg);
  background-color: var(--ninja-background, #1d2238);
  color: var(--ninja-text, #fff);
  box-shadow:
    inset 0 0 0 1px rgb(0 0 0 / 0.28),
    0 0.6rem 1.4rem rgb(8 10 24 / 0.22);
}

.ninja-card--enemy {
  --ninja-text: #fff;

  min-height: clamp(17rem, 44vw, 22rem);
  background-color: #1a1220;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.75);
}

.ninja-card--art {
  --ninja-text: #fff;

  background-image:
    linear-gradient(
      to bottom,
      rgb(8 10 22 / 0.35) 0%,
      rgb(8 10 22 / 0.1) 32%,
      rgb(8 10 22 / 0.72) 68%,
      rgb(8 10 22 / 0.92) 100%
    ),
    var(--ninja-art);
  background-position: center;
  background-size: cover;
  text-shadow: 0 1px 3px rgb(0 0 0 / 0.75);
}

.ninja-card--hit {
  animation: shake 380ms ease;
}

.ninja-card__head {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: clamp(0.7rem, 2.4vw, 1.1rem);
}

.ninja-card__vitals,
.ninja-card__arts,
.ninja-card__foot {
  position: relative;
  z-index: 5;
}

.ninja-card__portrait {
  position: relative;
  z-index: 5;
  flex: none;
  width: clamp(5rem, 28cqi, 8rem);
  aspect-ratio: 1;
  /* L'avatar déborde du cadre (haut et gauche) pour casser le rectangle de la carte. */
  margin: -2.4rem 0 0.35rem -1.35rem;
  font-size: clamp(1.75rem, 10cqi, 3rem);
}

.ninja-card__portrait-glow {
  position: absolute;
  pointer-events: none;
}

.ninja-card__portrait-glow {
  inset: -22%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--ninja-border, #ad503a) 65%, transparent) 0%,
    transparent 68%
  );
  animation: portrait-glow 3.2s ease-in-out infinite alternate;
}

.ninja-card__portrait-frame {
  position: relative;
  height: 100%;
  overflow: visible;
  border: 4px solid var(--ninja-background, #1d2238);
  border-radius: 50%;
  box-shadow:
    0 0 0 3px var(--ninja-border, #ad503a),
    0 0.5rem 1rem rgb(0 0 0 / 0.45);
}

.ninja-card__portrait-frame :deep(.ninja-portrait) {
  overflow: hidden;
  border-radius: 50%;
}

.ninja-card__frame {
  z-index: 1;
}

.ninja-card__portrait-level {
  position: absolute;
  bottom: -0.45rem;
  left: 50%;
  padding: 0.1rem 0.6rem;
  border: 2px solid var(--ninja-border, #ad503a);
  border-radius: 999px;
  background: var(--ninja-background, #1d2238);
  color: var(--ninja-text, #fff);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  white-space: nowrap;
  transform: translateX(-50%);
  box-shadow: 0 0.2rem 0.5rem rgb(0 0 0 / 0.4);
}

@keyframes portrait-glow {
  from {
    opacity: 0.45;
    transform: scale(0.92);
  }

  to {
    opacity: 0.9;
    transform: scale(1.06);
  }
}

.ninja-card__identity {
  display: grid;
  flex: 1 1 0;
  min-width: 0;
  gap: 0.25rem;
}

.ninja-card__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.1rem 0.6rem;
}

.ninja-card__name {
  min-width: 0;
  color: inherit;
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 6.5cqi, 2rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.ninja-card--enemy .ninja-card__name {
  font-size: clamp(1.5rem, 8cqi, 2.4rem);
}

.ninja-card__level {
  flex: none;
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--card-line);
  border-radius: 999px;
  background: var(--card-soft);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.ninja-card__rank {
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-gold-fill);
}

.ninja-card__village {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 100%;
  padding-left: 0.55rem;
  border-left: 3px solid var(--village-accent, var(--color-gold-fill));
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  overflow-wrap: anywhere;
}

.ninja-card__nickname {
  font-size: 0.875rem;
  font-style: italic;
  opacity: 0.85;
  overflow-wrap: anywhere;
}

.ninja-card__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.75;
}

.ninja-card__arts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
  list-style: none;
}

.ninja-card__art {
  display: grid;
  justify-items: center;
  gap: 0.1rem;
  min-width: 0;
  padding: 0.4rem 0.15rem 0.45rem;
  border: 1px solid var(--card-line);
  border-top: 3px solid var(--art-fill, currentColor);
  border-radius: var(--radius-md);
  background: var(--card-soft);
  text-align: center;
}

.ninja-card__art strong {
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 5cqi, 1.5rem);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1;
}

.ninja-card__art span {
  max-width: 100%;
  font-size: clamp(0.5625rem, 2.6cqi, 0.6875rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.ninja-card__vitals {
  display: grid;
  min-width: 0;
}

.ninja-card__hp {
  position: relative;
  display: grid;
  gap: 0.4rem;
  padding: 0.55rem 0.75rem 0.7rem;
  border: 1px solid var(--card-line);
  border-radius: var(--radius-md);
  background: rgb(0 0 0 / 0.28);
}

.ninja-card--enemy .ninja-card__hp {
  background: rgb(8 10 22 / 0.55);
  backdrop-filter: blur(3px);
}

.ninja-card__hp-line {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
}

.ninja-card__hp-value {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.ninja-card__hp-now {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 13cqi, 3.5rem);
  font-stretch: 76%;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 0.95;
}

.ninja-card__hp-max {
  font-family: var(--font-display);
  font-size: clamp(1rem, 5cqi, 1.4rem);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  opacity: 0.8;
}

.ninja-card__armor {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.ninja-card__armor-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex: none;
  /* SVG sombre → blanc lisible sur fond uni ou illustration. */
  filter: brightness(0) invert(1) drop-shadow(0 1px 2px rgb(0 0 0 / 0.65));
}

.ninja-card__armor-value {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1;
}

.ninja-card__meter {
  height: 0.6rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.45);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

.ninja-card__meter > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(to right, #a82a1a, var(--color-vermilion) 60%, #f0674c);
  transition: width 520ms var(--ease-out-quint);
}

.ninja-card__foot {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: end;
  gap: 0.75rem;
}

.ninja-card__foot-main,
.ninja-card__aside {
  display: grid;
  align-content: end;
  gap: 0.7rem;
  min-width: 0;
}

.ninja-card__chakra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.6rem;
}

.ninja-card__diamonds {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding-inline: 0.2rem;
}

.ninja-card__diamond {
  width: 0.7rem;
  height: 0.7rem;
  border: 2px solid var(--color-gold-fill);
  transform: rotate(45deg);
  transition: background-color 240ms ease;
}

.ninja-card__diamond--on {
  background: var(--color-gold-fill);
  box-shadow: 0 0 0.5rem color-mix(in srgb, var(--color-gold-fill) 70%, transparent);
}

.ninja-card__chakra-value {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.ninja-card__statuses {
  display: grid;
  justify-items: start;
  gap: 0.35rem;
}

.ninja-card__delta {
  position: absolute;
  right: 0.5rem;
  top: -0.75rem;
  z-index: 1;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-md);
  background: var(--color-leaf-fill);
  color: var(--color-on-leaf);
  font-weight: 800;
  pointer-events: none;
  text-shadow: none;
  animation: float-up 900ms ease-out both;
}

.ninja-card__delta--loss {
  background: var(--color-vermilion);
  color: var(--color-on-fill);
}

@container (min-width: 25rem) {
  .ninja-card__foot {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  }

  .ninja-card__aside {
    justify-items: end;
    text-align: right;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ninja-card--hit,
  .ninja-card__delta,
  .ninja-card__portrait-glow {
    animation: none;
  }

  .ninja-card__meter > span,
  .ninja-card__diamond {
    transition: none;
  }
}
</style>
