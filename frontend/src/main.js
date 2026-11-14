import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import './style.css'

const nativeFetch = window.fetch.bind(window)
window.fetch = (input, init = {}) =>
  nativeFetch(input, {
    credentials: 'include',
    ...init,
  })

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
