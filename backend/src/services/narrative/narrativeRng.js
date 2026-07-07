/**
 * Générateur pseudo-aléatoire déterministe par match / mission.
 * Même seed → mêmes tirages (debug QA), seeds différentes → variété entre matchs.
 */
export function createNarrativeRng(seed, salt = 0) {
  let state = (Number(seed) * 2654435761 + Number(salt) * 1597334677) >>> 0;
  if (state === 0) state = 1;

  return {
    next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    },
    nextInt(max) {
      if (max <= 0) return 0;
      return Math.floor(this.next() * max);
    },
    fork(extraSalt) {
      return createNarrativeRng(seed, salt + extraSalt);
    },
  };
}
