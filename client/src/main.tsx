import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for unhandled promise rejections (CORS errors, etc.)
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  
  // Specifically handle fetch errors that we already manage in the UI
  if (error && error.message && error.message.includes('Failed to fetch')) {
    console.warn('Caught unhandled fetch rejection (handled in UI):', error.message);
    event.preventDefault(); // Prevent the error overlay from showing
    return;
  }
  
  // Let other unhandled rejections through (they might be important)
  console.error('Unhandled promise rejection:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
