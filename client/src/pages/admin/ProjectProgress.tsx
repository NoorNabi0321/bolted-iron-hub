import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import CRMLayout from "@/components/CRMLayout";
import { FileText, Loader2 } from "lucide-react";
import { WeeklyReportViewer } from "@/components/WeeklyReportViewer";
import { toast } from "sonner";

interface ProjectProgressContentProps {
  onPDFGenerated: (data: any) => void;
}

function ProjectProgressContent({ onPDFGenerated }: ProjectProgressContentProps) {
  const [activeTab, setActiveTab] = useState<"with-checklist" | "without-checklist">("with-checklist");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReportMutation = trpc.projects.generateWeeklyReportPDFOnDemand.useMutation();

  // Fetch projects with checklists
  const { data: projectsWithChecklists, isLoading: loadingWithChecklists } =
    trpc.projects.progressWithChecklists.useQuery();

  // Fetch projects without checklists
  const { data: projectsWithoutChecklists, isLoading: loadingWithoutChecklists } =
    trpc.projects.progressWithoutChecklists.useQuery();

  const isLoading = loadingWithChecklists || loadingWithoutChecklists;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track project completion based on checklist items
          </p>
        </div>
        <Button
          onClick={async () => {
            setIsGenerating(true);
            try {
              const result = await generateReportMutation.mutateAsync();
              onPDFGenerated(result);
            } catch (error) {
              console.error("Failed to generate report:", error);
              toast.error("Failed to generate report");
            } finally {
              setIsGenerating(false);
            }
          }}
          disabled={isGenerating}
          className="gap-2 bg-red-600 hover:bg-red-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Weekly Reports
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="with-checklist">
            With Checklist ({projectsWithChecklists?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="without-checklist">
            Without Checklist ({projectsWithoutChecklists?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Projects with Checklists */}
        <TabsContent value="with-checklist" className="space-y-4">
          {loadingWithChecklists ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : projectsWithChecklists && projectsWithChecklists.length > 0 ? (
            <div className="space-y-3">
              {projectsWithChecklists.map((project) => (
                <div
                  key={project.id}
                  className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {project.completedCount} of {project.totalCount} items completed
                      </p>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-full transition-all duration-300 ease-out"
                      style={{ width: `${project.progressPercentage}%` }}
                    />
                  </div>

                  {/* Progress Percentage */}
                  <p className="text-xs font-medium text-foreground mt-2">
                    {project.progressPercentage}% Complete
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects with checklists yet</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Projects without Checklists */}
        <TabsContent value="without-checklist" className="space-y-4">
          {loadingWithoutChecklists ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : projectsWithoutChecklists && projectsWithoutChecklists.length > 0 ? (
            <div className="space-y-3">
              {projectsWithoutChecklists.map((project) => (
                <div
                  key={project.id}
                  className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">No checklist items</p>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">All projects have checklists</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProjectProgress() {
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [pdfData, setPdfData] = useState<any>(null);

  const handlePDFGenerated = (data: any) => {
    if (data && data.pdfBase64) {
      setPdfData(data);
      setIsPDFOpen(true);
      toast.success("Report generated successfully!");
    }
  };

  return (
    <CRMLayout>
      <ProjectProgressContent onPDFGenerated={handlePDFGenerated} />
      {pdfData && (
        <WeeklyReportViewer
          isOpen={isPDFOpen}
          onClose={() => setIsPDFOpen(false)}
          pdfBase64={pdfData.pdfBase64}
          fileName={pdfData.fileName}
          totalProjects={pdfData.totalProjects}
          totalCompleted={pdfData.totalCompleted}
          totalItems={pdfData.totalItems}
        />
      )}
    </CRMLayout>
  );
}
