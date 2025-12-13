import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Ion } from 'cesium'
import App from './App.jsx'
import './App.css'

// Cesium Ion 토큰 설정
Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN || ''

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
