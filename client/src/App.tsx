import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Route components are code-split: each page loads as its own chunk on demand,
// so the first visit no longer downloads the entire app up front.
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProjects = lazy(() => import("./pages/admin/Projects"));
const AdminProjectDetail = lazy(() => import("./pages/admin/ProjectDetail"));
const AdminSubcontractors = lazy(() => import("./pages/admin/Subcontractors"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminPermissions = lazy(() => import("./pages/admin/Permissions"));
const AdminApprovals = lazy(() => import("./pages/admin/Approvals"));
const AdminBulkImport = lazy(() => import("./pages/admin/BulkImport"));
const ProjectProgress = lazy(() => import("./pages/admin/ProjectProgress"));
const ProjectProgressDetail = lazy(() => import("./pages/admin/ProjectProgressDetail"));
const SubDashboard = lazy(() => import("./pages/sub/Dashboard"));
const SubProjectDetail = lazy(() => import("./pages/sub/ProjectDetail"));
const LoginPage = lazy(() => import("./pages/Login"));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );
}

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
    return (
      <Suspense fallback={<PageFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  if (user.role === "admin") {
    return (
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    );
  }

  // Subcontractor routes
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={SubDashboard} />
        <Route path="/projects/:id" component={SubProjectDetail} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
