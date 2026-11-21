import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/nunito'
import { applyTheme } from './theme'
import './styles/app.css'
import App from './app/App'

applyTheme()

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
