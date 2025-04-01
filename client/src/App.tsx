import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

function Router() {
  return (
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
