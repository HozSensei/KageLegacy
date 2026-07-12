import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

export function useToast() {
  function push({ title, body, kind = 'info', durationMs = 6000 }) {
    const id = nextId++
    toasts.value.push({ id, title, body, kind })
    if (durationMs > 0) {
      window.setTimeout(() => dismiss(id), durationMs)
    }
    return id
  }

  function dismiss(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { toasts, push, dismiss }
}
