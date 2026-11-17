import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { readApiError, parseApiResponse } from '../utils/http.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const profile = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const checked = ref(false);

  const isAuthenticated = computed(() => Boolean(user.value));

  async function fetchMe() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (res.status === 401) {
        user.value = null;
        profile.value = null;
        return false;
      }
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      user.value = data.user;
      profile.value = data.profile;
      return true;
    } catch (e) {
      error.value = e.message;
      user.value = null;
      profile.value = null;
      return false;
    } finally {
      loading.value = false;
      checked.value = true;
    }
  }

  async function login(username, password) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      user.value = body.user;
      profile.value = body.profile;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
      checked.value = true;
    }
  }

  async function register({ email, password, characterName, language }) {
    loading.value = true;
    error.value = null;
    try {
      const payload = { email, password, characterName, language };

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      user.value = body.user;
      profile.value = body.profile;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
      checked.value = true;
    }
  }

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    user.value = null;
    profile.value = null;
    checked.value = true;
  }

  async function loginAsGuest({ characterName, language = 'fr' } = {}) {
    loading.value = true;
    error.value = null;
    try {
      const lang = language === 'en' ? 'en' : 'fr';
      const res = await fetch(`${API_BASE}/api/auth/guest`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName, language: lang }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      user.value = body.user;
      profile.value = body.profile;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
      checked.value = true;
    }
  }

  async function convertGuest({ email, password }) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/convert`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      user.value = body.user;
      profile.value = body.profile;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function changePassword(currentPassword, newPassword) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile/password`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updateEmail(email) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile/email`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email?.trim() || '' }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      user.value = body.user;
      profile.value = body.profile;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updateLanguage(language) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile/language`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      user.value = body.user;
      profile.value = body.profile;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deleteAccount(password) {
    loading.value = true;
    error.value = null;
    try {
      const payload = { confirm: true };
      if (password) payload.password = password;

      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      user.value = null;
      profile.value = null;
      checked.value = true;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    checked,
    isAuthenticated,
    fetchMe,
    login,
    register,
    loginAsGuest,
    convertGuest,
    changePassword,
    updateEmail,
    updateLanguage,
    deleteAccount,
    logout,
  };
});
