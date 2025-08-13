import Cookies from 'js-cookie';
import React from 'react';
import { Navigate } from 'react-router-dom';

// You can replace this with your actual auth check logic
const isAuthenticated = () => {
  // Example: check if user data exists in localStorage or context
  // Or make an API call to /api/me or /api/session
  return !!Cookies.get('user.id') && !!Cookies.get('user.email'); // Replace with real logic
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;