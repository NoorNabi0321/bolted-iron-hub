import CRMLayout from "@/components/CRMLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatDate, PROJECT_STATUSES } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Building2,
  CheckCircle2,
  Clock,
  FolderOpen,
  HardHat,
  MapPin,
} from "lucide-react";
import { useLocation } from "wouter";

export default function SubDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: projects = [], isLoading } = trpc.projects.myProjects.useQuery();
  const { data: sub } = trpc.subcontractors.me.useQuery();

  const activeProjects = projects.filter((p) => !p.isArchived);
  const completedProjects = projects.filter((p) => p.status === "Inspection Passed");
  const inProgressProjects = projects.filter(
    (p) => p.status === "Fabrication" || p.status === "On-Site"
  );

  return (
    <CRMLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Welcome header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl p-5 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <HardHat className="w-6 h-6 sm:w-7 sm:h-7" />
            <h1 className="text-xl sm:text-2xl font-bold">
              Welcome, {user?.name?.split(" ")[0]}
            </h1>
          </div>
          <p className="text-red-100 text-sm sm:text-base">
            {sub?.companyName ?? "Your subcontractor portal"} · {activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Active Jobs", value: activeProjects.length, icon: FolderOpen, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
            { label: "In Progress", value: inProgressProjects.length, icon: Clock, iconBg: "bg-orange-50", iconColor: "text-orange-600" },
            { label: "Completed", value: completedProjects.length, icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border">
              <CardContent className="p-3 sm:p-5">
                <div className={`inline-flex p-2 rounded-lg ${stat.iconBg} mb-2 sm:mb-3`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.iconColor}`} />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects list */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Your Assigned Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-secondary/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : activeProjects.length === 0 ? (
              <div className="text-center py-10">
                <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground">No projects assigned yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Contact your project manager for access
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setLocation(`/projects/${project.id}`)}
                    className="p-3 sm:p-4 rounded-lg border border-border hover:border-red-200 hover:bg-secondary/30 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="font-medium text-foreground group-hover:text-red-600 transition-colors text-sm sm:text-base">
                        {project.name}
                      </p>
                      <StatusBadge status={project.status} className="flex-shrink-0 text-xs" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {project.address && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {project.borough ?? project.address}
                        </span>
                      )}
                      {project.estimatedEndDate && (
                        <span className="text-xs text-muted-foreground">
                          Est. end: {formatDate(project.estimatedEndDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status guide */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Project Status Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              {PROJECT_STATUSES.map((status, i) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  {i < PROJECT_STATUSES.length - 1 && (
                    <span className="text-muted-foreground/40 text-xs">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  );
}
