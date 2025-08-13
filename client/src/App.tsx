import { BrowserRouter as Router } from "react-router-dom"
import RouteComponent from "./routes"
import { ThemeProvider } from "./contexts/ThemeContext"
import { Toaster } from "sonner";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Toaster position="top-right" duration={2000} />
        <RouteComponent />
      </Router>
    </ThemeProvider>
  )
}

export default App
