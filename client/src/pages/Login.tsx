import React, { useEffect, useRef } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  // useEffect for auth validation
  useEffect(() => {
    const isAuthenticated = !!Cookies.get('user.id') && !!Cookies.get('user.email');
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  });

  useEffect(() => {
    localStorage.clear();
  });

  // Cleanup function to clear polling interval
  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Handle successful login
  const handleSuccessfulLogin = async (userData: any) => {
    Cookies.set('user.id', userData.id, { secure: true });
    Cookies.set('user.email', userData.email, { secure: true });
    navigate('/dashboard');
  };

  // Listen for messages from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify the origin for security
      if (event.origin !== API_URL) {
        return;
      }

      if (event.data.type === 'LOGIN_SUCCESS') {
        handleSuccessfulLogin(event.data.user);
        if (popupRef.current) {
          popupRef.current.close();
        }
        cleanupPolling();
      } else if (event.data.type === 'LOGIN_ERROR') {
        console.error('Login failed:', event.data.error);
        if (popupRef.current) {
          popupRef.current.close();
        }
        cleanupPolling();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      cleanupPolling();
    };
  }, []);

  const googleLogin = () => {
    // Close any existing popup
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }

    // Open new popup
    popupRef.current = window.open(
      `${API_URL}/auth/google`, // Your backend OAuth URL
      'Google Login', // Window name
      'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
    );

    if (popupRef.current) {
      // Poll to check if popup is closed manually
      pollIntervalRef.current = setInterval(() => {
        if (popupRef.current && popupRef.current.closed) {
          console.log('Popup was closed manually');
          cleanupPolling();
        }
      }, 1000); // Check every second
    }
  };

  const githubLogin = () => {
    // Close any existing popup
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }

    // Open new popup
    popupRef.current = window.open(
      `${API_URL}/auth/github`, // Your backend GitHub OAuth URL
      'GitHub Login', // Window name
      'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
    );

    if (popupRef.current) {
      // Poll to check if popup is closed manually
      pollIntervalRef.current = setInterval(() => {
        if (popupRef.current && popupRef.current.closed) {
          console.log('Popup was closed manually');
          cleanupPolling();
        }
      }, 1000); // Check every second
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-900 dark:bg-white rounded-lg mb-4">
              <img alt='Logo' src='/icon.png' className='w-6 h-6' />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight" style={{ fontFamily: 'Geist, sans-serif', }}>
              Welcome back
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 font-medium" style={{ fontFamily: 'Geist, sans-serif', }}>
              Sign in to your ResumeForge account
            </p>
          </div>

          {/* Login Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-750 dark:hover:text-black transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              onClick={googleLogin}
            >
              <FcGoogle className="text-lg" />
              Continue with Google
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-750 dark:hover:text-black transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              onClick={githubLogin}
            >
              <FaGithub className="text-lg" />
              Continue with GitHub
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to our <a href="/terms-of-service" className="underline">Terms of Service</a> and <a href="/privacy-policy" className="underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;