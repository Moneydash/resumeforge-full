import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import { useMaintenanceStore } from '@/maintenance/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogEyebrow, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { popupDangerClasses, popupGhostClasses } from '@/styles/popup-classes';

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Confirmation dialog that ends the session; opened from the sidebar
const LogoutDialog: React.FC<LogoutDialogProps> = ({ open, onOpenChange }) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const clearClientSession = () => {
    // Only cookies readable from JS can be removed here; HttpOnly ones (session, CSRF) are cleared by the server
    Object.keys(Cookies.get()).forEach((name) => Cookies.remove(name));
    useMaintenanceStore.getState().resetAdmin();
    localStorage.clear();
    sessionStorage.clear();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await getCsrfToken();
      await client.post('/logout');
    } catch (error: unknown) {
      // 401/403 means the server session is already gone, so there is nothing left to end
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status;
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
    <Dialog open={open} onOpenChange={(next) => { if (!loggingOut) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>Account</DialogEyebrow>
          <DialogTitle>Log out?</DialogTitle>
          <DialogDescription>
            Are you sure you want to log out? You will need to sign in again to access your resumes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={loggingOut}
            className={popupGhostClasses}
          >
            Stay signed in
          </Button>
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            className={popupDangerClasses}
          >
            {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutDialog;
