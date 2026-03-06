import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { DriverView } from './components/mobile/DriverView.tsx'
import { DriverApp } from './components/mobile/DriverApp.tsx'
import { MainLayout } from './components/layout/MainLayout.tsx'
import { VehiclesPage } from './components/pages/VehiclesPage.tsx'
import { DriversPage } from './components/pages/DriversPage.tsx'
import { CustomersPage } from './components/pages/CustomersPage'

import { DeliveryNotesPage } from './components/pages/DeliveryNotesPage.tsx'
import { InvoicesPage } from './components/pages/InvoicesPage.tsx'
import { SystemConfigPage } from './components/pages/SystemConfigPage.tsx'
import { RouteOptimizationPage } from './components/pages/RouteOptimizationPage.tsx'

import { DriverPlanningPage } from './components/pages/DriverPlanningPage.tsx'
import AIPromptsPage from './components/pages/AIPromptsPage.tsx'
import { InstructionsPage } from './components/pages/InstructionsPage.tsx'


import { StradaPage } from './components/pages/StradaPage.tsx'

import { LoginDriver } from './components/pages/LoginDriver.tsx'
import { LoginAdmin } from './components/pages/LoginAdmin.tsx'
import { GlobalProvider } from './context/GlobalContext.tsx'
import { DragProvider } from './context/DragContext.tsx'
import { SyncProvider } from './context/SyncContext.tsx'

import { GoogleMapsLoader } from './components/providers/GoogleMapsLoader.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

import { PresupuestosPage } from './components/pages/PresupuestosPage.tsx'

import { ProductsPage } from './components/pages/ProductsPage.tsx'

const RequireAuth = ({ children, role }: { children: any, role: 'admin' | 'driver' }) => {
  const token = role === 'admin'
    ? localStorage.getItem('admin_token')
    : localStorage.getItem('driver_token');

  if (!token) {
    return <Navigate to={role === 'admin' ? "/login/admin" : "/login/driver"} replace />;
  }
  return children;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleMapsLoader>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <DragProvider>
          <GlobalProvider>
            <SyncProvider>
              <BrowserRouter>
                <Routes>
                  {/* Login Routes */}
                  <Route path="/login/driver" element={<LoginDriver />} />
                  <Route path="/login/admin" element={<LoginAdmin />} />

                  {/* Main Dashboard Layout (Protected Admin) */}
                  <Route element={<RequireAuth role="admin"><MainLayout /></RequireAuth>}>
                    <Route path="/" element={<InstructionsPage />} />
                    <Route path="/orders" element={<App />} />
                    <Route path="/trabajadores" element={<DriversPage />} />
                    <Route path="/vehiculos" element={<VehiclesPage />} />
                    <Route path="/clientes" element={<CustomersPage />} />
                    <Route path="/presupuestos" element={<PresupuestosPage />} />
                    <Route path="/productos" element={<ProductsPage />} />

                    <Route path="/albaranes" element={<DeliveryNotesPage />} />
                    <Route path="/invoices" element={<InvoicesPage />} />
                    <Route path="/system" element={<SystemConfigPage />} />
                    <Route path="/routes" element={<RouteOptimizationPage />} />
                    <Route path="/map" element={<Navigate to="/strada" replace />} />
                    <Route path="/strada" element={<StradaPage />} />
                    <Route path="/planning-drivers" element={<DriverPlanningPage />} />
                    <Route path="/ai-prompts" element={<AIPromptsPage />} />
                  </Route>

                  {/* Standalone Pages */}
                  <Route path="/mobile/driver-view" element={<DriverView />} /> {/* Legacy */}
                  <Route path="/driver-app" element={<RequireAuth role="driver"><DriverApp /></RequireAuth>} />
                </Routes>
              </BrowserRouter>
            </SyncProvider>
          </GlobalProvider>
        </DragProvider>
      </GoogleOAuthProvider>
    </GoogleMapsLoader>
  </StrictMode>,
)
