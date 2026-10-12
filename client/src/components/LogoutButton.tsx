import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import LogoutDialog from '@/components/LogoutDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Floating logout button (bottom-left) that asks for confirmation before ending the session
const LogoutButton: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <LogoutDialog open={dialogOpen} onOpenChange={setDialogOpen} />

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
