import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ProposalProvider } from './context/ProposalContext.jsx'
import { ResumeProvider } from './context/ResumeContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { ToastProvider } from './components/Toast.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <ProposalProvider>
          <ResumeProvider>
            <App />
          </ResumeProvider>
        </ProposalProvider>
      </DataProvider>
    </ToastProvider>
  </StrictMode>,
)
