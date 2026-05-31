import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'
import { startNtfyBrowserNotifications } from './lib/ntfyNotifications'

registerSW({ immediate: true })
const stopNtfyNotifications = startNtfyBrowserNotifications()


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopNtfyNotifications()
  })
}
