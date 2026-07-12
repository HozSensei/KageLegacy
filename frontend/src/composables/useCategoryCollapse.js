import { reactive } from 'vue'

export function useCategoryCollapse(keys, defaultCollapsed = false) {
  const collapsed = reactive(
    Object.fromEntries(keys.map((key) => [key, defaultCollapsed]))
  )

  function toggle(key) {
    collapsed[key] = !collapsed[key]
  }

  function isCollapsed(key) {
    return Boolean(collapsed[key])
  }

  return { collapsed, toggle, isCollapsed }
}
