import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initializeAuth } from './services/auth.js'

await initializeAuth()
createApp(App).mount('#app')
