// Shared button looks for dialogs. Hex utilities, not CSS variables: dialogs render in a portal outside .app-shell.
const ring =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c]';
const base =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent px-4 text-sm font-medium h-[46px] w-full sm:h-10 sm:w-auto transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

export const popupPrimaryClasses = `${base} ${ring} bg-[#111110] text-white hover:bg-[#2a2a28] dark:bg-[#f4f4f2] dark:text-[#111110] dark:hover:bg-white`;

export const popupGhostClasses = `${base} ${ring} border-[#cfcdc5] dark:border-white/25 bg-white dark:bg-transparent text-[#111110] dark:text-[#f4f4f2] hover:bg-[#f6f5f2] dark:hover:bg-[#151517]`;

export const popupDangerClasses = `${base} ${ring} bg-[#b3261e] text-white hover:bg-[#9a1f18] dark:bg-[#ff8a80] dark:text-[#1a0a09] dark:hover:bg-[#ff9d95]`;
