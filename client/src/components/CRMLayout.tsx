import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  FileSpreadsheet,
  FolderOpen,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigation } from "@/contexts/NavigationContext";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { ArrowLeft } from "lucide-react";

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: FolderOpen, label: "Projects", path: "/projects" },
  { icon: TrendingUp, label: "Progress", path: "/progress" },
  { icon: Building2, label: "Subcontractors", path: "/subcontractors" },
  { icon: Users, label: "Users", path: "/users" },
  { icon: Shield, label: "Permissions", path: "/permissions" },
  { icon: UserCheck, label: "Approvals", path: "/approvals" },
  { icon: FileSpreadsheet, label: "Bulk Import", path: "/bulk-import" },
];

const subMenuItems = [
  { icon: LayoutDashboard, label: "My Projects", path: "/" },
];

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { canGoBack, goBack } = useNavigation();
  const mainRef = useRef<HTMLElement>(null);

  // Restore scroll position per route on the real scroll container (<main> below).
  useScrollRestoration(mainRef);

  const isAdmin = user?.role === "admin";
  const menuItems = isAdmin ? adminMenuItems : subMenuItems;

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);

  const handleNavClick = (path: string) => {
    setLocation(path);
    setMobileSidebarOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Branding */}
      <div className="p-6 border-b border-border flex items-center gap-3">
        <img src="/logo.png" alt="Bolted Iron" className="h-10 w-auto" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Bolted Iron</h1>
          <p className="text-xs text-muted-foreground">Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-foreground/80 hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-red-600 text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-border flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="h-9 w-9"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden h-9 w-9"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
              {menuItems.find((item) => item.path === location)?.label || "Bolted Iron Hub"}
            </h2>
          </div>

          {/* Mobile user avatar */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarFallback className="bg-red-600 text-white text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <span className="text-sm">{user?.name}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main ref={mainRef} className="flex-1 overflow-auto bg-secondary/30">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
