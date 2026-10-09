import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Floating logout button (bottom-left) that asks for confirmation before ending the session
const LogoutButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const clearClientSession = () => {
    // Only cookies readable from JS can be removed here; HttpOnly ones (session, CSRF) are cleared by the server
    Object.keys(Cookies.get()).forEach((name) => Cookies.remove(name));
    localStorage.clear();
    sessionStorage.clear();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await getCsrfToken();
      await client.post('/logout');
    } catch (error: any) {
      // 401/403 means the server session is already gone, so there is nothing left to end
      const status = error?.response?.status;
      if (status !== 401 && status !== 403) {
        console.error('Failed to logout: ', error);
        toast.error('Logout failed. Please try again.');
        setLoggingOut(false);
        return;
      }
    }
    clearClientSession();
    // Full page load so in-memory app state (stores) from this session is dropped too
    window.location.assign('/login');
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!loggingOut) setDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to log out? You will need to sign in again to access your resumes.
          </DialogDescription>
          <DialogFooter>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={loggingOut}
              className="dark:text-white"
            >
              Stay signed in
            </Button>
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {loggingOut ? 'Logging out...' : 'Log out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setDialogOpen(true)}
            aria-label="Log out"
            className="fixed bottom-6 left-6 z-40 w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white shadow-lg hover:shadow-xl hover:text-red-600 dark:hover:text-red-400 hover:scale-105 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Log out</TooltipContent>
      </Tooltip>
    </>
  );
};

export default LogoutButton;
