import React, { useEffect, useRef, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

type Provider = 'google' | 'github';

const PROVIDER_LABEL: Record<Provider, string> = { google: 'Google', github: 'GitHub' };

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Static, decorative resume sheet for the brand panel. Pure markup, no assets. */
const ResumeSheet: React.FC = () => (
  <div
    aria-hidden="true"
    className="relative w-full max-w-sm rounded-lg bg-zinc-50 p-7 text-zinc-900 shadow-2xl shadow-black/40 ring-1 ring-white/10"
  >
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="h-3.5 w-36 rounded-sm bg-zinc-800" />
        <div className="h-2 w-24 rounded-sm bg-zinc-400" />
      </div>
      <div className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[0.6875rem] font-medium text-zinc-700">
        <Check className="size-3" />
        ATS-friendly
      </div>
    </div>

    {[
      ['w-16', ['w-full', 'w-11/12', 'w-4/5']],
      ['w-20', ['w-full', 'w-10/12', 'w-full', 'w-3/5']],
      ['w-14', ['w-9/12', 'w-2/3']],
    ].map(([heading, lines], i) => (
      <div key={i} className="mb-5 last:mb-0">
        <div className={`mb-2.5 h-2 rounded-sm bg-zinc-700 ${heading}`} />
        <div className="space-y-1.5 border-t border-zinc-200 pt-2.5">
          {(lines as string[]).map((w, j) => (
            <div key={j} className={`h-1.5 rounded-sm bg-zinc-300 ${w}`} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const Login: React.FC = () => {
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // useEffect for auth validation
  useEffect(() => {
    const isAuthenticated = !!Cookies.get('user.id') && !!Cookies.get('user.email');
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  });

  // Clear stale data once on arrival (not on every render, which would also
  // wipe the theme preference the toggle on this page just saved).
  useEffect(() => {
    localStorage.clear();
  }, []);

  // Cleanup function to clear polling interval
  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPending(null);
  };

  // Handle successful login
  const handleSuccessfulLogin = async (userData: { id: string; email: string }) => {
    // Secure cookies require HTTPS; on local http dev they'd be silently dropped.
    Cookies.set('user.id', userData.id, { secure: import.meta.env.PROD });
    Cookies.set('user.email', userData.email, { secure: import.meta.env.PROD });
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
        setError('Sign-in did not complete. Please try again.');
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      cleanupPolling();
    };
  }, []);

  const signIn = (provider: Provider) => {
    // Close any existing popup
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    cleanupPolling();
    setError(null);

    // Open new popup
    popupRef.current = window.open(
      `${API_URL}/auth/${provider}`, // Backend OAuth URL
      `${PROVIDER_LABEL[provider]} Login`, // Window name
      'width=500,height=600,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!popupRef.current) {
      setError('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.');
      return;
    }

    setPending(provider);
    // Poll to check if popup is closed manually
    pollIntervalRef.current = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        console.log('Popup was closed manually');
        cleanupPolling();
      }
    }, 1000); // Check every second
  };

  const providerButton = (provider: Provider, icon: React.ReactNode) => {
    const isPending = pending === provider;
    return (
      <button
        type="button"
        onClick={() => signIn(provider)}
        disabled={pending !== null}
        aria-busy={isPending}
        className={`flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 text-[0.9375rem] font-medium text-foreground shadow-xs transition-colors duration-150 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
      >
        {isPending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
        {isPending ? `Waiting for ${PROVIDER_LABEL[provider]}…` : `Continue with ${PROVIDER_LABEL[provider]}`}
      </button>
    );
  };

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-zinc-50 lg:flex xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <Link
          to="/"
          className={`relative inline-flex w-fit items-center gap-3 rounded-md ${focusRing}`}
          aria-label="ResumeForge home"
        >
          <img src="/icon.png" alt="" width={36} height={36} className="size-9 rounded-lg" />
          <span className="text-lg font-semibold tracking-tight">ResumeForge</span>
        </Link>

        <div className="relative flex flex-col gap-12">
          <div className="max-w-md">
            <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight xl:text-[2.75rem]">
              Resumes that clear the filter.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-400">
              Build a clean, ATS-friendly resume and check it against a job description before you apply.
            </p>
          </div>
          <ResumeSheet />
        </div>

        <p className="relative text-sm text-zinc-500">&copy; {new Date().getFullYear()} ResumeForge</p>
      </aside>

      {/* Sign-in */}
      <main className="flex flex-col">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link
            to="/"
            className={`-ml-2 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground ${focusRing}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-[24rem] animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
            {/* Logo shown here on mobile, where the brand panel is hidden */}
            <img src="/icon.png" alt="ResumeForge" width={48} height={48} className="mb-8 size-12 rounded-xl lg:hidden" />

            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-[0.9375rem] text-muted-foreground">Sign in to your ResumeForge account.</p>

            <div className="mt-8 space-y-3">
              {providerButton('google', <FcGoogle className="size-5" aria-hidden="true" />)}
              {providerButton('github', <FaGithub className="size-5" aria-hidden="true" />)}
            </div>

            <div aria-live="polite" className="min-h-6">
              {error && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              No password needed. We only use your account to sign you in.
            </p>

            <p className="mt-10 border-t border-border pt-6 text-[0.8125rem] leading-6 text-muted-foreground">
              By signing in, you agree to our{' '}
              <Link
                to="/terms-of-service"
                className={`rounded-sm text-foreground underline underline-offset-4 hover:text-primary ${focusRing}`}
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to="/privacy-policy"
                className={`rounded-sm text-foreground underline underline-offset-4 hover:text-primary ${focusRing}`}
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
