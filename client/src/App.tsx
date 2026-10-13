import { BrowserRouter as Router } from "react-router-dom"
import RouteComponent from "./routes"
import { ThemeProvider } from "./contexts/ThemeContext"
import { Toaster } from "sonner";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster
          position="top-right"
          duration={2000}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: 'flex w-[356px] max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-xl px-4 py-3.5 text-sm shadow-[0_12px_28px_-8px_rgba(0,0,0,0.4)]',
              default: 'bg-[#111110] text-[#f4f4f2] dark:bg-[#f4f4f2] dark:text-[#111110]',
              success: 'bg-[#111110] text-[#f4f4f2] dark:bg-[#f4f4f2] dark:text-[#111110]',
              info: 'bg-[#111110] text-[#f4f4f2] dark:bg-[#f4f4f2] dark:text-[#111110]',
              warning: 'bg-[#111110] text-[#f4f4f2] dark:bg-[#f4f4f2] dark:text-[#111110]',
              loading: 'bg-[#111110] text-[#f4f4f2] dark:bg-[#f4f4f2] dark:text-[#111110]',
              error: 'bg-[#b3261e] text-white dark:bg-[#ff8a80] dark:text-[#1a0a09]',
              icon: 'relative flex size-4 shrink-0 items-center justify-center',
              title: 'font-medium',
              description: 'text-[13px] opacity-80',
            },
          }}
        />
        <RouteComponent />
      </Router>
    </ThemeProvider>
  )
}

export default App
