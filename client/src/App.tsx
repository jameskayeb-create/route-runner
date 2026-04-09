import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import AdminPage from "@/pages/admin";
import { useEffect } from "react";

function AppContent() {
  const { user } = useAuth();

  // Default to dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (!user) return <AuthPage />;
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/admin" component={AdminPage} />
        <Route path="/" component={Dashboard} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
