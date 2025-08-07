import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ProposalProvider } from './context/ProposalContext.jsx'
import { ResumeProvider } from './context/ResumeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProposalProvider>
      <ResumeProvider>
        <App />
      </ResumeProvider>
    </ProposalProvider>
  </StrictMode>,
)
