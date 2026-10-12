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
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from './components/SuspenseLoader';

const RouteComponent = () => {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/preview"
            element={
              <ProtectedRoute>
                <Preview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cl-preview"
            element={
              <ProtectedRoute>
                <CLPreview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cl-templates"
            element={
              <ProtectedRoute>
                <CLTemplates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cl-dashboard"
            element={
              <ProtectedRoute>
                <CLDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ats-scanner"
            element={
              <ProtectedRoute>
                <ATSScanner />
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