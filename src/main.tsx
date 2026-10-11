import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PwaPrompt } from './components/PwaPrompt.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Outside App, so App's tests need no service worker. */}
    <PwaPrompt />
  </StrictMode>,
)
