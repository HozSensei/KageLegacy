import { onMounted, ref } from 'vue';

export const CARD_ANATOMY_GUIDE_STORAGE_KEY = 'kage.cardAnatomyGuide.v1';

function readSeen() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CARD_ANATOMY_GUIDE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CARD_ANATOMY_GUIDE_STORAGE_KEY, '1');
  } catch {
    /* quota / mode privé : ignore */
  }
}

/**
 * Overlay d’anatomie de carte — une fois par navigateur,
 * au premier affichage collection ou deck.
 */
export function useCardAnatomyGuide({ autoOpen = true } = {}) {
  const open = ref(false);

  function markSeen() {
    writeSeen();
  }

  function dismiss() {
    markSeen();
    open.value = false;
  }

  function reopen() {
    open.value = true;
  }

  onMounted(() => {
    if (autoOpen && !readSeen()) open.value = true;
  });

  return {
    open,
    dismiss,
    reopen,
    markSeen,
    hasSeen: readSeen,
  };
}
