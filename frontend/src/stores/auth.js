import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || ''

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const sensei = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const checked = ref(false)

  const isAuthenticated = computed(() => Boolean(user.value))

  async function fetchMe() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      if (res.status === 401) {
        user.value = null
        sensei.value = null
        return false
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Erreur ${res.status}`)
      }
      const data = await res.json()
      user.value = data.user
      sensei.value = data.sensei
      return true
    } catch (e) {
      error.value = e.message
      user.value = null
      sensei.value = null
      return false
    } finally {
      loading.value = false
      checked.value = true
    }
  }

  async function login(username, password) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
      user.value = body.user
      sensei.value = body.sensei
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
      checked.value = true
    }
  }

  async function register({ username, password, senseiName, language }) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, senseiName, language }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Erreur ${res.status}`)
      user.value = body.user
      sensei.value = body.sensei
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
      checked.value = true
    }
  }

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    user.value = null
    sensei.value = null
    checked.value = true
  }

  return {
    user,
    sensei,
    loading,
    error,
    checked,
    isAuthenticated,
    fetchMe,
    login,
    register,
    logout,
  }
})
