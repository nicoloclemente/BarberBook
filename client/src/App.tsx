import React, { useState, useEffect, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ClientsPage from "@/pages/clients-page";
import ServicesPage from "@/pages/services-page";
import ChatPage from "@/pages/chat-page";
import StatisticsPage from "@/pages/statistics-page";
import ProfilePage from "@/pages/profile-page";
import SettingsPage from "@/pages/settings-page";
import BarberDetailPage from "@/pages/barber-detail-page";
import BarbersListPage from "@/pages/barbers-list-page";
import DailyPage from "@/pages/daily-page";
import SchedulePage from "@/pages/schedule-page";
import EmployeeManagementPage from "@/pages/employee-management-page";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminNotificationsPage from "@/pages/admin-notifications";
import AdminStatisticsPage from "@/pages/admin-statistics";
import AdminEmployeesPage from "@/pages/admin-employees-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

// Componente di fallback per il caricamento
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Global Error Boundary
class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Errore globale nell'applicazione:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <h2 className="text-2xl font-bold mb-3">Si è verificato un errore</h2>
          <p className="text-muted-foreground mb-5 max-w-md">
            Siamo spiacenti, qualcosa è andato storto nel caricamento dell'applicazione.
          </p>
          <button
            className="px-5 py-2 bg-primary text-white rounded-md hover:bg-primary/90 mb-3"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Ricarica l'applicazione
          </button>
          {this.state.error && (
            <div className="mt-4 p-4 bg-gray-100 rounded-md text-left overflow-auto max-w-xl">
              <p className="font-mono text-xs">{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Route transition handler
function RouteChangeHandler({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    // Quando la location cambia, impostiamo isTransitioning a true
    setIsTransitioning(true);
    
    // Puliamo la cache TanStack per evitare interferenze tra pagine
    queryClient.removeQueries();
    
    // Dopo un piccolo ritardo, impostiamo isTransitioning a false
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location]);
  
  if (isTransitioning) {
    return <LoadingFallback />;
  }
  
  return <>{children}</>;
}

function Router() {
  return (
    <RouteChangeHandler>
      <Switch>
        <Route path="/auth" component={AuthPage as React.ComponentType<any>} />
        <ProtectedRoute path="/" component={DashboardPage as React.ComponentType<any>} />
        <ProtectedRoute path="/dashboard" component={DashboardPage as React.ComponentType<any>} />
        <ProtectedRoute path="/daily" component={DailyPage as React.ComponentType<any>} />
        <ProtectedRoute path="/clients" component={ClientsPage as React.ComponentType<any>} />
        <ProtectedRoute path="/services" component={ServicesPage as React.ComponentType<any>} />
        <ProtectedRoute path="/chat" component={ChatPage as React.ComponentType<any>} />
        <ProtectedRoute path="/chat/:userId" component={ChatPage as React.ComponentType<any>} />
        <ProtectedRoute path="/statistics" component={StatisticsPage as React.ComponentType<any>} />
        <ProtectedRoute path="/profile" component={ProfilePage as React.ComponentType<any>} />
        <ProtectedRoute path="/settings" component={SettingsPage as React.ComponentType<any>} />
        <ProtectedRoute path="/schedule" component={SchedulePage as React.ComponentType<any>} />
        <ProtectedRoute path="/employees" component={EmployeeManagementPage as React.ComponentType<any>} />
        <Route path="/barbers" component={BarbersListPage as React.ComponentType<any>} />
        <Route path="/barbers/:id" component={BarberDetailPage as React.ComponentType<any>} />
        <ProtectedRoute path="/admin" component={AdminDashboard as React.ComponentType<any>} />
        <ProtectedRoute path="/admin/notifications" component={AdminNotificationsPage as React.ComponentType<any>} />
        <ProtectedRoute path="/admin/statistics" component={AdminStatisticsPage as React.ComponentType<any>} />
        <ProtectedRoute path="/admin/employees" component={AdminEmployeesPage as React.ComponentType<any>} />
        <Route component={NotFound as React.ComponentType<any>} />
      </Switch>
    </RouteChangeHandler>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Router />
          </Suspense>
          <Toaster />
        </AuthProvider>
      </GlobalErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
