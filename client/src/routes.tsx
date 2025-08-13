import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// lazy imports for faster imports
const Home = lazy(() => import('./pages/Home'));
const Templates = lazy(() => import('./pages/Templates'));
const Preview = lazy(() => import('./pages/Preview'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CLPreview = lazy(() => import('./pages/CLPreview'));
const CLTemplates = lazy(() => import('./pages/CLTemplates'));
const CLDashboard = lazy(() => import('./pages/CLDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ToS = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
import Footer from './components/Footer';
import ProtectedRoute from '@/components/ProtectedRoute';
import Loader from './components/SuspenseLoader';

const RouteComponent = () => {
  const location = useLocation();

  // Define the paths where the footer should be shown
  const showFooter = !location.pathname.startsWith('/preview') && !location.pathname.startsWith('/cl-preview') && !location.pathname.startsWith('/terms-of-service') && !location.pathname.startsWith('/privacy-policy');

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
          <Route path="*" element={<NotFound />} />
          <Route path="/terms-of-service" element={<ToS />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
      </Suspense>
      {showFooter && <Footer />}
    </>
  );
};

export default RouteComponent;