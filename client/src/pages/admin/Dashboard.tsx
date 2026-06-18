import React from "react";
import CRMLayout from "@/components/CRMLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatDate, PROJECT_STATUSES } from "@/lib/utils";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FolderOpen,
  Plus,
  TrendingUp,
} from "lucide-react";
import DailySchedule from "@/components/DailySchedule";
import { useLocation } from "wouter";
import { useNavigation } from "@/contexts/NavigationContext";
import { ProjectListDialog } from "@/components/ProjectListDialog";
import { SubcontractorListDialog } from "@/components/SubcontractorListDialog";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { setReferrerSource } = useNavigation();
  const [pendingNavigation, setPendingNavigation] = React.useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogTitle, setDialogTitle] = React.useState("");
  const [dialogProjects, setDialogProjects] = React.useState<any[]>([]);
  const [subcontractorDialogOpen, setSubcontractorDialogOpen] = React.useState(false);

  React.useEffect(() => {
    if (pendingNavigation) {
      sessionStorage.setItem('projectReferrer', 'dashboard');
      setLocation(`/projects/${pendingNavigation}`);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, setLocation]);

  const handleProjectClick = (projectId: number) => {
    setPendingNavigation(projectId);
  };
  
  // Fetch active projects for main display
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery({ isArchived: false });
  
  // Fetch all projects (including archived and Inspection Passed) for pipeline counts
  const { data: allProjects = [] } = trpc.projects.list.useQuery({ isArchived: undefined, includeInspectionPassed: true });
  
  const { data: subs = [] } = trpc.subcontractors.list.useQuery();

  // Use allProjects for status counts to include archived projects (especially Inspection Passed)
  const statusCounts = PROJECT_STATUSES.reduce(
    (acc, s) => {
      acc[s] = allProjects.filter((p) => p.status === s).length;
      return acc;
    },
    {} as Record<string, number>
  );

  // activeProjects is already filtered by isArchived: false from the first query
  const activeProjects = projects;
  const recentProjects = [...activeProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const stats = [
    {
      label: "Active Projects",
      value: activeProjects.length,
      icon: FolderOpen,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Subcontractors",
      value: subs.length,
      icon: Building2,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      label: "In Progress",
      value: (statusCounts["Fabrication"] ?? 0) + (statusCounts["On-Site"] ?? 0) + (statusCounts["Installed"] ?? 0),
      icon: Clock,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      label: "Completed",
      value: statusCounts["Inspection Passed"] ?? 0,
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
  ];

  return (
    <CRMLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Page Title - Mobile */}
        <div className="sm:hidden">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl p-5 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Welcome back!</h1>
              <p className="text-red-100 text-sm sm:text-base">
                Manage your structural steel projects and subcontractors
              </p>
            </div>
            <Button
              onClick={() => setLocation("/projects")}
              className="bg-white text-red-600 hover:bg-red-50 font-semibold w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Weekly Schedule - MOVED TO TOP */}
        <DailySchedule projects={projects} subcontractors={subs} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isClickable = true; // All cards are now clickable
            
            const handleCardClick = () => {
              if (stat.label === "Subcontractors") {
                setSubcontractorDialogOpen(true);
                return;
              }
              
              if (stat.label === "Active Projects") {
                setDialogTitle("Active Projects");
                setDialogProjects(activeProjects);
              } else if (stat.label === "In Progress") {
                const inProgress = allProjects.filter((p) => 
                  ["Fabrication", "On-Site", "Installed"].includes(p.status)
                );
                setDialogTitle("In Progress Projects");
                setDialogProjects(inProgress);
              } else if (stat.label === "Completed") {
                const completed = allProjects.filter((p) => p.status === "Inspection Passed");
                setDialogTitle("Completed Projects");
                setDialogProjects(completed);
              }
              setDialogOpen(true);
            };
            
            return (
              <Card 
                key={stat.label}
                className={`border-border ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                onClick={handleCardClick}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`${stat.iconBg} p-2 sm:p-3 rounded-lg`}>
                      <Icon className={`${stat.iconColor} w-5 h-5 sm:w-6 sm:h-6`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Project Pipeline */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-5 h-5 text-red-500" />
              Project Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {PROJECT_STATUSES.map((status) => {
                const count = statusCounts[status] ?? 0;
                // Calculate percentage based on total projects (allProjects) not just active projects
                const totalProjects = allProjects.length;
                const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
                
                const handleStatusClick = () => {
                  const statusProjects = allProjects.filter((p) => p.status === status);
                  setDialogTitle(`${status} Projects`);
                  setDialogProjects(statusProjects);
                  setDialogOpen(true);
                };
                
                return (
                  <div 
                    key={status} 
                    className="text-center p-3 rounded-lg bg-secondary/50 hover:shadow-md hover:border-red-300 cursor-pointer transition-all border border-transparent"
                    onClick={handleStatusClick}
                  >
                    <div className="text-xl sm:text-2xl font-bold text-foreground mb-2">{count}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                      <div
                        className="bg-red-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <StatusBadge status={status} className="text-xs justify-center" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Projects */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Recent Activity
              </CardTitle>
              <button
                onClick={() => setLocation("/projects")}
                className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                View all →
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recent projects</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{project.address}</p>
                    </div>
                    <StatusBadge status={project.status} className="ml-2 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ProjectListDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        projects={dialogProjects}
        onProjectClick={handleProjectClick}
      />

      <SubcontractorListDialog
        open={subcontractorDialogOpen}
        onOpenChange={setSubcontractorDialogOpen}
        subcontractors={subs}
      />
     </CRMLayout>
  );
}
