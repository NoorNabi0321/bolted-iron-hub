import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { useAuth } from "./_core/hooks/useAuth";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProjects from "./pages/admin/Projects";
import AdminProjectDetail from "./pages/admin/ProjectDetail";
import AdminSubcontractors from "./pages/admin/Subcontractors";
import AdminUsers from "./pages/admin/Users";
import AdminPermissions from "./pages/admin/Permissions";
import AdminApprovals from "./pages/admin/Approvals";
import AdminBulkImport from "./pages/admin/BulkImport";
import ProjectProgress from "./pages/admin/ProjectProgress";
import ProjectProgressDetail from "./pages/admin/ProjectProgressDetail";
import SubDashboard from "./pages/sub/Dashboard";
import SubProjectDetail from "./pages/sub/ProjectDetail";
import LoginPage from "./pages/Login";
import { Loader2 } from "lucide-react";


function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading Bolted Iron Hub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === "admin") {
    return (
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/projects" component={AdminProjects} />
        <Route path="/projects/:id" component={AdminProjectDetail} />
        <Route path="/subcontractors" component={AdminSubcontractors} />
        <Route path="/users" component={AdminUsers} />
        <Route path="/permissions" component={AdminPermissions} />
        <Route path="/approvals" component={AdminApprovals} />
        <Route path="/bulk-import" component={AdminBulkImport} />
        <Route path="/progress" component={ProjectProgress} />
        <Route path="/progress/:id" component={ProjectProgressDetail} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Subcontractor routes
  return (
    <Switch>
      <Route path="/" component={SubDashboard} />
      <Route path="/projects/:id" component={SubProjectDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <NavigationProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster theme="light" />
            <AppRouter />
          </TooltipProvider>
        </ThemeProvider>
      </NavigationProvider>
    </ErrorBoundary>
  );
}

export default App;
