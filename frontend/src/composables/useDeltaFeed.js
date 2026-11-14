import { onBeforeUnmount, ref, watch } from 'vue'

/**
 * Suit une valeur numérique et expose ses variations récentes pour les retours visuels
 * (chiffres flottants, secousse). Purement local à l'affichage : aucun effet sur les stores.
 */
export function useDeltaFeed(source, { lifetime = 950, hitDuration = 420 } = {}) {
  const deltas = ref([])
  const hit = ref(false)
  const timers = new Set()
  let seq = 0
  let hitTimer = null

  function later(fn, ms) {
    const timer = setTimeout(() => {
      timers.delete(timer)
      fn()
    }, ms)
    timers.add(timer)
    return timer
  }

  watch(source, (next, prev) => {
    if (typeof next !== 'number' || typeof prev !== 'number' || next === prev) return
    const id = ++seq
    deltas.value = [...deltas.value, { id, amount: next - prev }]
    later(() => {
      deltas.value = deltas.value.filter((entry) => entry.id !== id)
    }, lifetime)

    if (next < prev) {
      hit.value = false
      if (hitTimer) clearTimeout(hitTimer)
      requestAnimationFrame(() => {
        hit.value = true
        hitTimer = later(() => {
          hit.value = false
        }, hitDuration)
      })
    }
  })

  onBeforeUnmount(() => {
    timers.forEach(clearTimeout)
    timers.clear()
  })

  return { deltas, hit }
}
