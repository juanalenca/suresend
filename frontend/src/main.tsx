import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Contacts } from './pages/Contacts'
import { Campaigns } from './pages/Campaigns'
import NewCampaign from './pages/campaigns/NewCampaign'
import CampaignProgress from './pages/campaigns/CampaignProgress'
import { Settings } from './pages/Settings'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Unsubscribe } from './pages/Unsubscribe'
import './lib/i18n'
import './index.css'

import { AuthProvider } from './context/AuthContext'
import { Toaster } from "@/components/ui/toaster"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes Wrapper */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<App />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/new" element={<NewCampaign />} />
              <Route path="/campaigns/:id/progress" element={<CampaignProgress />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          <Route path="/unsubscribe" element={<Unsubscribe />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)