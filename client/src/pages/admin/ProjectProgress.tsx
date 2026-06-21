import { useState } from "react";
import { useLocation } from "wouter";
import CRMLayout from "@/components/CRMLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ReportViewer } from "@/components/ReportViewer";
import { FileText, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function ProjectProgress() {
  const [, navigate] = useLocation();
  const { data: projects, isLoading } = trpc.projects.weeklyActiveProjects.useQuery();
  const generateReport = trpc.projects.generateChecklistProgressReport.useMutation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const r = await generateReport.mutateAsync({});
      setReport({ ...r, subtitle: `${r.totalProjects} projects • ${r.totalActions} actions this week` });
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Progress</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Projects with checklist activity since last Wednesday
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !projects?.length}
            className="gap-2 bg-red-600 hover:bg-red-700"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate Weekly Report
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No checklist activity recorded this week.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Projects appear here once an extracted checklist item is completed or its progress changes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/progress/${p.id}`)}
                className="w-full text-left border border-border rounded-lg p-4 bg-card hover:shadow-md hover:border-red-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.completedCount} of {p.totalCount} items complete · {p.actionCount} action
                      {p.actionCount === 1 ? "" : "s"} this week
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={p.status} />
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-300"
                    style={{ width: `${p.completionPercentage}%` }}
                  />
                </div>
                <p className="text-xs font-medium text-foreground mt-2">{p.completionPercentage}% complete</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {report && (
        <ReportViewer
          isOpen={!!report}
          onClose={() => setReport(null)}
          pdfBase64={report.pdfBase64}
          fileName={report.fileName}
          subtitle={report.subtitle}
        />
      )}
    </CRMLayout>
  );
}
