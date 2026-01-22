import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Library from "@/pages/library";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/library" component={Library} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Listen for auth success from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'replit_auth_success') {
        // Auth succeeded in another tab, invalidate user query to refetch
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Clear the flag
        localStorage.removeItem('replit_auth_success');
      }
    };

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for same-tab events (dispatched manually)
    const handleCustomStorage = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === 'replit_auth_success') {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        localStorage.removeItem('replit_auth_success');
      }
    };
    window.addEventListener('replit-auth-success', handleCustomStorage as EventListener);

    // Check if we just came back from auth (same tab)
    if (localStorage.getItem('replit_auth_success')) {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      localStorage.removeItem('replit_auth_success');
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('replit-auth-success', handleCustomStorage as EventListener);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
