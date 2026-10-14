import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// lazy imports for faster imports
const Home = lazy(() => import('./pages/Home'));
const Templates = lazy(() => import('./pages/Templates'));
const Preview = lazy(() => import('./pages/Preview'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CLPreview = lazy(() => import('./pages/CLPreview'));
const CLTemplates = lazy(() => import('./pages/CLTemplates'));
const CLDashboard = lazy(() => import('./pages/CLDashboard'));
const ATSScanner = lazy(() => import('./pages/ATSScanner'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ToS = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Admin = lazy(() => import('./pages/Admin'));
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from './components/SuspenseLoader';
import MaintenanceGate from '@/components/maintenance/MaintenanceGate';

const RouteComponent = () => {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<MaintenanceGate><Login /></MaintenanceGate>} />
          <Route
            path="/dashboard"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/templates"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <Templates />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/preview"
            element={
              <MaintenanceGate softLock>
                <ProtectedRoute>
                  <Preview />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/cl-preview"
            element={
              <MaintenanceGate softLock>
                <ProtectedRoute>
                  <CLPreview />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/cl-templates"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <CLTemplates />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/cl-dashboard"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <CLDashboard />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/ats-scanner"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <ATSScanner />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
          <Route path="/terms-of-service" element={<ToS />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default RouteComponent;