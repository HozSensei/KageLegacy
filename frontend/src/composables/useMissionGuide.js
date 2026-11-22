import { onMounted, ref } from 'vue';

export const MISSION_GUIDE_STORAGE_KEY = 'kage.missionGuide.v1';

function readSeen() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MISSION_GUIDE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSeen() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MISSION_GUIDE_STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Overlay d’explication missions — une fois par navigateur. */
export function useMissionGuide({ autoOpen = true } = {}) {
  const open = ref(false);

  function markSeen() {
    writeSeen();
  }

  function dismiss({ dontShowAgain = true } = {}) {
    if (dontShowAgain) markSeen();
    open.value = false;
  }

  function reopen() {
    open.value = true;
  }

  onMounted(() => {
    if (autoOpen && !readSeen()) open.value = true;
  });

  return { open, dismiss, reopen, markSeen, hasSeen: readSeen };
}
