<script setup>
import { useI18n } from 'vue-i18n'
import AppIcon from '../ui/AppIcon.vue'
defineOptions({ name: 'AchievementList' })
defineProps({ achievements:{ type:Array, default:()=>[] }, locale:{ type:String, default:'fr' }, busy:{ type:Boolean, default:false } })
const emit = defineEmits(['claim'])
const { t } = useI18n()
function nameOf(a, loc){ return loc==='en' ? a.nameEn||a.nameFr : a.nameFr||a.nameEn }
function descOf(tier, loc){ return loc==='en' ? tier.descriptionEn||tier.descriptionFr : tier.descriptionFr||tier.descriptionEn }
function pct(a){ const goal=Math.max(1,a.currentGoal||1); return Math.min(100, Math.round(((a.progress||0)/goal)*100)) }
function rewardLabel(reward){
  const n=reward.amount||0
  if(reward.type==='ryos') return t('achievements.reward.ryos',{n})
  if(reward.type==='dust') return t('achievements.reward.dust',{n})
  if(reward.type==='essence') return t('achievements.reward.essence',{n})
  if(reward.type==='xp') return t('achievements.reward.xp',{n})
  return reward.type
}
</script>
<template>
  <ul class="ach-list" data-testid="achievement-list">
    <li v-for="a in achievements" :key="a.key" class="ach-item" :class="{ 'ach-item--unlocked': a.unlocked, 'ach-item--claimable': a.claimableCount > 0 }" :data-testid="`achievement-${a.key}`">
      <p class="ach-item__name"><AppIcon :name="a.unlocked ? 'verified' : 'lock'" size="1rem" :stroke-width="2" /> {{ nameOf(a, locale) }}</p>
      <p class="ach-item__meta">{{ t('achievements.progress', { current: a.progress, goal: a.currentGoal }) }} <span class="ach-item__cat">{{ t(`achievements.categories.${a.category}`) }}</span></p>
      <div class="meter meter--thin" aria-hidden="true"><span class="meter__fill" :style="{ width: `${pct(a)}%` }" /></div>
      <ol class="ach-tiers">
        <li v-for="tier in a.tiers" :key="tier.tier" class="ach-tier" :class="{ 'ach-tier--claimable': tier.claimable }">
          <div>
            <p class="ach-tier__desc">{{ descOf(tier, locale) }}</p>
            <p class="ach-tier__rewards"><span v-for="(r,i) in tier.rewards" :key="i" class="badge">{{ rewardLabel(r) }}</span></p>
          </div>
          <button v-if="tier.claimable" type="button" class="btn-primary btn-sm" :disabled="busy" :data-testid="`claim-ach-${a.key}-${tier.tier}`" @click="emit('claim', { key: a.key, tier: tier.tier })">{{ t('achievements.claim') }}</button>
          <span v-else-if="tier.claimed" class="ach-tier__done"><AppIcon name="check" size="0.9rem" :stroke-width="2.5" /> {{ t('achievements.claimed') }}</span>
          <span v-else class="ach-tier__locked">{{ t('achievements.locked') }}</span>
        </li>
      </ol>
    </li>
  </ul>
</template>
<style scoped>
.ach-list{list-style:none;margin:1rem 0 0;padding:0;display:flex;flex-direction:column;gap:1.25rem}
.ach-item{padding:1rem 0 1.25rem;border-bottom:1px solid color-mix(in srgb,var(--ink) 10%,transparent)}
.ach-item__name{display:flex;align-items:center;gap:.45rem;margin:0;font-family:var(--font-display);font-size:1.2rem}
.ach-item__meta{margin:.25rem 0 .65rem;font-size:.875rem;color:var(--ink-muted)}
.ach-item__cat{text-transform:uppercase;letter-spacing:.05em;font-size:.7rem;margin-left:.75rem}
.ach-tiers{list-style:none;margin:.75rem 0 0;padding:0;display:flex;flex-direction:column;gap:.5rem}
.ach-tier{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.5rem 0}
.ach-tier__desc{margin:0;font-size:.9rem}
.ach-tier__rewards{margin:.25rem 0 0;display:flex;flex-wrap:wrap;gap:.35rem}
.ach-tier__done,.ach-tier__locked{font-size:.8125rem;color:var(--ink-muted);white-space:nowrap}
.ach-item--claimable .ach-item__name{color:var(--tone-leaf,#3d6b4f)}
</style>
