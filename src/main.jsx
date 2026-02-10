import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'
import './index.css'

// Check session on app load
useAuthStore.getState().checkSession()

// Initialize theme on app load
useSettingsStore.getState().initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)