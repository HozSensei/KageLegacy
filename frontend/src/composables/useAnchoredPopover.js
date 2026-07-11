import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const PANEL_MAX_WIDTH = 352
const VIEWPORT_PADDING = 12
const GAP = 8

/**
 * Positionne un popover en fixed pour qu'il reste entièrement visible dans le viewport.
 * @param {import('vue').Ref<HTMLElement | null>} triggerRef
 * @param {import('vue').Ref<HTMLElement | null>} panelRef
 * @param {import('vue').Ref<boolean>} openRef
 */
export function useAnchoredPopover(triggerRef, panelRef, openRef) {
  const panelStyle = ref({})

  function updatePosition() {
    const trigger = triggerRef.value
    const panel = panelRef.value
    if (!openRef.value || !trigger) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const panelWidth = Math.min(PANEL_MAX_WIDTH, viewportWidth - VIEWPORT_PADDING * 2)

    const triggerRect = trigger.getBoundingClientRect()
    let left = triggerRect.right - panelWidth
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, viewportWidth - panelWidth - VIEWPORT_PADDING)
    )

    let top = triggerRect.bottom + GAP
    const panelHeight = panel?.offsetHeight ?? 320
    const spaceBelow = viewportHeight - top - VIEWPORT_PADDING

    if (panelHeight > spaceBelow) {
      const aboveTop = triggerRect.top - GAP - panelHeight
      if (aboveTop >= VIEWPORT_PADDING) {
        top = aboveTop
      } else {
        top = Math.max(VIEWPORT_PADDING, triggerRect.bottom + GAP)
      }
    }

    const maxHeight = Math.max(120, viewportHeight - top - VIEWPORT_PADDING)

    panelStyle.value = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${panelWidth}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 50,
    }
  }

  watch(openRef, (isOpen) => {
    if (!isOpen) return
    nextTick(() => {
      updatePosition()
      nextTick(updatePosition)
    })
  })

  onMounted(() => {
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
  })

  return { panelStyle, updatePosition }
}
